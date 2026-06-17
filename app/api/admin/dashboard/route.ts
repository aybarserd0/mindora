import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type PaymentRow = {
  id: string;
  amount?: number | string | null;
  total_amount?: number | string | null;
  price?: number | string | null;
  commission_amount?: number | string | null;
  expert_amount?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
};

type SessionRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
};

type ReviewRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
};

type ExpertRow = {
  id: string;
  name?: string | null;
  status?: string | null;
  account_status?: string | null;
  created_at?: string | null;
};

type ClientRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  status?: string | null;
  created_at?: string | null;
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

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

function isThisMonth(value?: string | null) {
  if (!value) return false;
  return value >= getMonthStartIso();
}

function getPaymentAmount(payment: PaymentRow) {
  return toNumber(payment.amount ?? payment.total_amount ?? payment.price);
}

function getCommissionAmount(payment: PaymentRow) {
  const explicit = toNumber(payment.commission_amount);

  if (explicit > 0) {
    return explicit;
  }

  return Math.round(getPaymentAmount(payment) * 0.3);
}

function getExpertNetAmount(payment: PaymentRow) {
  const explicit = toNumber(payment.expert_amount);

  if (explicit > 0) {
    return explicit;
  }

  return Math.max(0, getPaymentAmount(payment) - getCommissionAmount(payment));
}

function isPaid(payment: PaymentRow) {
  const status = normalizeStatus(payment.payment_status || payment.status);
  return ["paid", "success", "succeeded", "completed", "complete"].includes(status);
}

function isActiveExpert(expert: ExpertRow) {
  const status = normalizeStatus(expert.status);
  const accountStatus = normalizeStatus(expert.account_status);

  return ["approved", "active", "aktif", "onaylı", "onayli"].includes(status) ||
    ["approved", "active", "aktif", "onaylı", "onayli"].includes(accountStatus);
}

function isPendingExpert(expert: ExpertRow) {
  const status = normalizeStatus(expert.status);
  const accountStatus = normalizeStatus(expert.account_status);

  return ["pending", "waiting", "beklemede", "review"].includes(status) ||
    ["pending", "waiting", "beklemede", "review"].includes(accountStatus);
}

async function assertAdminAccess(req: Request) {
  const configuredAdminToken = process.env.ADMIN_DASHBOARD_TOKEN || process.env.ADMIN_TOKEN || "";
  const headerToken = req.headers.get("x-admin-token") || "";
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("adminToken") || "";

  if (!configuredAdminToken) {
    return true;
  }

  return headerToken === configuredAdminToken || queryToken === configuredAdminToken;
}

async function safeSelect<T>(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  table: string,
  columns: string,
  limit = 500
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`ADMIN_DASHBOARD_${table.toUpperCase()}_QUERY_ERROR`, error.message);
    return [] as T[];
  }

  return (data || []) as T[];
}

export async function GET(req: Request) {
  try {
    const hasAdminAccess = await assertAdminAccess(req);

    if (!hasAdminAccess) {
      return jsonError("Admin erişimi doğrulanamadı.", 401);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const [experts, clients, payments, sessions, reviews] = await Promise.all([
      safeSelect<ExpertRow>(supabase, "experts", "id, name, status, account_status, created_at", 1000),
      safeSelect<ClientRow>(supabase, "client_applications", "id, name, full_name, status, created_at", 1000),
      safeSelect<PaymentRow>(
        supabase,
        "payments",
        "id, amount, total_amount, price, commission_amount, expert_amount, status, payment_status, created_at",
        1000
      ),
      safeSelect<SessionRow>(supabase, "sessions", "id, status, created_at", 1000),
      safeSelect<ReviewRow>(supabase, "reviews", "id, status, created_at", 1000),
    ]);

    const paidPayments = payments.filter(isPaid);
    const thisMonthPaidPayments = paidPayments.filter((payment) => isThisMonth(payment.created_at));

    const totalRevenue = paidPayments.reduce((total, payment) => total + getPaymentAmount(payment), 0);
    const thisMonthRevenue = thisMonthPaidPayments.reduce((total, payment) => total + getPaymentAmount(payment), 0);
    const thisMonthCommission = thisMonthPaidPayments.reduce(
      (total, payment) => total + getCommissionAmount(payment),
      0
    );
    const pendingExpertPayout = paidPayments.reduce(
      (total, payment) => total + getExpertNetAmount(payment),
      0
    );

    const recentActivities = [
      ...experts.slice(0, 8).map((expert) => ({
        id: `expert-${expert.id}`,
        type: "expert",
        title: "Yeni uzman kaydı",
        description: expert.name || "Uzman başvurusu",
        createdAt: expert.created_at || null,
        href: "/admin/uzman-basvurulari",
      })),
      ...clients.slice(0, 8).map((client) => ({
        id: `client-${client.id}`,
        type: "client",
        title: "Yeni danışan başvurusu",
        description: client.name || client.full_name || "Danışan başvurusu",
        createdAt: client.created_at || null,
        href: "/admin/danisan-basvurulari",
      })),
      ...payments.slice(0, 8).map((payment) => ({
        id: `payment-${payment.id}`,
        type: "payment",
        title: isPaid(payment) ? "Ödeme alındı" : "Ödeme bekliyor",
        description: `${getPaymentAmount(payment).toLocaleString("tr-TR")} TL`,
        createdAt: payment.created_at || null,
        href: "/admin/payments",
      })),
      ...reviews.slice(0, 8).map((review) => ({
        id: `review-${review.id}`,
        type: "review",
        title: normalizeStatus(review.status) === "pending" ? "Yeni yorum bekliyor" : "Yorum güncellendi",
        description: `Durum: ${review.status || "belirsiz"}`,
        createdAt: review.created_at || null,
        href: "/admin/reviews",
      })),
    ]
      .filter((activity) => activity.createdAt)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 12);

    return NextResponse.json({
      ok: true,
      stats: {
        totalExperts: experts.length,
        activeExperts: experts.filter(isActiveExpert).length,
        pendingExperts: experts.filter(isPendingExpert).length,
        totalClients: clients.length,
        totalSessions: sessions.length,
        completedSessions: sessions.filter((session) => normalizeStatus(session.status) === "completed").length,
        pendingReviews: reviews.filter((review) => normalizeStatus(review.status) === "pending").length,
        totalReviews: reviews.length,
        totalRevenue,
        thisMonthRevenue,
        thisMonthCommission,
        pendingExpertPayout,
      },
      recentActivities,
      quickLinks: [
        { label: "Uzman Başvuruları", href: "/admin/uzman-basvurulari" },
        { label: "Danışan Başvuruları", href: "/admin/danisan-basvurulari" },
        { label: "Ödeme Yönetimi", href: "/admin/payments" },
        { label: "Sohbet Yönetimi", href: "/admin/conversations" },
        { label: "Yorum Moderasyonu", href: "/admin/reviews" },
      ],
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
