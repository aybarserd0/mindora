"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";

type PayoutStatus = "all" | "pending" | "processing" | "paid" | "cancelled";

type PayoutStats = {
  totalPayouts: number;
  pendingPayouts: number;
  processingPayouts: number;
  paidPayouts: number;
  cancelledPayouts: number;
  totalPending: number;
  totalProcessing: number;
  totalPaid: number;
  totalCancelled: number;
  totalAvailableBalance: number;
};

type ExpertBalance = {
  expertId: string;
  expertName: string;
  expertTitle: string;
  totalExpertShare: number;
  paidPayoutAmount: number;
  activePayoutAmount: number;
  availableBalance: number;
  paidPaymentCount: number;
  payoutCount: number;
};

type Payout = {
  id: string;
  expertId: string;
  expertName: string;
  expertTitle: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string | null;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PayoutsResponse = {
  ok?: boolean;
  stats?: PayoutStats;
  balances?: ExpertBalance[];
  payouts?: Payout[];
  error?: string;
};

const emptyStats: PayoutStats = {
  totalPayouts: 0,
  pendingPayouts: 0,
  processingPayouts: 0,
  paidPayouts: 0,
  cancelledPayouts: 0,
  totalPending: 0,
  totalProcessing: 0,
  totalPaid: 0,
  totalCancelled: 0,
  totalAvailableBalance: 0,
};

const statusFilters: Array<{ label: string; value: PayoutStatus }> = [
  { label: "Tümü", value: "all" },
  { label: "Bekleyen", value: "pending" },
  { label: "İşlemde", value: "processing" },
  { label: "Ödendi", value: "paid" },
  { label: "İptal", value: "cancelled" },
];

function buildAdminUrl(path: string, adminToken: string) {
  if (!adminToken) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}adminToken=${encodeURIComponent(adminToken)}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusConfig(status: string) {
  if (status === "pending") return { label: "Bekleyen", className: "bg-amber-50 text-amber-700 ring-amber-100" };
  if (status === "processing") return { label: "İşlemde", className: "bg-indigo-50 text-indigo-700 ring-indigo-100" };
  if (status === "paid") return { label: "Ödendi", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  if (status === "cancelled") return { label: "İptal", className: "bg-rose-50 text-rose-700 ring-rose-100" };

  return { label: "Belirsiz", className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function AdminPayoutsContent() {
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("adminToken") || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState<PayoutStats>(emptyStats);
  const [balances, setBalances] = useState<ExpertBalance[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const fetchPayouts = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const params = new URLSearchParams();
        if (adminToken) params.set("adminToken", adminToken);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const response = await fetch(`/api/admin/payouts?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(adminToken ? { "x-admin-token": adminToken } : {}),
          },
        });

        const data = (await response.json().catch(() => ({}))) as PayoutsResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Uzman ödeme verileri alınamadı.");
        }

        setStats(data.stats || emptyStats);
        setBalances(data.balances || []);
        setPayouts(data.payouts || []);
      } catch (error) {
        setStats(emptyStats);
        setBalances([]);
        setPayouts([]);
        setNotice(error instanceof Error ? error.message : "Uzman ödeme verileri alınamadı.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminToken, statusFilter]
  );

  useEffect(() => {
    void fetchPayouts("initial");
  }, [fetchPayouts]);

  const filteredPayouts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return payouts.filter((payout) => {
      const text = [
        payout.id,
        payout.expertName,
        payout.expertTitle,
        payout.amount,
        payout.status,
        payout.note,
        payout.createdBy,
        formatDate(payout.createdAt),
      ]
        .join(" ")
        .toLowerCase();

      return !keyword || text.includes(keyword);
    });
  }, [payouts, search]);

  const selectedBalance = balances.find((item) => item.expertId === selectedExpertId) || null;

  async function createPayout() {
    if (!selectedExpertId) {
      setNotice("Ödeme kaydı oluşturmak için uzman seçmelisin.");
      return;
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setNotice("Ödeme tutarı geçerli ve sıfırdan büyük olmalıdır.");
      return;
    }

    try {
      setActionLoading("create");
      setNotice("");

      const response = await fetch("/api/admin/payouts", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({
          expertId: selectedExpertId,
          amount: Number(amount),
          note,
          createdBy: "admin",
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Ödeme kaydı oluşturulamadı.");
      }

      setAmount("");
      setNote("");
      setNotice(data.message || "Uzman ödeme kaydı oluşturuldu.");
      await fetchPayouts("refresh");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ödeme kaydı oluşturulamadı.");
    } finally {
      setActionLoading("");
    }
  }

  async function updatePayoutStatus(payoutId: string, status: "pending" | "processing" | "paid" | "cancelled") {
    try {
      setActionLoading(`${payoutId}:${status}`);
      setNotice("");

      const response = await fetch("/api/admin/payouts", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({
          payoutId,
          status,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Ödeme durumu güncellenemedi.");
      }

      setNotice(data.message || "Ödeme durumu güncellendi.");
      await fetchPayouts("refresh");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ödeme durumu güncellenemedi.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Uzman Ödemeleri
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Uzman hak edişlerini takip et, ödeme kaydı oluştur ve ödeme durumlarını yönet.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchPayouts("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Yenile"}
              </button>
              <Link
                href={buildAdminUrl("/admin/finance", adminToken)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                Finans Yönetimi
              </Link>
            </div>
          </div>
        </header>

        {notice ? (
          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <p className="text-sm font-black">Bilgilendirme</p>
            <p className="mt-1 text-sm font-semibold">{notice}</p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Aktarılabilir Bakiye" value={formatMoney(stats.totalAvailableBalance)} description="Tahmini kalan uzman hak edişi" />
          <SummaryCard title="Bekleyen Ödeme" value={formatMoney(stats.totalPending)} description={`${stats.pendingPayouts} kayıt`} />
          <SummaryCard title="İşlemde" value={formatMoney(stats.totalProcessing)} description={`${stats.processingPayouts} kayıt`} />
          <SummaryCard title="Ödenen" value={formatMoney(stats.totalPaid)} description={`${stats.paidPayouts} tamamlandı`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Yeni Uzman Ödemesi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Uzman bakiyesine göre manuel ödeme kaydı oluştur.
            </p>

            <div className="mt-5 grid gap-4">
              <label>
                <span className="mb-2 block text-sm font-black text-slate-700">Uzman</span>
                <select
                  value={selectedExpertId}
                  onChange={(event) => {
                    setSelectedExpertId(event.target.value);
                    const balance = balances.find((item) => item.expertId === event.target.value);
                    setAmount(balance?.availableBalance ? String(Math.round(balance.availableBalance)) : "");
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Uzman seç</option>
                  {balances.map((balance) => (
                    <option key={balance.expertId} value={balance.expertId}>
                      {balance.expertName} — {formatMoney(balance.availableBalance)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-slate-700">Tutar</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Örn. 3500"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-slate-700">Not</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  placeholder="Örn. Haziran ayı uzman ödemesi"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              {selectedBalance ? (
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-black text-slate-800">{selectedBalance.expertName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Aktarılabilir bakiye: <b>{formatMoney(selectedBalance.availableBalance)}</b>
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void createPayout()}
                disabled={actionLoading === "create" || !selectedExpertId || !amount || Number(amount) <= 0}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "create" ? "Oluşturuluyor..." : "Ödeme Kaydı Oluştur"}
              </button>
            </div>
          </article>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Uzman, tutar, not veya ödeme durumuna göre arama yap.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ödeme ara..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-80"
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {statusFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    statusFilter === item.value
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Uzman Ödeme Geçmişi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Oluşturulan ödeme kayıtları ve durum yönetimi.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? "Yükleniyor" : `${filteredPayouts.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Ödemeler yükleniyor" description="Uzman ödeme kayıtları hazırlanıyor." />
          ) : filteredPayouts.length > 0 ? (
            <div className="space-y-4">
              {filteredPayouts.map((payout) => (
                <PayoutCard
                  key={payout.id}
                  payout={payout}
                  actionLoading={actionLoading}
                  onStatusChange={updatePayoutStatus}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Ödeme kaydı bulunamadı"
              description="Yeni uzman ödeme kaydı oluşturduğunuzda burada listelenecektir."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function PayoutCard({
  payout,
  actionLoading,
  onStatusChange,
}: {
  payout: Payout;
  actionLoading: string;
  onStatusChange: (payoutId: string, status: "pending" | "processing" | "paid" | "cancelled") => Promise<void>;
}) {
  const config = getStatusConfig(payout.status);

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
              {config.label}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {formatDate(payout.createdAt)}
            </span>
            {payout.paidAt ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                Ödendi: {formatDate(payout.paidAt)}
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-base font-black text-slate-950">{payout.expertName}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{payout.expertTitle}</p>

          <p className="mt-4 text-3xl font-black text-slate-950">{formatMoney(payout.amount)}</p>

          {payout.note ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{payout.note}</p>
          ) : null}

          <p className="mt-3 text-xs font-semibold text-slate-400">Oluşturan: {payout.createdBy || "admin"}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
          {payout.status !== "processing" ? (
            <ActionButton
              label="İşlemde"
              loading={actionLoading === `${payout.id}:processing`}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => onStatusChange(payout.id, "processing")}
            />
          ) : null}

          {payout.status !== "paid" ? (
            <ActionButton
              label="Ödendi"
              loading={actionLoading === `${payout.id}:paid`}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onStatusChange(payout.id, "paid")}
            />
          ) : null}

          {payout.status !== "cancelled" ? (
            <ActionButton
              label="İptal"
              loading={actionLoading === `${payout.id}:cancelled`}
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => onStatusChange(payout.id, "cancelled")}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  label,
  loading,
  className,
  onClick,
}: {
  label: string;
  loading: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? "İşleniyor..." : label}
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Uzman ödemeleri yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminPayoutsContent />
    </Suspense>
  );
}
