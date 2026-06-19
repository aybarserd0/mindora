"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";

type FinanceStatus = "all" | "paid" | "pending" | "refunded" | "cancelled";

type FinanceStats = {
  totalRevenue: number;
  totalCommission: number;
  totalExpertShare: number;
  thisMonthRevenue: number;
  thisMonthCommission: number;
  thisMonthExpertShare: number;
  pendingAmount: number;
  refundedAmount: number;
  cancelledAmount: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  refundedPayments: number;
  cancelledPayments: number;
};

type FinanceTransaction = {
  id: string;
  clientId?: string | null;
  clientName: string;
  expertId?: string | null;
  expertName: string;
  conversationId?: string | null;
  sessionId?: string | null;
  bookingId?: string | null;
  amount: number;
  commissionAmount: number;
  expertAmount: number;
  currency: string;
  status: string;
  rawStatus?: string | null;
  provider: string;
  providerPaymentId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ExpertFinanceSummary = {
  expertId: string;
  expertName: string;
  paidPaymentCount: number;
  revenue: number;
  commission: number;
  expertShare: number;
};

type FinanceResponse = {
  ok?: boolean;
  stats?: FinanceStats;
  transactions?: FinanceTransaction[];
  expertSummaries?: ExpertFinanceSummary[];
  error?: string;
};

const emptyStats: FinanceStats = {
  totalRevenue: 0,
  totalCommission: 0,
  totalExpertShare: 0,
  thisMonthRevenue: 0,
  thisMonthCommission: 0,
  thisMonthExpertShare: 0,
  pendingAmount: 0,
  refundedAmount: 0,
  cancelledAmount: 0,
  totalPayments: 0,
  paidPayments: 0,
  pendingPayments: 0,
  refundedPayments: 0,
  cancelledPayments: 0,
};

const statusFilters: Array<{ label: string; value: FinanceStatus }> = [
  { label: "Tümü", value: "all" },
  { label: "Ödenen", value: "paid" },
  { label: "Bekleyen", value: "pending" },
  { label: "İade", value: "refunded" },
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
  if (status === "paid") return { label: "Ödendi", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  if (status === "pending") return { label: "Bekliyor", className: "bg-amber-50 text-amber-700 ring-amber-100" };
  if (status === "refunded") return { label: "İade", className: "bg-indigo-50 text-indigo-700 ring-indigo-100" };
  if (status === "cancelled") return { label: "İptal", className: "bg-rose-50 text-rose-700 ring-rose-100" };

  return { label: "Belirsiz", className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function AdminFinanceContent() {
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("adminToken") || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState<FinanceStats>(emptyStats);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [expertSummaries, setExpertSummaries] = useState<ExpertFinanceSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<FinanceStatus>("all");
  const [search, setSearch] = useState("");

  const fetchFinance = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const params = new URLSearchParams();
        if (adminToken) params.set("adminToken", adminToken);

        const response = await fetch(`/api/admin/finance?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(adminToken ? { "x-admin-token": adminToken } : {}),
          },
        });

        const data = (await response.json().catch(() => ({}))) as FinanceResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Finans verileri alınamadı.");
        }

        setStats(data.stats || emptyStats);
        setTransactions(data.transactions || []);
        setExpertSummaries(data.expertSummaries || []);
      } catch (error) {
        setStats(emptyStats);
        setTransactions([]);
        setExpertSummaries([]);
        setNotice(error instanceof Error ? error.message : "Finans verileri alınamadı.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminToken]
  );

  useEffect(() => {
    void fetchFinance("initial");
  }, [fetchFinance]);

  const filteredTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      if (statusFilter !== "all" && transaction.status !== statusFilter) return false;

      const text = [
        transaction.id,
        transaction.clientName,
        transaction.expertName,
        transaction.status,
        transaction.rawStatus,
        transaction.provider,
        transaction.providerPaymentId,
        transaction.amount,
        transaction.commissionAmount,
        transaction.expertAmount,
        formatDate(transaction.createdAt),
      ]
        .join(" ")
        .toLowerCase();

      return !keyword || text.includes(keyword);
    });
  }, [transactions, statusFilter, search]);

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
                Gelir ve Komisyon Yönetimi
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Ödemeleri, Mindora komisyonunu, uzman paylarını, iade ve iptal durumlarını tek ekrandan takip et.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchFinance("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Yenile"}
              </button>
              <Link
                href={buildAdminUrl("/admin", adminToken)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                Yönetim Merkezi
              </Link>
            </div>
          </div>
        </header>

        {notice ? (
          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <p className="text-sm font-black">Finans verileri yüklenemedi</p>
            <p className="mt-1 text-sm font-semibold">{notice}</p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Toplam Gelir" value={formatMoney(stats.totalRevenue)} description={`${stats.paidPayments} başarılı ödeme`} />
          <SummaryCard title="Toplam Komisyon" value={formatMoney(stats.totalCommission)} description="Tahmini Mindora geliri" />
          <SummaryCard title="Uzman Payı" value={formatMoney(stats.totalExpertShare)} description="Tahmini uzman hak edişi" />
          <SummaryCard title="Bekleyen Ödeme" value={formatMoney(stats.pendingAmount)} description={`${stats.pendingPayments} bekleyen işlem`} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Bu Ay Gelir" value={formatMoney(stats.thisMonthRevenue)} description="Bu ay başarılı ödemeler" />
          <SummaryCard title="Bu Ay Komisyon" value={formatMoney(stats.thisMonthCommission)} description="Bu ay tahmini komisyon" />
          <SummaryCard title="Bu Ay Uzman Payı" value={formatMoney(stats.thisMonthExpertShare)} description="Bu ay tahmini hak ediş" />
          <SummaryCard title="İade / İptal" value={formatMoney(stats.refundedAmount + stats.cancelledAmount)} description={`${stats.refundedPayments + stats.cancelledPayments} işlem`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Uzman Bazlı Hak Ediş</h2>
            <p className="mt-1 text-sm text-slate-500">
              Başarılı ödemelere göre en yüksek gelir oluşturan uzmanlar.
            </p>

            <div className="mt-5 space-y-3">
              {expertSummaries.length > 0 ? (
                expertSummaries.slice(0, 8).map((item) => (
                  <div key={item.expertId} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{item.expertName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {item.paidPaymentCount} başarılı ödeme
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black text-slate-950">{formatMoney(item.expertShare)}</p>
                        <p className="text-xs font-semibold text-slate-500">
                          Komisyon: {formatMoney(item.commission)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Hak ediş kaydı yok" description="Başarılı ödeme geldiğinde uzman bazlı özet burada görünür." />
              )}
            </div>
          </article>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Danışan, uzman, ödeme sağlayıcı, tutar veya durum bilgisine göre arayın.
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
              <h2 className="text-xl font-black text-slate-950">Ödeme İşlemleri</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ödeme, komisyon ve uzman payı detayları.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? "Yükleniyor" : `${filteredTransactions.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Finans verileri yükleniyor" description="Ödeme kayıtları hazırlanıyor." />
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} adminToken={adminToken} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Ödeme işlemi bulunamadı"
              description="Yeni ödeme geldiğinde burada tutar, komisyon ve uzman payı bilgileriyle listelenecektir."
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

function TransactionCard({ transaction, adminToken }: { transaction: FinanceTransaction; adminToken: string }) {
  const config = getStatusConfig(transaction.status);

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
              {config.label}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {transaction.provider}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {formatDate(transaction.createdAt)}
            </span>
          </div>

          <h3 className="mt-4 text-base font-black text-slate-950">{transaction.expertName}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{transaction.clientName}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMoney label="Tutar" value={formatMoney(transaction.amount)} />
            <MiniMoney label="Komisyon" value={formatMoney(transaction.commissionAmount)} />
            <MiniMoney label="Uzman Payı" value={formatMoney(transaction.expertAmount)} />
          </div>

          {transaction.providerPaymentId ? (
            <p className="mt-4 text-xs font-semibold text-slate-500">
              Sağlayıcı işlem no: {transaction.providerPaymentId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
          {transaction.conversationId ? (
            <Link
              href={buildAdminUrl(`/admin/conversations/${encodeURIComponent(transaction.conversationId)}`, adminToken)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
            >
              Konuşma
            </Link>
          ) : null}

          <Link
            href={buildAdminUrl("/admin/payments", adminToken)}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
          >
            Ödeme Paneli
          </Link>
        </div>
      </div>
    </article>
  );
}

function MiniMoney({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
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

export default function AdminFinancePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Finans paneli yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminFinanceContent />
    </Suspense>
  );
}
