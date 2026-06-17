import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { cleanMultilineText, cleanUuid, isSafeRating } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type BookingRow = {
  id: string;
  expert_id: string | null;
  client_id: string | null;
  conversation_id: string | null;
  session_id: string | null;
  status: string | null;
  payment_status: string | null;
};

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isCompletedBookingStatus(value: unknown) {
  return ["completed", "done", "finished"].includes(normalizeStatus(value));
}

function isPaidStatus(value: unknown) {
  return normalizeStatus(value) === "paid";
}

function isSuspiciousReviewText(value: string) {
  if (!value) return false;

  const linkCount = (value.match(/https?:\/\//gi) || []).length;
  const repeatedChars = /(.)\1{12,}/.test(value);
  const tooManyMentions = (value.match(/@/g) || []).length > 5;

  return linkCount > 2 || repeatedChars || tooManyMentions;
}

export async function POST(req: Request) {
  try {
    const limited = applyRateLimit(req, {
      scope: "reviews-post",
      limit: 10,
      windowMs: 60_000,
    });

    if (limited) return limited;

    if (!supabaseUrl || !serviceRoleKey) {
      return badRequest("Sunucu Supabase ayarları eksik.", 500);
    }

    const contentLength = Number(req.headers.get("content-length") || 0);

    if (contentLength > 10_000) {
      return badRequest("İstek boyutu çok büyük.", 413);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return badRequest("Sunucu Supabase ayarları eksik.", 500);
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return badRequest("Geçerli istek gövdesi gerekli.");
    }

    const bookingId = cleanUuid((body as { bookingId?: unknown }).bookingId);
    const ratingRaw = (body as { rating?: unknown }).rating;
    const rating = Number(ratingRaw);
    const reviewText = cleanMultilineText((body as { reviewText?: unknown }).reviewText, 2000);

    if (!bookingId) {
      return badRequest("Geçerli bookingId gerekli.");
    }

    if (!isSafeRating(rating)) {
      return badRequest("Puan 1 ile 5 arasında olmalıdır.");
    }

    if (reviewText && reviewText.length < 3) {
      return badRequest("Yorum metni çok kısa.");
    }

    if (isSuspiciousReviewText(reviewText)) {
      return badRequest("Yorum metni güvenlik kontrolünden geçemedi.", 400);
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from("session_bookings")
      .select(
        `
        id,
        expert_id,
        client_id,
        conversation_id,
        session_id,
        status,
        payment_status
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      return badRequest("Randevu bilgisi alınamadı.", 500);
    }

    const booking = bookingData as BookingRow | null;

    if (!booking) {
      return badRequest("Randevu bulunamadı.", 404);
    }

    if (!booking.expert_id || !booking.client_id) {
      return badRequest("Randevu uzman veya danışan bilgisi eksik.", 400);
    }

    if (!isCompletedBookingStatus(booking.status)) {
      return badRequest("Yorum bırakmak için seans tamamlanmış olmalıdır.", 403);
    }

    if (!isPaidStatus(booking.payment_status)) {
      return badRequest("Yorum bırakmak için ödeme tamamlanmış olmalıdır.", 403);
    }

    const { data: existingReview, error: existingError } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("client_id", booking.client_id)
      .maybeSingle();

    if (existingError) {
      return badRequest("Yorum kontrolü yapılamadı.", 500);
    }

    if (existingReview) {
      return badRequest("Bu seans için zaten yorum bırakılmış.", 409);
    }

    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        booking_id: booking.id,
        session_id: booking.session_id ?? null,
        conversation_id: booking.conversation_id ?? null,
        expert_id: booking.expert_id,
        client_id: booking.client_id,
        rating,
        review_text: reviewText || null,
        is_public: true,
        is_approved: false,
        status: "pending",
      })
      .select("id, rating, review_text, status, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return badRequest("Bu seans için zaten yorum bırakılmış.", 409);
      }

      return badRequest(insertError.message || "Yorum kaydedilemedi.", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Yorumunuz moderasyon onayına gönderildi.",
      review,
    });
  } catch (error) {
    console.error("POST /api/reviews error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
