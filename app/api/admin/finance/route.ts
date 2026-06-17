import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enforceAdminRequest } from "@/lib/security/admin-auth";
import { toSafeNumber } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_COMMISSION_RATE = 0.3;

type FinanceStatus = "paid" | "pending" | "refunded" | "cancelled" | "unknown" | string;

type PaymentRow = {
  id: string;
  client_id?: string | null;
  client_application_id?: string | null;
  expert_id?: string | null;
  conversation_id?: string | null;
  session_id?: string | null;
  booking_id?: string | null;
  amount?: number | string | null;
  total_amount?: number | string | null;
  price?: number | string | null;
  commission_amount?: number | string | null;
  expert_amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  payment_status?: string | null;
  provider?: string | null;
  provider_payment_id?: string | null;
  iyzico_payment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ExpertRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  title?: string | null;
};

type ClientRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
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

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCurrency(value: unknown) {
  const currency = String(value || "").trim().toUpperCase();

  if (currency.length === 3) return currency;

  return "TRY";
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
  return Math.max(0, toSafeNumber(payment.amount ?? payment.total_amount ?? payment.price, 0));
}

function getCommissionAmount(payment: PaymentRow) {
  const explicit = toSafeNumber(payment.commission_amount, 0);

  if (explicit > 0) return explicit;

  return Math.round(getPaymentAmount(payment) * DEFAULT_COMMISSION_RATE);
}

function getExpertNetAmount(payment: PaymentRow) {
  const explicit = toSafeNumber(payment.expert_amount, 0);

  if (explicit > 0) return explicit;

  return Math.max(0, getPaymentAmount(payment) - getCommissionAmount(payment));
}

function isPaid(payment: PaymentRow) {
  const status = normalizeStatus(payment.payment_status || payment.status);
  return ["paid", "success", "succeeded", "completed", "complete"].includes(status);
}

function isRefunded(payment: PaymentRow) {
  const status = normalizeStatus(payment.payment_status || payment.status);
  return ["refunded", "refund", "iade", "returned"].includes(status);
}

function isCancelled(payment: PaymentRow) {
  const status = normalizeStatus(payment.payment_status || payment.status);
  return ["cancelled", "canceled", "failed", "fail", "rejected"].includes(status);
}

function isPending(payment: PaymentRow) {
  const status = normalizeStatus(payment.payment_status || payment.status);

  return (
    !isPaid(payment) &&
    !isRefunded(payment) &&
    !isCancelled(payment) &&
    ["", "pending", "waiting", "created"].includes(status)
  );
}

function getFinanceStatus(payment: PaymentRow): FinanceStatus {
  if (isPaid(payment)) return "paid";
  if (isRefunded(payment)) return "refunded";
  if (isCancelled(payment)) return "cancelled";
  if (isPending(payment)) return "pending";

  return normalizeStatus(payment.payment_status || payment.status) || "unknown";
}

function getExpertName(experts: ExpertRow[], expertId?: string | null) {
  if (!expertId) return "Uzman bilgisi yok";

  const expert = experts.find((item) => item.id === expertId);

  return expert?.name || expert?.full_name || "Mindora Uzmanı";
}

function getClientName(clients: ClientRow[], clientId?: string | null) {
  if (!clientId) return "Danışan bilgisi yok";

  const client = clients.find((item) => item.id === clientId);

  return client?.name || client?.full_name || client?.email || "Mindora Danışanı";
}

async function safePaymentsQuery(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const primaryColumns = [
    "id",
    "client_id",
    "client_application_id",
    "expert_id",
    "conversation_id",
    "session_id",
    "booking_id",
    "amount",
    "total_amount",
    "price",
    "commission_amount",
    "expert_amount",
    "currency",
    "status",
    "payment_status",
    "provider",
    "provider_payment_id",
    "iyzico_payment_id",
    "created_at",
    "updated_at",
  ].join(", ");

  const { data, error } = await supabase
    .from("payments")
    .select(primaryColumns)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!error) return ((data || []) as unknown) as PaymentRow[];

  console.warn("ADMIN_FINANCE_PAYMENTS_PRIMARY_QUERY_ERROR", error.message);

  const fallbackColumns = [
    "id",
    "client_id",
    "expert_id",
    "conversation_id",
    "amount",
    "price",
    "status",
    "payment_status",
    "created_at",
    "updated_at",
  ].join(", ");

  const fallback = await supabase
    .from("payments")
    .select(fallbackColumns)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (fallback.error) {
    console.warn("ADMIN_FINANCE_PAYMENTS_FALLBACK_QUERY_ERROR", fallback.error.message);
    return [];
  }

  return ((fallback.data || []) as unknown) as PaymentRow[];
}

async function fetchExperts(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  expertIds: string[]
) {
  if (expertIds.length === 0) return [] as ExpertRow[];

  const { data, error } = await supabase
    .from("experts")
    .select("id, name, full_name, title")
    .in("id", expertIds);

  if (error) {
    console.warn("ADMIN_FINANCE_EXPERTS_QUERY_ERROR", error.message);
    return [] as ExpertRow[];
  }

  return ((data || []) as unknown) as ExpertRow[];
}

async function fetchClients(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  clientIds: string[]
) {
  if (clientIds.length === 0) return [] as ClientRow[];

  const { data, error } = await supabase
    .from("client_applications")
    .select("id, name, full_name, email")
    .in("id", clientIds);

  if (error) {
    console.warn("ADMIN_FINANCE_CLIENTS_QUERY_ERROR", error.message);
    return [] as ClientRow[];
  }

  return ((data || []) as unknown) as ClientRow[];
}

function buildTransaction(payment: PaymentRow, experts: ExpertRow[], clients: ClientRow[]) {
  const clientId = payment.client_id || payment.client_application_id || null;
  const amount = getPaymentAmount(payment);
  const commissionAmount = getCommissionAmount(payment);
  const expertAmount = getExpertNetAmount(payment);

  return {
    id: payment.id,
    clientId,
    clientName: getClientName(clients, clientId),
    expertId: payment.expert_id || null,
    expertName: getExpertName(experts, payment.expert_id),
    conversationId: payment.conversation_id || null,
    sessionId: payment.session_id || null,
    bookingId: payment.booking_id || null,
    amount,
    commissionAmount,
    expertAmount,
    currency: normalizeCurrency(payment.currency),
    status: getFinanceStatus(payment),
    rawStatus: payment.payment_status || payment.status || null,
    provider: payment.provider || "iyzico",
    providerPaymentId: payment.provider_payment_id || payment.iyzico_payment_id || null,
    createdAt: payment.created_at || null,
    updatedAt: payment.updated_at || null,
  };
}

export async function GET(req: Request) {
  try {
    const blocked = enforceAdminRequest(req);
    if (blocked) return blocked;

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const payments = await safePaymentsQuery(supabase);

    const expertIds = Array.from(
      new Set(payments.map((payment) => payment.expert_id).filter(Boolean))
    ) as string[];

    const clientIds = Array.from(
      new Set(
        payments
          .map((payment) => payment.client_id || payment.client_application_id)
          .filter(Boolean)
      )
    ) as string[];

    const [experts, clients] = await Promise.all([
      fetchExperts(supabase, expertIds),
      fetchClients(supabase, clientIds),
    ]);

    const paidPayments = payments.filter(isPaid);
    const pendingPayments = payments.filter(isPending);
    const refundedPayments = payments.filter(isRefunded);
    const cancelledPayments = payments.filter(isCancelled);
    const thisMonthPaidPayments = paidPayments.filter((payment) => isThisMonth(payment.created_at));

    const totalRevenue = paidPayments.reduce((total, payment) => total + getPaymentAmount(payment), 0);
    const totalCommission = paidPayments.reduce((total, payment) => total + getCommissionAmount(payment), 0);
    const totalExpertShare = paidPayments.reduce((total, payment) => total + getExpertNetAmount(payment), 0);

    const thisMonthRevenue = thisMonthPaidPayments.reduce(
      (total, payment) => total + getPaymentAmount(payment),
      0
    );
    const thisMonthCommission = thisMonthPaidPayments.reduce(
      (total, payment) => total + getCommissionAmount(payment),
      0
    );
    const thisMonthExpertShare = thisMonthPaidPayments.reduce(
      (total, payment) => total + getExpertNetAmount(payment),
      0
    );

    const pendingAmount = pendingPayments.reduce((total, payment) => total + getPaymentAmount(payment), 0);
    const refundedAmount = refundedPayments.reduce((total, payment) => total + getPaymentAmount(payment), 0);
    const cancelledAmount = cancelledPayments.reduce((total, payment) => total + getPaymentAmount(payment), 0);

    const transactions = payments.map((payment) => buildTransaction(payment, experts, clients));

    const expertSummaries = expertIds
      .map((expertId) => {
        const expertPayments = paidPayments.filter((payment) => payment.expert_id === expertId);
        const revenue = expertPayments.reduce((total, payment) => total + getPaymentAmount(payment), 0);
        const commission = expertPayments.reduce((total, payment) => total + getCommissionAmount(payment), 0);
        const expertShare = expertPayments.reduce((total, payment) => total + getExpertNetAmount(payment), 0);

        return {
          expertId,
          expertName: getExpertName(experts, expertId),
          paidPaymentCount: expertPayments.length,
          revenue,
          commission,
          expertShare,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    return NextResponse.json({
      ok: true,
      stats: {
        totalRevenue,
        totalCommission,
        totalExpertShare,
        thisMonthRevenue,
        thisMonthCommission,
        thisMonthExpertShare,
        pendingAmount,
        refundedAmount,
        cancelledAmount,
        totalPayments: payments.length,
        paidPayments: paidPayments.length,
        pendingPayments: pendingPayments.length,
        refundedPayments: refundedPayments.length,
        cancelledPayments: cancelledPayments.length,
      },
      transactions,
      expertSummaries,
    });
  } catch (error) {
    console.error("GET /api/admin/finance error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
