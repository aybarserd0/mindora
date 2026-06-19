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

type DashboardResponse = {
  ok?: boolean;
  stats?: DashboardStats;
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

const managementLinks = [
  {
    title: "Uzman Başvuruları",
    description: "Uzmanları incele, onayla veya pasife al.",
    href: "/admin/uzman-basvurulari",
    group: "Başvuru",
  },
  {
    title: "Danışan Başvuruları",
    description: "Danışan eşleştirme ve başvuru akışını yönet.",
    href: "/admin/danisan-basvurulari",
    group: "Başvuru",
  },
  {
    title: "Ödeme Yönetimi",
    description: "Ödeme kayıtları, komisyon ve uzman payı.",
    href: "/admin/payments",
    group: "Finans",
  },
  {
    title: "Finans Özeti",
    description: "Gelir, komisyon ve uzman hak ediş özeti.",
    href: "/admin/finance",
    group: "Finans",
  },
  {
    title: "Uzman Ödemeleri",
    description: "Uzmanlara yapılacak ödeme kayıtları.",
    href: "/admin/payouts",
    group: "Finans",
  },
  {
    title: "Sohbet Yönetimi",
    description: "Konuşmalar, ödeme kilidi ve test linkleri.",
    href: "/admin/conversations",
    group: "Operasyon",
  },
  {
    title: "Yorum Moderasyonu",
    description: "Yorumları onayla, reddet veya gizle.",
    href: "/admin/reviews",
    group: "Güven",
  },
  {
    title: "Raporlar",
    description: "Güvenlik ve sorun bildirimlerini incele.",
    href: "/admin/reports",
    group: "Güven",
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

function AdminHomeContent() {
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("adminToken") || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);

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
          throw new Error(data.error || "Yönetim verileri alınamadı.");
        }

        setStats(data.stats || emptyStats);
      } catch (error) {
        setStats(emptyStats);
        setNotice(error instanceof Error ? error.message : "Yönetim verileri alınamadı.");
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

  const priorityItems = useMemo(
    () => [
      {
        label: "Bekleyen Uzman",
        value: stats.pendingExperts,
        href: "/admin/uzman-basvurulari",
      },
      {
        label: "Bekleyen Yorum",
        value: stats.pendingReviews,
        href: "/admin/reviews",
      },
      {
        label: "Tamamlanan Seans",
        value: stats.completedSessions,
        href: "/admin/conversations",
      },
    ],
    [stats]
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Yönetim Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Yönetim Merkezi
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Tüm admin işlemlerine tek ekrandan ulaş. Karmaşık alt menü yok; önce işlem
                alanını seç, sonra ilgili sayfada detayları yönet.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchDashboard("refresh")}
              disabled={loading || refreshing}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading || refreshing ? "Yükleniyor..." : "Verileri Yenile"}
            </button>
          </div>
        </header>

        {notice ? (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          {priorityItems.map((item) => (
            <Link
              key={item.label}
              href={buildAdminUrl(item.href, adminToken)}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <p className="text-sm font-bold text-slate-500">{item.label}</p>
              <p className="mt-2 text-4xl font-black text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm font-black text-indigo-700">İncele →</p>
            </Link>
          ))}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-950">İşlem Alanları</h2>
            <p className="mt-1 text-sm text-slate-500">
              Günlük yönetimde kullanacağın tüm ekranlar burada.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {managementLinks.map((link) => (
              <Link
                key={link.href}
                href={buildAdminUrl(link.href, adminToken)}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    {link.group}
                  </span>
                  <span className="text-sm font-black text-indigo-700 transition group-hover:translate-x-0.5">
                    Aç →
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-950">{link.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Aktif Uzman" value={String(stats.activeExperts)} description={`${stats.totalExperts} toplam uzman`} />
          <SummaryCard title="Toplam Danışan" value={String(stats.totalClients)} description="Başvuru kayıtları" />
          <SummaryCard title="Bu Ay Gelir" value={formatMoney(stats.thisMonthRevenue)} description="Başarılı ödemeler" />
          <SummaryCard title="Toplam Gelir" value={formatMoney(stats.totalRevenue)} description="Tüm başarılı ödemeler" />
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
      <p className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-8">
          <div className="mx-auto max-w-7xl rounded-[1.75rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Yönetim merkezi yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminHomeContent />
    </Suspense>
  );
}
