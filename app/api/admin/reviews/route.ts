import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enforceAdminRequest } from "@/lib/security/admin-auth";
import { cleanUuid } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ReviewAction = "approve" | "reject" | "hide" | "restore_public";

type ReviewRow = {
  id: string;
  expert_id: string;
  client_id: string;
  booking_id: string | null;
  session_id: string | null;
  conversation_id: string | null;
  rating: number;
  review_text: string | null;
  is_public: boolean;
  is_approved: boolean;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type ExpertRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  title?: string | null;
  slug?: string | null;
};

type ReviewStatsRow = {
  id: string;
  status: string;
  rating: number;
  is_public: boolean;
  is_approved: boolean;
};

function jsonError(message: string, status = 400) {
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

function cleanValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getSafeLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) return 100;
  if (parsed < 1) return 100;
  if (parsed > 300) return 300;

  return parsed;
}

function normalizeStatus(value: string | null) {
  const status = cleanValue(value).toLowerCase();

  if (["pending", "approved", "rejected", "hidden"].includes(status)) {
    return status;
  }

  return "";
}

function normalizeAction(value: unknown): ReviewAction | "" {
  const action = cleanValue(value).toLowerCase();

  if (
    action === "approve" ||
    action === "reject" ||
    action === "hide" ||
    action === "restore_public"
  ) {
    return action;
  }

  return "";
}

function anonymizeClientId(clientId: string) {
  if (!clientId) return "Danışan";
  return `Danışan ${clientId.slice(0, 4).toUpperCase()}`;
}

function getExpertName(experts: ExpertRow[], expertId: string) {
  const expert = experts.find((item) => item.id === expertId);
  return expert?.name || expert?.full_name || "Mindora Uzmanı";
}

function getExpertTitle(experts: ExpertRow[], expertId: string) {
  const expert = experts.find((item) => item.id === expertId);
  return expert?.title || "Uzman";
}

function getExpertSlug(experts: ExpertRow[], expertId: string) {
  const expert = experts.find((item) => item.id === expertId);
  return expert?.slug || null;
}

function buildActionPatch(action: ReviewAction) {
  if (action === "approve" || action === "restore_public") {
    return {
      status: "approved",
      is_approved: true,
      is_public: true,
    };
  }

  if (action === "reject") {
    return {
      status: "rejected",
      is_approved: false,
      is_public: false,
    };
  }

  return {
    status: "hidden",
    is_approved: false,
    is_public: false,
  };
}

async function fetchExpertsForReviews(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  reviews: ReviewRow[]
) {
  const expertIds = Array.from(
    new Set(reviews.map((review) => review.expert_id).filter(Boolean))
  );

  if (expertIds.length === 0) return [] as ExpertRow[];

  const { data, error } = await supabase
    .from("experts")
    .select("id, name, full_name, title, slug")
    .in("id", expertIds);

  if (error) {
    console.warn("ADMIN_REVIEWS_EXPERTS_QUERY_ERROR", error.message);
    return [] as ExpertRow[];
  }

  return ((data ?? []) as unknown) as ExpertRow[];
}

export async function GET(req: Request) {
  try {
    const blocked = enforceAdminRequest(req);
    if (blocked) return blocked;

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get("status"));
    const limit = getSafeLimit(url.searchParams.get("limit"));

    let query = supabase
      .from("reviews")
      .select(
        `
        id,
        expert_id,
        client_id,
        booking_id,
        session_id,
        conversation_id,
        rating,
        review_text,
        is_public,
        is_approved,
        status,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: reviewsData, error: reviewsError } = await query;

    if (reviewsError) {
      return jsonError(reviewsError.message || "Yorumlar alınamadı.", 500);
    }

    const reviews = ((reviewsData ?? []) as unknown) as ReviewRow[];
    const experts = await fetchExpertsForReviews(supabase, reviews);

    const { data: allStatsData, error: statsError } = await supabase
      .from("reviews")
      .select("id, status, rating, is_public, is_approved");

    if (statsError) {
      return jsonError(statsError.message || "Yorum istatistikleri alınamadı.", 500);
    }

    const allStats = ((allStatsData ?? []) as unknown) as ReviewStatsRow[];

    const stats = {
      totalReviews: allStats.length,
      pendingReviews: allStats.filter((review) => review.status === "pending").length,
      approvedReviews: allStats.filter((review) => review.status === "approved").length,
      rejectedReviews: allStats.filter((review) => review.status === "rejected").length,
      hiddenReviews: allStats.filter((review) => review.status === "hidden").length,
      publicReviews: allStats.filter(
        (review) => review.status === "approved" && review.is_public && review.is_approved
      ).length,
    };

    return NextResponse.json({
      ok: true,
      stats,
      reviews: reviews.map((review) => ({
        id: review.id,
        expertId: review.expert_id,
        expertName: getExpertName(experts, review.expert_id),
        expertTitle: getExpertTitle(experts, review.expert_id),
        expertSlug: getExpertSlug(experts, review.expert_id),
        clientDisplayName: anonymizeClientId(review.client_id),
        bookingId: review.booking_id,
        sessionId: review.session_id,
        conversationId: review.conversation_id,
        rating: review.rating,
        reviewText: review.review_text,
        isPublic: review.is_public,
        isApproved: review.is_approved,
        status: review.status,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/reviews error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const blocked = enforceAdminRequest(req);
    if (blocked) return blocked;

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const body = await req.json().catch(() => null);
    const reviewId = cleanUuid(body?.reviewId);
    const action = normalizeAction(body?.action);

    if (!reviewId) {
      return jsonError("Geçerli reviewId gerekli.");
    }

    if (!action) {
      return jsonError("Geçerli moderasyon aksiyonu gerekli.");
    }

    const patch = buildActionPatch(action);

    const { data: review, error } = await supabase
      .from("reviews")
      .update(patch)
      .eq("id", reviewId)
      .select(
        `
        id,
        expert_id,
        client_id,
        booking_id,
        session_id,
        conversation_id,
        rating,
        review_text,
        is_public,
        is_approved,
        status,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      return jsonError(error.message || "Yorum güncellenemedi.", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Yorum moderasyon durumu güncellendi.",
      review,
    });
  } catch (error) {
    console.error("PATCH /api/admin/reviews error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
