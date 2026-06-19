"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type DashboardStats = {
  totalExperts: number;
  activeExperts: number;
  pendingExperts: number;
  totalClients: number;
  totalSessions: number;
  completedSessions: number;
  pendingReviews: number;
  totalReviews: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  thisMonthCommission: number;
  pendingExpertPayout: number;
};

type RecentActivity = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt?: string | null;
  href: string;
};

type QuickLink = {
  label: string;
  href: string;
};

type DashboardResponse = {
  ok?: boolean;
  stats?: DashboardStats;
  recentActivities?: RecentActivity[];
  quickLinks?: QuickLink[];
  error?: string;
};

const emptyStats: DashboardStats = {
  totalExperts: 0,
  activeExperts: 0,
  pendingExperts: 0,
  totalClients: 0,
  totalSessions: 0,
  completedSessions: 0,
  pendingReviews: 0,
  totalReviews: 0,
  totalRevenue: 0,
  thisMonthRevenue: 0,
  thisMonthCommission: 0,
  pendingExpertPayout: 0,
};

const fallbackQuickLinks: QuickLink[] = [
  { label: "Uzman Başvuruları", href: "/admin/uzman-basvurulari" },
  { label: "Danışan Başvuruları", href: "/admin/danisan-basvurulari" },
  { label: "Ödeme Yönetimi", href: "/admin/payments" },
  { label: "Sohbet Yönetimi", href: "/admin/conversations" },
  { label: "Yorum Moderasyonu", href: "/admin/reviews" },
];

const primaryActions = [
  {
    label: "Ana Operasyon Paneli",
    description: "Günlük admin işlemlerine buradan başla.",
    href: "/admin/uzman-basvurulari",
  },
  {
    label: "Danışan Başvuruları",
    description: "Eşleşme, durum ve danışan akışını yönet.",
    href: "/admin/danisan-basvurulari",
  },
  {
    label: "Ödeme Yönetimi",
    description: "Ödeme, komisyon ve uzman paylarını kontrol et.",
    href: "/admin/payments",
  },
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getActivityTone(type: string) {
  if (type === "payment") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (type === "review") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (type === "expert") return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  if (type === "client") return "bg-sky-50 text-sky-700 ring-sky-100";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("adminToken") || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(fallbackQuickLinks);

  const fetchDashboard = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const params = new URLSearchParams();
        if (adminToken) params.set("adminToken", adminToken);

        const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(adminToken ? { "x-admin-token": adminToken } : {}),
          },
        });

        const data = (await response.json().catch(() => ({}))) as DashboardResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Dashboard verileri alınamadı.");
        }

        setStats(data.stats || emptyStats);
        setRecentActivities(data.recentActivities || []);
        setQuickLinks(data.quickLinks?.length ? data.quickLinks : fallbackQuickLinks);
      } catch (error) {
        setStats(emptyStats);
        setRecentActivities([]);
        setQuickLinks(fallbackQuickLinks);
        setNotice(error instanceof Error ? error.message : "Dashboard verileri alınamadı.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminToken]
  );

  useEffect(() => {
    void fetchDashboard("initial");
  }, [fetchDashboard]);

  const healthItems = useMemo(
    () => [
      {
        label: "Uzman Onay Kuyruğu",
        value: stats.pendingExperts,
        description: stats.pendingExperts > 0 ? "İncelenmesi gereken başvuru var" : "Kuyruk temiz",
        href: "/admin/uzman-basvurulari",
      },
      {
        label: "Yorum Moderasyonu",
        value: stats.pendingReviews,
        description: stats.pendingReviews > 0 ? "Bekleyen yorum var" : "Bekleyen yorum yok",
        href: "/admin/reviews",
      },
      {
        label: "Tamamlanan Seans",
        value: stats.completedSessions,
        description: `${stats.totalSessions} toplam seans içinde`,
        href: "/admin/conversations",
      },
    ],
    [stats]
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Admin
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Operasyon Merkezi
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Günlük operasyon için eski admin akışını ana merkez olarak kullan; özet, gelir,
                seans ve yorum metriklerini bu ekrandan takip et.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchDashboard("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Yenile"}
              </button>
              <Link
                href={buildAdminUrl("/admin/uzman-basvurulari", adminToken)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                Ana Operasyon Paneli
              </Link>
            </div>
          </div>
        </header>

        {notice ? (
          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <p className="text-sm font-black">Dashboard yüklenemedi</p>
            <p className="mt-1 text-sm font-semibold">{notice}</p>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          {primaryActions.map((action) => (
            <Link
              key={action.href}
              href={buildAdminUrl(action.href, adminToken)}
              className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
            >
              <p className="text-lg font-black text-slate-950 group-hover:text-indigo-700">
                {action.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
              <span className="mt-5 inline-flex text-sm font-black text-indigo-700">
                Aç →
              </span>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Toplam Uzman" value={String(stats.totalExperts)} description={`${stats.activeExperts} aktif uzman`} />
          <SummaryCard title="Bekleyen Başvuru" value={String(stats.pendingExperts)} description="Uzman onay kuyruğu" />
          <SummaryCard title="Toplam Danışan" value={String(stats.totalClients)} description="Danışan başvuru kayıtları" />
          <SummaryCard title="Bekleyen Yorum" value={String(stats.pendingReviews)} description={`${stats.totalReviews} toplam yorum`} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Bu Ay Gelir" value={formatMoney(stats.thisMonthRevenue)} description="Başarılı ödemeler" />
          <SummaryCard title="Bu Ay Komisyon" value={formatMoney(stats.thisMonthCommission)} description="Tahmini %30 komisyon" />
          <SummaryCard title="Uzman Payı" value={formatMoney(stats.pendingExpertPayout)} description="Tahmini aktarılacak toplam" />
          <SummaryCard title="Toplam Gelir" value={formatMoney(stats.totalRevenue)} description="Tüm başarılı ödemeler" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Operasyon Sağlığı</h2>
            <p className="mt-1 text-sm text-slate-500">Hızlı takip edilmesi gereken ana kuyruklar.</p>

            <div className="mt-5 space-y-3">
              {healthItems.map((item) => (
                <Link
                  key={item.label}
                  href={buildAdminUrl(item.href, adminToken)}
                  className="block rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 hover:ring-indigo-200"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-800">{item.label}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{item.description}</p>
                    </div>
                    <span className="rounded-2xl bg-white px-4 py-2 text-lg font-black text-slate-950 ring-1 ring-slate-200">
                      {item.value}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Hızlı İşlemler</h2>
                <p className="mt-1 text-sm text-slate-500">Sık kullanılan admin ekranları.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {quickLinks.length} bağlantı
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={buildAdminUrl(link.href, adminToken)}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Son Aktiviteler</h2>
              <p className="mt-1 text-sm text-slate-500">
                Başvuru, ödeme, yorum ve operasyon hareketleri.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? "Yükleniyor" : `${recentActivities.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Dashboard yükleniyor" description="Operasyon verileri hazırlanıyor." />
          ) : recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={buildAdminUrl(activity.href, adminToken)}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getActivityTone(activity.type)}`}>
                        {activity.type}
                      </span>
                      <p className="text-sm font-black text-slate-900">{activity.title}</p>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-500">{activity.description}</p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-slate-500">
                    {formatDate(activity.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aktivite bulunamadı"
              description="Yeni başvuru, ödeme veya yorum geldiğinde burada listelenecektir."
            />
          )}
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
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
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

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Admin dashboard yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
