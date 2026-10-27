"use client";

import { professionLabel, toProfession } from "@/lib/professions";
import ProfessionFilter, { type ProfessionFilterValue } from "@/components/admin/ProfessionFilter";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminHeader from "@/components/AdminHeader";

type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";
type PayoutStatus = "unpaid" | "scheduled" | "paid" | "blocked";
type PaymentFilter = "all" | PaymentStatus;

type Payment = {
  id: string;
  client_id: string | null;
  expert_id: string | null;
  amount: number;
  commission_amount: number;
  expert_amount: number;
  iyzico_token: string | null;
  iyzico_payment_id: string | null;
  iyzico_conversation_id: string | null;
  payment_page_url?: string | null;
  status: PaymentStatus;
  expert_payout_status: PayoutStatus | null;
  expert_payout_paid_at: string | null;
  created_at: string;
  commission_rate?: number | string | null;
  refund_status?: "none" | "pending" | "refunded" | "failed" | null;
  refund_error?: string | null;
  payout_eligibility?: "ready" | "waiting_session" | "refunded" | "refund_pending" | "unlinked" | "not_paid";
  booking?: { id: string; status: string | null; late_cancellation: boolean | null; scheduled_start_at: string | null } | null;
  client_applications?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  experts?: {
    id: string;
    name: string | null;
    email: string | null;
    profession?: string | null;
  } | null;
};

const paymentFilters: Array<{ value: PaymentFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Bekliyor" },
  { value: "paid", label: "Ödendi" },
  { value: "failed", label: "Başarısız" },
  { value: "cancelled", label: "İptal" },
  { value: "refunded", label: "İade" },
];

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return "-";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    pending: "Bekliyor",
    paid: "Ödendi",
    failed: "Başarısız",
    cancelled: "İptal",
    refunded: "İade",
  };

  return labels[status] || "Bilinmiyor";
}

function getStatusStyle(status: PaymentStatus) {
  const styles: Record<PaymentStatus, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
    cancelled: "border-slate-200 bg-slate-100 text-slate-700",
    refunded: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return styles[status] || "border-slate-200 bg-slate-100 text-slate-700";
}

function getPayoutLabel(status: PayoutStatus | null) {
  if (status === "paid") return "Uzmana Ödendi";
  if (status === "scheduled") return "Planlandı";
  if (status === "blocked") return "Blokeli";

  return "Ödenmedi";
}

function getPayoutStyle(status: PayoutStatus | null) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "scheduled") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-700";

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function safeText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [professionFilter, setProfessionFilter] = useState<ProfessionFilterValue>("all");
  const [search, setSearch] = useState("");
  const [payoutLoadingId, setPayoutLoadingId] = useState<string | null>(null);
  const [refundLoadingId, setRefundLoadingId] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    const keyword = normalizeText(search);

    return payments.filter((payment) => {
      const statusMatch = filter === "all" || payment.status === filter;

      const text = [
        payment.id,
        payment.payment_page_url,
        payment.iyzico_token,
        payment.iyzico_payment_id,
        payment.iyzico_conversation_id,
        payment.client_applications?.name,
        payment.client_applications?.email,
        payment.client_applications?.phone,
        payment.experts?.name,
        payment.experts?.email,
        payment.status,
        payment.expert_payout_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const professionMatch = professionFilter === "all" || toProfession(payment.experts?.profession) === professionFilter;

      return statusMatch && professionMatch && (!keyword || text.includes(keyword));
    });
  }, [payments, filter, search, professionFilter]);

  const summary = useMemo(() => {
    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const pendingPayments = payments.filter((payment) => payment.status === "pending");
    const failedPayments = payments.filter((payment) => payment.status === "failed");
    const unpaidPayouts = paidPayments.filter(
      (payment) => payment.expert_payout_status !== "paid"
    );
    const paidPayouts = paidPayments.filter(
      (payment) => payment.expert_payout_status === "paid"
    );

    return {
      totalCount: payments.length,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      paidAmount: paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      paidCommission: paidPayments.reduce(
        (sum, payment) => sum + Number(payment.commission_amount || 0),
        0
      ),
      paidExpertAmount: paidPayments.reduce(
        (sum, payment) => sum + Number(payment.expert_amount || 0),
        0
      ),
      pendingAmount: pendingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      ),
      unpaidPayoutAmount: unpaidPayouts.reduce(
        (sum, payment) => sum + Number(payment.expert_amount || 0),
        0
      ),
      paidPayoutAmount: paidPayouts.reduce(
        (sum, payment) => sum + Number(payment.expert_amount || 0),
        0
      ),
    };
  }, [payments]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/payments", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        payments?: Payment[];
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        setError(data.error || "Ödemeler alınamadı.");
        return;
      }

      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch {
      setError("Sunucuya bağlanırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function markPayoutPaid(paymentId: string) {
    const confirmed = window.confirm(
      "Bu uzman payını ödendi olarak işaretlemek istiyor musun?"
    );

    if (!confirmed) return;

    try {
      setPayoutLoadingId(paymentId);

      const response = await fetch("/api/admin/payments/payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        window.alert(data.error || "Uzman ödeme durumu güncellenemedi.");
        return;
      }

      await fetchPayments();
    } catch {
      window.alert("Uzman ödeme işlemi sırasında hata oluştu.");
    } finally {
      setPayoutLoadingId(null);
    }
  }

  async function retryRefund(paymentId: string) {
    if (!window.confirm("Bu ödeme Iyzico üzerinden danışana tam tutarla iade edilsin mi?")) return;
    try {
      setRefundLoadingId(paymentId);
      const response = await fetch("/api/admin/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        window.alert(data.error || "İade yapılamadı.");
      }
      await fetchPayments();
    } catch {
      window.alert("İade sırasında hata oluştu.");
    } finally {
      setRefundLoadingId(null);
    }
  }

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Ödeme Yönetimi
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Danışan ödemelerini, Mindora komisyonunu, uzman paylarını ve uzman ödeme
                durumlarını tek ekrandan takip et.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchPayments()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-pine-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Yükleniyor..." : "Yenile"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Ödenen Toplam" value={formatMoney(summary.paidAmount)} description={`Başarılı ödeme: ${summary.paidCount}`} />
          <SummaryCard title="Mindora Komisyonu" value={formatMoney(summary.paidCommission)} description="Sadece ödenen işlemler" />
          <SummaryCard title="Uzman Payı" value={formatMoney(summary.paidExpertAmount)} description="Toplam uzman hakkı" />
          <SummaryCard title="Uzmana Ödenecek" value={formatMoney(summary.unpaidPayoutAmount)} description="Ödeme bekleyen uzman payı" />
          <SummaryCard title="Bekleyen Ödeme" value={formatMoney(summary.pendingAmount)} description={`Bekleyen işlem: ${summary.pendingCount}`} />
        </section>

        <ProfessionFilter value={professionFilter} onChange={setProfessionFilter} />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {paymentFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-all duration-200 ease-out ${
                filter === item.value
                  ? "border-pine-800 bg-pine-800 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Danışan, uzman, e-posta, ödeme numarası, ödeme linki veya iyzico numarası ara..."
            className="h-12 w-full rounded-lg border border-slate-200/80 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />
        </section>

        {loading ? (
          <StateBox title="Ödemeler yükleniyor" description="Ödeme kayıtları hazırlanıyor." />
        ) : error ? (
          <StateBox tone="error" title="Ödemeler alınamadı" description={error} />
        ) : filteredPayments.length === 0 ? (
          <StateBox
            title="Kayıt bulunamadı"
            description="Bu filtre veya arama için ödeme kaydı bulunmuyor."
          />
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Durum</th>
                    <th className="px-5 py-4">Uzman Ödemesi</th>
                    <th className="px-5 py-4">Danışan</th>
                    <th className="px-5 py-4">Uzman</th>
                    <th className="px-5 py-4">Tutar</th>
                    <th className="px-5 py-4">Komisyon</th>
                    <th className="px-5 py-4">Uzman Payı</th>
                    <th className="px-5 py-4">Tarih</th>
                    <th className="px-5 py-4">Kayıt Bilgisi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="align-top transition-all duration-200 ease-out hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <StatusPill className={getStatusStyle(payment.status)}>
                          {getStatusLabel(payment.status)}
                        </StatusPill>

                        {payment.refund_status === "pending" || payment.refund_status === "failed" ? (
                          <div className="mt-2 max-w-[200px]">
                            <p className="text-xs font-semibold text-rose-700">
                              {payment.refund_status === "failed" ? "İade başarısız" : "İade bekliyor"}
                            </p>
                            {payment.refund_error ? (
                              <p className="mt-1 text-xs text-slate-500">{payment.refund_error}</p>
                            ) : null}
                          </div>
                        ) : null}

                        {payment.booking?.status === "cancelled" ? (
                          <p className="mt-2 text-xs font-medium text-slate-500">
                            {payment.booking.late_cancellation ? "Seans geç iptal edildi" : "Seans iptal edildi"}
                          </p>
                        ) : null}

                        {payment.status === "paid" &&
                        (payment.refund_status === "pending" || payment.refund_status === "failed") ? (
                          <button
                            type="button"
                            disabled={refundLoadingId === payment.id}
                            onClick={() => retryRefund(payment.id)}
                            className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            {refundLoadingId === payment.id ? "İşleniyor..." : "İadeyi tekrar dene"}
                          </button>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <StatusPill className={getPayoutStyle(payment.expert_payout_status)}>
                          {getPayoutLabel(payment.expert_payout_status)}
                        </StatusPill>

                        {payment.expert_payout_paid_at ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {formatDate(payment.expert_payout_paid_at)}
                          </p>
                        ) : null}

                        {payment.payout_eligibility && payment.expert_payout_status !== "paid" ? (
                          <p className="mt-2 max-w-[180px] text-xs font-medium text-slate-500">
                            {
                              {
                                ready: "Seans gerçekleşti, aktarılabilir.",
                                waiting_session: "Seans henüz yapılmadı.",
                                refunded: "İade edildi, aktarılmaz.",
                                refund_pending: "İade süreci açık.",
                                unlinked: "Randevuya bağlı değil; seansı kontrol et.",
                                not_paid: "",
                              }[payment.payout_eligibility]
                            }
                          </p>
                        ) : null}

                        {payment.status === "paid" &&
                        payment.expert_payout_status !== "paid" &&
                        payment.payout_eligibility !== "waiting_session" &&
                        payment.payout_eligibility !== "refund_pending" ? (
                          <button
                            type="button"
                            disabled={payoutLoadingId === payment.id}
                            onClick={() => markPayoutPaid(payment.id)}
                            className="mt-3 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {payoutLoadingId === payment.id ? "İşleniyor..." : "Uzmana Ödendi"}
                          </button>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {safeText(payment.client_applications?.name)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {safeText(payment.client_applications?.email)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {safeText(payment.client_applications?.phone)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {safeText(payment.experts?.name)}
                          {payment.experts ? <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800">{professionLabel(payment.experts.profession)}</span> : null}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {safeText(payment.experts?.email)}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatMoney(payment.amount)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-emerald-700">
                        {formatMoney(payment.commission_amount)}
                        {payment.commission_rate !== null && payment.commission_rate !== undefined ? (
                          <span className="block text-xs font-medium text-slate-400">
                            %{Math.round(Number(payment.commission_rate) * 100)}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-5 py-4 font-semibold text-violet-700">
                        {formatMoney(payment.expert_amount)}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(payment.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-slate-700">Ödeme ID</p>
                        <p className="max-w-[220px] break-all text-xs text-slate-500">
                          {payment.id}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-slate-700">iyzico</p>
                        <p className="max-w-[220px] break-all text-xs text-slate-500">
                          {safeText(payment.iyzico_payment_id)}
                        </p>

                        {payment.payment_page_url ? (
                          <a
                            href={payment.payment_page_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-all duration-200 ease-out hover:bg-indigo-100"
                          >
                            Ödeme Linkini Aç
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200/80 bg-white p-4 text-xs font-semibold text-slate-500 shadow-sm">
          Toplam kayıt: {summary.totalCount} • Başarılı: {summary.paidCount} • Bekleyen:{" "}
          {summary.pendingCount} • Başarısız: {summary.failedCount} • Uzmana ödenecek:{" "}
          {formatMoney(summary.unpaidPayoutAmount)} • Uzmana ödenen:{" "}
          {formatMoney(summary.paidPayoutAmount)}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function StateBox({
  title,
  description,
  tone = "neutral",
}: {
  title: string;
  description: string;
  tone?: "neutral" | "error";
}) {
  const className =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200/80 bg-white text-slate-600";

  return (
    <section className={`rounded-xl border p-8 text-center shadow-sm ${className}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm font-semibold">{description}</p>
    </section>
  );
}
