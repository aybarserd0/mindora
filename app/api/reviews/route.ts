import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyRateLimit } from "@/lib/security/rate-limit";
import {
  cleanMultilineText,
  cleanUuid,
  isSafeRating,
} from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type BookingRow = {
  id: string;
  expert_id: string | null;
  client_id: string | null;
  conversation_id: string | null;
  live_session_id: string | null;
  status: string | null;
  scheduled_end_at: string | null;
};

type PaymentRow = {
  id: string;
  status: string | null;
};

type ExistingReviewRow = {
  id: string;
};

type SupabaseAdminClient = ReturnType<typeof createClient<any>>;

const REVIEW_TEXT_MAX_LENGTH = 2000;
const MAX_REQUEST_BYTES = 10_000;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getSupabaseAdmin(): SupabaseAdminClient | null {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient<any>(supabaseUrl, serviceRoleKey, {
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
  return ["paid", "success", "successful", "completed", "approved"].includes(
    normalizeStatus(value)
  );
}

function isPastSessionEnd(value: string | null) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() <= Date.now();
}

function isSuspiciousReviewText(value: string) {
  if (!value) return false;

  const linkCount = (value.match(/https?:\/\//gi) || []).length;
  const repeatedChars = /(.)\1{12,}/.test(value);
  const tooManyMentions = (value.match(/@/g) || []).length > 5;

  return linkCount > 2 || repeatedChars || tooManyMentions;
}

function validateBookingForReview(booking: BookingRow | null) {
  if (!booking) {
    return "Randevu bulunamadı.";
  }

  if (!booking.expert_id || !booking.client_id) {
    return "Randevu uzman veya danışan bilgisi eksik.";
  }

  const completedByStatus = isCompletedBookingStatus(booking.status);
  const completedByTime = isPastSessionEnd(booking.scheduled_end_at);

  if (!completedByStatus && !completedByTime) {
    return "Yorum bırakmak için seans tamamlanmış olmalıdır.";
  }

  return null;
}

async function hasExistingReview({
  supabase,
  bookingId,
  clientId,
}: {
  supabase: SupabaseAdminClient;
  bookingId: string;
  clientId: string;
}) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("client_id", clientId)
    .maybeSingle<ExistingReviewRow>();

  if (error) {
    console.error("REVIEWS_EXISTING_QUERY_ERROR", error);
    throw new Error("EXISTING_REVIEW_QUERY_FAILED");
  }

  return Boolean(data && data.id);
}

async function hasPaidPaymentForBooking({
  supabase,
  booking,
}: {
  supabase: SupabaseAdminClient;
  booking: BookingRow;
}) {
  const paymentQuery = supabase
    .from("payments")
    .select("id, status")
    .eq("conversation_id", booking.conversation_id)
    .limit(5);

  if (!booking.conversation_id) return false;

  const { data, error } = await paymentQuery;

  if (error) {
    console.error("REVIEWS_PAYMENT_QUERY_ERROR", {
      bookingId: booking.id,
      conversationId: booking.conversation_id,
      error,
    });
    throw new Error("PAYMENT_QUERY_FAILED");
  }

  const payments = (data || []) as PaymentRow[];
  return payments.some((payment) => isPaidStatus(payment.status));
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
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonError("İstek boyutu çok büyük.", 413);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Geçerli istek gövdesi gerekli.");
    }

    const bookingId = cleanUuid((body as { bookingId?: unknown }).bookingId);
    const rating = Number((body as { rating?: unknown }).rating);
    const reviewText = cleanMultilineText(
      (body as { reviewText?: unknown }).reviewText,
      REVIEW_TEXT_MAX_LENGTH
    );

    if (!bookingId) {
      return jsonError("Geçerli bookingId gerekli.");
    }

    if (!isSafeRating(rating)) {
      return jsonError("Puan 1 ile 5 arasında olmalıdır.");
    }

    if (reviewText && reviewText.length < 3) {
      return jsonError("Yorum metni çok kısa.");
    }

    if (isSuspiciousReviewText(reviewText)) {
      return jsonError("Yorum metni güvenlik kontrolünden geçemedi.");
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from("session_bookings")
      .select(
        `
        id,
        expert_id,
        client_id,
        conversation_id,
        live_session_id,
        status,
        scheduled_end_at
      `
      )
      .eq("id", bookingId)
      .maybeSingle<BookingRow>();

    if (bookingError) {
      console.error("REVIEWS_BOOKING_QUERY_ERROR", bookingError);
      return jsonError("Randevu bilgisi alınamadı.", 500);
    }

    const booking = bookingData as BookingRow | null;
    const bookingValidationError = validateBookingForReview(booking);

    if (bookingValidationError) {
      const status = bookingValidationError === "Randevu bulunamadı." ? 404 : 403;
      return jsonError(bookingValidationError, status);
    }

    const safeBooking = booking as BookingRow;

    const paid = await hasPaidPaymentForBooking({
      supabase,
      booking: safeBooking,
    });

    if (!paid) {
      return jsonError("Yorum bırakmak için ödeme tamamlanmış olmalıdır.", 403);
    }

    const exists = await hasExistingReview({
      supabase,
      bookingId: safeBooking.id,
      clientId: safeBooking.client_id as string,
    });

    if (exists) {
      return jsonError("Bu seans için zaten yorum bırakılmış.", 409);
    }

    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        booking_id: safeBooking.id,
        session_id: safeBooking.live_session_id ?? null,
        conversation_id: safeBooking.conversation_id ?? null,
        expert_id: safeBooking.expert_id,
        client_id: safeBooking.client_id,
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
        return jsonError("Bu seans için zaten yorum bırakılmış.", 409);
      }

      console.error("REVIEWS_INSERT_ERROR", insertError);
      return jsonError(insertError.message || "Yorum kaydedilemedi.", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Yorumunuz moderasyon onayına gönderildi.",
      review,
    });
  } catch (error) {
    console.error("POST /api/reviews error:", error);

    const message =
      error instanceof Error && error.message === "PAYMENT_QUERY_FAILED"
        ? "Ödeme kontrolü yapılamadı."
        : error instanceof Error && error.message === "EXISTING_REVIEW_QUERY_FAILED"
          ? "Yorum kontrolü yapılamadı."
          : "Beklenmeyen bir hata oluştu.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
