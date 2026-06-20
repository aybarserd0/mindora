import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type GenericRow = Record<string, unknown>;

type PaymentRow = {
  id?: string | null;
  expert_id?: string | null;
  expertId?: string | null;
  amount?: number | string | null;
  commission_amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

type ExpertRow = {
  id?: string | null;
  name?: string | null;
  full_name?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type ClientRow = {
  id?: string | null;
  name?: string | null;
  status?: string | null;
  expert_id?: string | null;
  matched_expert_id?: string | null;
  created_at?: string | null;
};

type SessionRow = {
  id?: string | null;
  expert_id?: string | null;
  expertId?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type ReviewRow = {
  id?: string | null;
  expert_id?: string | null;
  expertId?: string | null;
  rating?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

type ChartPoint = {
  label: string;
  value: number;
};

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeId(value: unknown) {
  return String(value || "").trim();
}

function isPaid(payment: PaymentRow) {
  return [
    "paid",
    "success",
    "succeeded",
    "completed",
    "complete",
    "odendi",
    "ödendi",
  ].includes(normalizeStatus(payment.status));
}

function isMatchedClient(client: ClientRow) {
  const status = normalizeStatus(client.status);

  return (
    [
      "matched",
      "assigned",
      "contacted",
      "completed",
      "complete",
      "eslesti",
      "eşleşti",
      "iletisime_gecildi",
      "iletişime geçildi",
      "tamamlandi",
      "tamamlandı",
    ].includes(status) ||
    Boolean(normalizeId(client.expert_id)) ||
    Boolean(normalizeId(client.matched_expert_id))
  );
}

function isCompletedSession(session: SessionRow) {
  return [
    "completed",
    "complete",
    "done",
    "finished",
    "tamamlandi",
    "tamamlandı",
  ].includes(normalizeStatus(session.status));
}

function isPublicOrApprovedReview(review: ReviewRow) {
  return [
    "approved",
    "public",
    "published",
    "active",
    "onayli",
    "onaylı",
  ].includes(normalizeStatus(review.status));
}

function getPaymentAmount(payment: PaymentRow) {
  return toNumber(payment.amount);
}

function getCommissionAmount(payment: PaymentRow) {
  const explicitCommission = toNumber(payment.commission_amount);

  if (explicitCommission > 0) return explicitCommission;

  return Math.round(getPaymentAmount(payment) * 0.3);
}

function getExpertId(row: PaymentRow | SessionRow | ReviewRow | ClientRow) {
  const record = row as Record<string, unknown>;

  return normalizeId(
    record.expert_id ||
      record.expertId ||
      record.expert ||
      record.matched_expert_id ||
      record.matchedExpertId
  );
}

function getRate(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;

  return Math.round((numerator / denominator) * 1000) / 10;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function getDayKey(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function getMonthKey(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 7);
}

function formatDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dayKey;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return monthKey;

  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function buildLastDays(days = 30) {
  const today = startOfUtcDay(new Date());
  const firstDay = addUtcDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const date = addUtcDays(firstDay, index);
    return date.toISOString().slice(0, 10);
  });
}

function buildLastMonths(months = 12) {
  const now = new Date();
  const firstMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)
  );

  return Array.from({ length: months }, (_, index) => {
    const date = addUtcMonths(firstMonth, index);
    return date.toISOString().slice(0, 7);
  });
}

function countRowsByDay(rows: Array<{ created_at?: string | null }>, dayKeys: string[]): ChartPoint[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = getDayKey(row.created_at);
    if (!key) continue;

    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return dayKeys.map((key) => ({
    label: formatDayLabel(key),
    value: counts.get(key) || 0,
  }));
}

function sumPaymentsByDay(payments: PaymentRow[], dayKeys: string[], mode: "count" | "amount") {
  const values = new Map<string, number>();

  for (const payment of payments) {
    const key = getDayKey(payment.created_at);
    if (!key) continue;

    const value = mode === "count" ? 1 : getPaymentAmount(payment);
    values.set(key, (values.get(key) || 0) + value);
  }

  return dayKeys.map((key) => ({
    label: formatDayLabel(key),
    value: values.get(key) || 0,
  }));
}

function sumPaymentsByMonth(
  payments: PaymentRow[],
  monthKeys: string[],
  selector: (payment: PaymentRow) => number
) {
  const values = new Map<string, number>();

  for (const payment of payments) {
    const key = getMonthKey(payment.created_at);
    if (!key) continue;

    values.set(key, (values.get(key) || 0) + selector(payment));
  }

  return monthKeys.map((key) => ({
    label: formatMonthLabel(key),
    value: values.get(key) || 0,
  }));
}

async function safeSelect<T>(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  columns: string,
  limit = 5000
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`ADMIN_ANALYTICS_${table.toUpperCase()}_QUERY_ERROR`, error.message);
    return [] as T[];
  }

  return (data || []) as T[];
}

async function safeSelectFlexible<T>(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  columnOptions: string[],
  limit = 5000
) {
  for (const columns of columnOptions) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error) {
      return (data || []) as T[];
    }

    console.warn(
      `ADMIN_ANALYTICS_${table.toUpperCase()}_FLEX_QUERY_ERROR`,
      columns,
      error.message
    );
  }

  return [] as T[];
}

function buildExpertPerformance(params: {
  experts: ExpertRow[];
  paidPayments: PaymentRow[];
  sessions: SessionRow[];
  reviews: ReviewRow[];
}) {
  const { experts, paidPayments, sessions, reviews } = params;

  const performance = new Map<
    string,
    {
      expertId: string;
      expertName: string;
      sessions: number;
      completedSessions: number;
      revenue: number;
      commission: number;
      averageRating: number;
      reviewCount: number;
      ratingTotal: number;
    }
  >();

  function ensureExpert(expertId: string, fallbackName = "İsimsiz Uzman") {
    if (!expertId) return null;

    if (!performance.has(expertId)) {
      const expert = experts.find((item) => normalizeId(item.id) === expertId);
      performance.set(expertId, {
        expertId,
        expertName:
          String(expert?.name || expert?.full_name || "").trim() ||
          fallbackName,
        sessions: 0,
        completedSessions: 0,
        revenue: 0,
        commission: 0,
        averageRating: 0,
        reviewCount: 0,
        ratingTotal: 0,
      });
    }

    return performance.get(expertId) || null;
  }

  for (const expert of experts) {
    const expertId = normalizeId(expert.id);
    if (expertId) ensureExpert(expertId, String(expert.name || expert.full_name || "İsimsiz Uzman"));
  }

  for (const session of sessions) {
    const expertId = getExpertId(session);
    const item = ensureExpert(expertId);
    if (!item) continue;

    item.sessions += 1;
    if (isCompletedSession(session)) item.completedSessions += 1;
  }

  for (const payment of paidPayments) {
    const expertId = getExpertId(payment);
    const item = ensureExpert(expertId);
    if (!item) continue;

    item.revenue += getPaymentAmount(payment);
    item.commission += getCommissionAmount(payment);
  }

  for (const review of reviews.filter(isPublicOrApprovedReview)) {
    const expertId = getExpertId(review);
    const rating = toNumber(review.rating);
    const item = ensureExpert(expertId);
    if (!item || rating <= 0) continue;

    item.reviewCount += 1;
    item.ratingTotal += rating;
  }

  return Array.from(performance.values())
    .map((item) => ({
      expertId: item.expertId,
      expertName: item.expertName,
      sessions: item.sessions,
      completedSessions: item.completedSessions,
      revenue: Math.round(item.revenue),
      commission: Math.round(item.commission),
      averageRating:
        item.reviewCount > 0
          ? Math.round((item.ratingTotal / item.reviewCount) * 10) / 10
          : 0,
      reviewCount: item.reviewCount,
    }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.completedSessions !== a.completedSessions) {
        return b.completedSessions - a.completedSessions;
      }

      return b.averageRating - a.averageRating;
    })
    .slice(0, 20);
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [payments, experts, clients, sessions, reviews] = await Promise.all([
      safeSelectFlexible<PaymentRow>(
        supabase,
        "payments",
        [
          "id, expert_id, amount, commission_amount, created_at, status",
          "id, amount, commission_amount, created_at, status",
        ],
        5000
      ),
      safeSelectFlexible<ExpertRow>(
        supabase,
        "experts",
        [
          "id, name, full_name, title, status, created_at",
          "id, name, title, status, created_at",
          "id, name, status, created_at",
          "id, created_at",
        ],
        5000
      ),
      safeSelectFlexible<ClientRow>(
        supabase,
        "client_applications",
        [
          "id, name, status, expert_id, matched_expert_id, created_at",
          "id, name, status, expert_id, created_at",
          "id, name, status, created_at",
          "id, created_at",
        ],
        5000
      ),
      safeSelectFlexible<SessionRow>(
        supabase,
        "sessions",
        [
          "id, expert_id, created_at, status",
          "id, created_at, status",
        ],
        5000
      ),
      safeSelectFlexible<ReviewRow>(
        supabase,
        "reviews",
        [
          "id, expert_id, rating, status, created_at",
          "id, rating, status, created_at",
          "id, status, created_at",
        ],
        5000
      ),
    ]);

    const paidPayments = payments.filter(isPaid);
    const matchedClients = clients.filter(isMatchedClient);
    const completedSessions = sessions.filter(isCompletedSession);
    const approvedReviews = reviews.filter(isPublicOrApprovedReview);

    const totalRevenue = paidPayments.reduce(
      (sum, payment) => sum + getPaymentAmount(payment),
      0
    );

    const totalCommission = paidPayments.reduce(
      (sum, payment) => sum + getCommissionAmount(payment),
      0
    );

    const dayKeys = buildLastDays(30);
    const monthKeys = buildLastMonths(12);
    const applicationsRows = [...clients, ...experts];

    const conversion = {
      totalApplications: clients.length,
      matchedApplications: matchedClients.length,
      paidPayments: paidPayments.length,
      completedSessions: completedSessions.length,
      approvedReviews: approvedReviews.length,
      applicationToMatchRate: getRate(matchedClients.length, clients.length),
      matchToPaymentRate: getRate(paidPayments.length, matchedClients.length),
      paymentToSessionRate: getRate(completedSessions.length, paidPayments.length),
      sessionToReviewRate: getRate(approvedReviews.length, completedSessions.length),
    };

    return NextResponse.json({
      ok: true,
      overview: {
        totalRevenue: Math.round(totalRevenue),
        totalCommission: Math.round(totalCommission),
        totalExperts: experts.length,
        totalClients: clients.length,
        totalSessions: sessions.length,
      },
      charts: {
        applications: countRowsByDay(applicationsRows, dayKeys),
        payments: sumPaymentsByDay(paidPayments, dayKeys, "count"),
        revenueByMonth: sumPaymentsByMonth(
          paidPayments,
          monthKeys,
          getPaymentAmount
        ),
        commissionByMonth: sumPaymentsByMonth(
          paidPayments,
          monthKeys,
          getCommissionAmount
        ),
      },
      conversion,
      expertPerformance: buildExpertPerformance({
        experts,
        paidPayments,
        sessions,
        reviews,
      }),
      meta: {
        generatedAt: new Date().toISOString(),
        range: {
          days: 30,
          months: 12,
        },
      },
    });
  } catch (error) {
    console.error("ADMIN_ANALYTICS_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Analytics verileri alınamadı.",
      },
      { status: 500 }
    );
  }
}
