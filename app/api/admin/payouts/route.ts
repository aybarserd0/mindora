import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanMultilineText, cleanText, cleanUuid, toSafeNumber } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_PAYOUT_AMOUNT = 1_000_000;

type PayoutStatus = "pending" | "processing" | "paid" | "cancelled";

type PayoutRow = {
  id: string;
  expert_id: string;
  amount: number | string;
  currency: string | null;
  status: PayoutStatus | string;
  paid_at: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

type ExpertRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  title?: string | null;
};

type PaymentRow = {
  id: string;
  expert_id?: string | null;
  amount?: number | string | null;
  total_amount?: number | string | null;
  price?: number | string | null;
  commission_amount?: number | string | null;
  expert_amount?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
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

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizePayoutStatus(value: unknown): PayoutStatus | "" {
  const status = normalizeStatus(value);

  if (
    status === "pending" ||
    status === "processing" ||
    status === "paid" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "";
}

function getPaymentAmount(payment: PaymentRow) {
  return toSafeNumber(payment.amount ?? payment.total_amount ?? payment.price, 0);
}

function getCommissionAmount(payment: PaymentRow) {
  const explicit = toSafeNumber(payment.commission_amount, 0);

  if (explicit > 0) return explicit;

  return Math.round(getPaymentAmount(payment) * 0.3);
}

function getExpertNetAmount(payment: PaymentRow) {
  const explicit = toSafeNumber(payment.expert_amount, 0);

  if (explicit > 0) return explicit;

  return Math.max(0, getPaymentAmount(payment) - getCommissionAmount(payment));
}

function isPaidPayment(payment: PaymentRow) {
  const status = normalizeStatus(payment.payment_status || payment.status);
  return ["paid", "success", "succeeded", "completed", "complete"].includes(status);
}

function getExpertName(experts: ExpertRow[], expertId?: string | null) {
  if (!expertId) return "Uzman bilgisi yok";
  const expert = experts.find((item) => item.id === expertId);
  return expert?.name || expert?.full_name || "Mindora Uzmanı";
}

function getExpertTitle(experts: ExpertRow[], expertId?: string | null) {
  if (!expertId) return "Uzman";
  const expert = experts.find((item) => item.id === expertId);
  return expert?.title || "Uzman";
}

async function fetchExperts(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await supabase
    .from("experts")
    .select("id, name, full_name, title")
    .order("name", { ascending: true });

  if (error) {
    console.warn("ADMIN_PAYOUTS_EXPERTS_QUERY_ERROR", error.message);
    return [] as ExpertRow[];
  }

  return ((data || []) as unknown) as ExpertRow[];
}

async function fetchPayments(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, expert_id, amount, total_amount, price, commission_amount, expert_amount, status, payment_status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.warn("ADMIN_PAYOUTS_PAYMENTS_QUERY_ERROR", error.message);
    return [] as PaymentRow[];
  }

  return ((data || []) as unknown) as PaymentRow[];
}

async function fetchPayouts(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  status: string
) {
  let query = supabase
    .from("expert_payouts")
    .select("id, expert_id, amount, currency, status, paid_at, note, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("ADMIN_PAYOUTS_QUERY_ERROR", error.message);
    return [] as PayoutRow[];
  }

  return ((data || []) as unknown) as PayoutRow[];
}

function calculateExpertBalances(payments: PaymentRow[], payouts: PayoutRow[], experts: ExpertRow[]) {
  const expertIds = Array.from(
    new Set([
      ...payments.map((payment) => payment.expert_id).filter(Boolean),
      ...payouts.map((payout) => payout.expert_id).filter(Boolean),
      ...experts.map((expert) => expert.id).filter(Boolean),
    ])
  ) as string[];

  return expertIds
    .map((expertId) => {
      const paidPayments = payments.filter(
        (payment) => payment.expert_id === expertId && isPaidPayment(payment)
      );
      const expertShare = paidPayments.reduce((total, payment) => total + getExpertNetAmount(payment), 0);
      const payoutRows = payouts.filter((payout) => payout.expert_id === expertId);
      const paidPayouts = payoutRows.filter((payout) => payout.status === "paid");
      const activePayouts = payoutRows.filter(
        (payout) => payout.status === "pending" || payout.status === "processing"
      );

      const paidAmount = paidPayouts.reduce((total, payout) => total + toSafeNumber(payout.amount, 0), 0);
      const activeAmount = activePayouts.reduce((total, payout) => total + toSafeNumber(payout.amount, 0), 0);
      const availableBalance = Math.max(0, expertShare - paidAmount - activeAmount);

      return {
        expertId,
        expertName: getExpertName(experts, expertId),
        expertTitle: getExpertTitle(experts, expertId),
        totalExpertShare: expertShare,
        paidPayoutAmount: paidAmount,
        activePayoutAmount: activeAmount,
        availableBalance,
        paidPaymentCount: paidPayments.length,
        payoutCount: payoutRows.length,
      };
    })
    .filter((item) => item.totalExpertShare > 0 || item.payoutCount > 0)
    .sort((a, b) => b.availableBalance - a.availableBalance);
}

function serializePayout(payout: PayoutRow, experts: ExpertRow[]) {
  return {
    id: payout.id,
    expertId: payout.expert_id,
    expertName: getExpertName(experts, payout.expert_id),
    expertTitle: getExpertTitle(experts, payout.expert_id),
    amount: toSafeNumber(payout.amount, 0),
    currency: payout.currency || "TRY",
    status: payout.status,
    paidAt: payout.paid_at,
    note: payout.note,
    createdBy: payout.created_by,
    createdAt: payout.created_at,
    updatedAt: payout.updated_at,
  };
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const url = new URL(req.url);
    const status = normalizePayoutStatus(url.searchParams.get("status"));

    const [experts, payments, payouts] = await Promise.all([
      fetchExperts(supabase),
      fetchPayments(supabase),
      fetchPayouts(supabase, status),
    ]);

    const allPayouts = status ? await fetchPayouts(supabase, "") : payouts;
    const balances = calculateExpertBalances(payments, allPayouts, experts);

    const totalPending = allPayouts
      .filter((payout) => payout.status === "pending")
      .reduce((total, payout) => total + toSafeNumber(payout.amount, 0), 0);
    const totalProcessing = allPayouts
      .filter((payout) => payout.status === "processing")
      .reduce((total, payout) => total + toSafeNumber(payout.amount, 0), 0);
    const totalPaid = allPayouts
      .filter((payout) => payout.status === "paid")
      .reduce((total, payout) => total + toSafeNumber(payout.amount, 0), 0);
    const totalCancelled = allPayouts
      .filter((payout) => payout.status === "cancelled")
      .reduce((total, payout) => total + toSafeNumber(payout.amount, 0), 0);

    return NextResponse.json({
      ok: true,
      stats: {
        totalPayouts: allPayouts.length,
        pendingPayouts: allPayouts.filter((payout) => payout.status === "pending").length,
        processingPayouts: allPayouts.filter((payout) => payout.status === "processing").length,
        paidPayouts: allPayouts.filter((payout) => payout.status === "paid").length,
        cancelledPayouts: allPayouts.filter((payout) => payout.status === "cancelled").length,
        totalPending,
        totalProcessing,
        totalPaid,
        totalCancelled,
        totalAvailableBalance: balances.reduce((total, item) => total + item.availableBalance, 0),
      },
      balances,
      payouts: payouts.map((payout) => serializePayout(payout, experts)),
    });
  } catch (error) {
    console.error("GET /api/admin/payouts error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const body = await req.json().catch(() => null);
    const expertId = cleanUuid(body?.expertId);
    const amount = toSafeNumber(body?.amount, 0);
    const note = cleanMultilineText(body?.note, 1000);
    const createdBy = cleanText(body?.createdBy, 120) || "admin";

    if (!expertId) {
      return jsonError("Geçerli expertId gerekli.");
    }

    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PAYOUT_AMOUNT) {
      return jsonError("Geçerli ödeme tutarı gerekli.");
    }

    const { data: expert, error: expertError } = await supabase
      .from("experts")
      .select("id")
      .eq("id", expertId)
      .maybeSingle();

    if (expertError) {
      return jsonError(expertError.message || "Uzman kontrolü yapılamadı.", 500);
    }

    if (!expert) {
      return jsonError("Uzman bulunamadı.", 404);
    }

    const { data, error } = await supabase
      .from("expert_payouts")
      .insert({
        expert_id: expertId,
        amount,
        currency: "TRY",
        status: "pending",
        note: note || null,
        created_by: createdBy,
      })
      .select("id, expert_id, amount, currency, status, paid_at, note, created_by, created_at, updated_at")
      .single();

    if (error) {
      return jsonError(error.message || "Uzman ödemesi oluşturulamadı.", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Uzman ödeme kaydı oluşturuldu.",
      payout: data,
    });
  } catch (error) {
    console.error("POST /api/admin/payouts error:", error);

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
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const body = await req.json().catch(() => null);
    const payoutId = cleanUuid(body?.payoutId);
    const status = normalizePayoutStatus(body?.status);
    const note = cleanMultilineText(body?.note, 1000);

    if (!payoutId) {
      return jsonError("Geçerli payoutId gerekli.");
    }

    if (!status) {
      return jsonError("Geçerli ödeme durumu gerekli.");
    }

    const patch: Record<string, unknown> = {
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.note === "string") {
      patch.note = note || null;
    }

    const { data, error } = await supabase
      .from("expert_payouts")
      .update(patch)
      .eq("id", payoutId)
      .select("id, expert_id, amount, currency, status, paid_at, note, created_by, created_at, updated_at")
      .single();

    if (error) {
      return jsonError(error.message || "Uzman ödeme durumu güncellenemedi.", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Uzman ödeme durumu güncellendi.",
      payout: data,
    });
  } catch (error) {
    console.error("PATCH /api/admin/payouts error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
