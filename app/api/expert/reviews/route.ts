

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ReviewStatus = "pending" | "approved" | "rejected" | "hidden" | string;

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
  status: ReviewStatus;
  created_at: string;
  updated_at: string | null;
};

type ExpertProfileRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  slug?: string | null;
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

function cleanValue(value: string | null) {
  return String(value || "").trim();
}

function getSafeLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) return 50;
  if (parsed < 1) return 50;
  if (parsed > 200) return 200;

  return parsed;
}

function getSafeRating(value: string | null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) return null;
  if (parsed < 1 || parsed > 5) return null;

  return parsed;
}

function normalizeStatus(value: string | null) {
  const status = cleanValue(value).toLowerCase();

  if (["pending", "approved", "rejected", "hidden"].includes(status)) {
    return status;
  }

  return "";
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

function calculateAverageRating(reviews: Array<Pick<ReviewRow, "rating">>) {
  const ratings = reviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

  if (ratings.length === 0) return 0;

  return Math.round((ratings.reduce((total, rating) => total + rating, 0) / ratings.length) * 10) / 10;
}

function buildRatingDistribution(reviews: Array<Pick<ReviewRow, "rating">>) {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const review of reviews) {
    const rating = Number(review.rating);

    if (rating >= 1 && rating <= 5) {
      distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }

  return distribution;
}

function anonymizeClientId(clientId: string) {
  if (!clientId) return "Danışan";
  return `Danışan ${clientId.slice(0, 4).toUpperCase()}`;
}

async function resolveExpertId({
  supabase,
  explicitExpertId,
  token,
}: {
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>;
  explicitExpertId: string;
  token: string;
}) {
  if (explicitExpertId) {
    return explicitExpertId;
  }

  if (!token) {
    return "";
  }

  const { data: tokenRow } = await supabase
    .from("conversation_access_tokens")
    .select("expert_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  const resolvedExpertId = cleanValue((tokenRow as { expert_id?: string | null } | null)?.expert_id || null);
  const expiresAt = cleanValue((tokenRow as { expires_at?: string | null } | null)?.expires_at || null);

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return "";
  }

  return resolvedExpertId;
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const url = new URL(req.url);
    const token = cleanValue(url.searchParams.get("token"));
    const explicitExpertId = cleanValue(url.searchParams.get("expertId"));
    const status = normalizeStatus(url.searchParams.get("status"));
    const rating = getSafeRating(url.searchParams.get("rating"));
    const limit = getSafeLimit(url.searchParams.get("limit"));

    const expertId = await resolveExpertId({
      supabase,
      explicitExpertId,
      token,
    });

    if (!expertId) {
      return jsonError("Uzman erişimi doğrulanamadı.", 401);
    }

    let reviewsQuery = supabase
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
      .eq("expert_id", expertId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      reviewsQuery = reviewsQuery.eq("status", status);
    }

    if (rating) {
      reviewsQuery = reviewsQuery.eq("rating", rating);
    }

    const { data: reviewsData, error: reviewsError } = await reviewsQuery;

    if (reviewsError) {
      return jsonError(reviewsError.message || "Yorumlar alınamadı.", 500);
    }

    const { data: allReviewsData, error: allReviewsError } = await supabase
      .from("reviews")
      .select("id, rating, status, is_public, is_approved, created_at")
      .eq("expert_id", expertId);

    if (allReviewsError) {
      return jsonError(allReviewsError.message || "Yorum istatistikleri alınamadı.", 500);
    }

    const { data: expertData } = await supabase
      .from("experts")
      .select("id, name, full_name, slug")
      .eq("id", expertId)
      .maybeSingle();

    const allReviews = (allReviewsData ?? []) as Array<
      Pick<ReviewRow, "id" | "rating" | "status" | "is_public" | "is_approved" | "created_at">
    >;

    const publicApprovedReviews = allReviews.filter(
      (review) => review.status === "approved" && review.is_public && review.is_approved
    );

    const monthStartIso = getMonthStartIso();

    const stats = {
      averageRating: calculateAverageRating(publicApprovedReviews),
      totalReviews: allReviews.length,
      publicReviews: publicApprovedReviews.length,
      pendingReviews: allReviews.filter((review) => review.status === "pending").length,
      approvedReviews: allReviews.filter((review) => review.status === "approved").length,
      rejectedReviews: allReviews.filter((review) => review.status === "rejected").length,
      hiddenReviews: allReviews.filter((review) => review.status === "hidden").length,
      thisMonthReviews: allReviews.filter((review) => review.created_at >= monthStartIso).length,
      ratingDistribution: buildRatingDistribution(publicApprovedReviews),
    };

    const reviews = ((reviewsData ?? []) as ReviewRow[]).map((review) => ({
      id: review.id,
      bookingId: review.booking_id,
      sessionId: review.session_id,
      conversationId: review.conversation_id,
      rating: review.rating,
      reviewText: review.review_text,
      status: review.status,
      isPublic: review.is_public,
      isApproved: review.is_approved,
      clientDisplayName: anonymizeClientId(review.client_id),
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    }));

    const expert = expertData as ExpertProfileRow | null;

    return NextResponse.json({
      ok: true,
      expert: {
        id: expertId,
        name: expert?.name || expert?.full_name || "Mindora Uzmanı",
        slug: expert?.slug || null,
      },
      stats,
      reviews,
    });
  } catch (error) {
    console.error("GET /api/expert/reviews error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
