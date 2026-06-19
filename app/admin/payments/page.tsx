"use client";

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
    pending: "bg-amber-50 text-amber-800 ring-amber-100",
    paid: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    failed: "bg-rose-50 text-rose-800 ring-rose-100",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
    refunded: "bg-sky-50 text-sky-800 ring-sky-100",
  };

  return styles[status] || "bg-slate-100 text-slate-700 ring-slate-200";
}

function getPayoutLabel(status: PayoutStatus | null) {
  if (status === "paid") return "Uzmana Ödendi";
  if (status === "scheduled") return "Planlandı";
  if (status === "blocked") return "Blokeli";

  return "Ödenmedi";
}

function getPayoutStyle(status: PayoutStatus | null) {
  if (status === "paid") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (status === "scheduled") return "bg-sky-50 text-sky-800 ring-sky-100";
  if (status === "blocked") return "bg-rose-50 text-rose-800 ring-rose-100";

  return "bg-violet-50 text-violet-800 ring-violet-100";
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
  const [search, setSearch] = useState("");
  const [payoutLoadingId, setPayoutLoadingId] = useState<string | null>(null);

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

      return statusMatch && (!keyword || text.includes(keyword));
    });
  }, [payments, filter, search]);

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

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
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
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {paymentFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition-all duration-200 ${
                filter === item.value
                  ? "bg-slate-950 text-white ring-slate-950"
                  : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Danışan, uzman, e-posta, ödeme numarası, ödeme linki veya iyzico numarası ara..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
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
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
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
                    <tr key={payment.id} className="align-top transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <StatusPill className={getStatusStyle(payment.status)}>
                          {getStatusLabel(payment.status)}
                        </StatusPill>
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

                        {payment.status === "paid" && payment.expert_payout_status !== "paid" ? (
                          <button
                            type="button"
                            disabled={payoutLoadingId === payment.id}
                            onClick={() => markPayoutPaid(payment.id)}
                            className="mt-3 rounded-2xl bg-violet-700 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {payoutLoadingId === payment.id ? "İşleniyor..." : "Uzmana Ödendi"}
                          </button>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">
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
                        <p className="font-black text-slate-950">
                          {safeText(payment.experts?.name)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {safeText(payment.experts?.email)}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-black text-slate-950">
                        {formatMoney(payment.amount)}
                      </td>

                      <td className="px-5 py-4 font-black text-emerald-700">
                        {formatMoney(payment.commission_amount)}
                      </td>

                      <td className="px-5 py-4 font-black text-violet-700">
                        {formatMoney(payment.expert_amount)}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(payment.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-slate-800">Ödeme ID</p>
                        <p className="max-w-[220px] break-all text-xs text-slate-500">
                          {payment.id}
                        </p>

                        <p className="mt-2 text-xs font-black text-slate-800">iyzico</p>
                        <p className="max-w-[220px] break-all text-xs text-slate-500">
                          {safeText(payment.iyzico_payment_id)}
                        </p>

                        {payment.payment_page_url ? (
                          <a
                            href={payment.payment_page_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-500 shadow-sm">
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
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950">
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
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
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
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <section className={`rounded-[2rem] border p-8 text-center shadow-sm ${className}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold">{description}</p>
    </section>
  );
}
