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

type DashboardActivity = {
  id: string;
  type: "expert" | "client" | "payment" | "review" | string;
  title: string;
  description: string;
  createdAt?: string | null;
  href?: string | null;
};

type DashboardResponse = {
  ok?: boolean;
  stats?: DashboardStats;
  recentActivities?: DashboardActivity[];
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

function normalizeToken(value: unknown) {
  return String(value || "").trim();
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const target = `${name}=`;

  return (
    document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(target))
      ?.slice(target.length) || ""
  );
}

function getStoredAdminToken() {
  if (typeof window === "undefined") return "";

  return normalizeToken(
    window.localStorage.getItem("mindora_admin_token") ||
      window.localStorage.getItem("adminToken") ||
      window.sessionStorage.getItem("mindora_admin_token") ||
      ""
  );
}

function persistAdminToken(token: string) {
  if (typeof window === "undefined" || !token) return;

  window.localStorage.setItem("mindora_admin_token", token);
}

function resolveAdminToken(queryToken: string) {
  const safeQueryToken = normalizeToken(queryToken);

  if (safeQueryToken) {
    persistAdminToken(safeQueryToken);
    return safeQueryToken;
  }

  const cookieToken = normalizeToken(decodeURIComponent(getCookieValue("mindora_admin")));
  if (cookieToken) return cookieToken;

  return getStoredAdminToken();
}

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
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getActivityTypeLabel(type: string) {
  if (type === "expert") return "Uzman";
  if (type === "client") return "Danışan";
  if (type === "payment") return "Ödeme";
  if (type === "review") return "Yorum";

  return "Kayıt";
}

function getActivityClass(type: string) {
  if (type === "expert") return "bg-violet-50 text-violet-700 ring-violet-100";
  if (type === "client") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (type === "payment") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (type === "review") return "bg-amber-50 text-amber-700 ring-amber-100";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function AdminHomeContent() {
  const searchParams = useSearchParams();
  const queryAdminToken = searchParams.get("adminToken") || searchParams.get("token") || "";
  const [adminToken, setAdminToken] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);

  useEffect(() => {
    setAdminToken(resolveAdminToken(queryAdminToken));
  }, [queryAdminToken]);

  const fetchDashboard = useCallback(
    async (mode: "initial" | "refresh" = "refresh", tokenOverride?: string) => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const safeAdminToken = normalizeToken(tokenOverride || adminToken || resolveAdminToken(queryAdminToken));

        const params = new URLSearchParams();
        if (safeAdminToken) params.set("adminToken", safeAdminToken);

        const endpoint = params.toString()
          ? `/api/admin/dashboard?${params.toString()}`
          : "/api/admin/dashboard";

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(safeAdminToken ? { "x-admin-token": safeAdminToken } : {}),
          },
        });

        const data = (await response.json().catch(() => ({}))) as DashboardResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Yönetim verileri alınamadı.");
        }

        if (safeAdminToken) {
          setAdminToken(safeAdminToken);
          persistAdminToken(safeAdminToken);
        }

        setStats(data.stats || emptyStats);
        setActivities(Array.isArray(data.recentActivities) ? data.recentActivities : []);
      } catch (error) {
        setStats(emptyStats);
        setActivities([]);

        const message = error instanceof Error ? error.message : "Yönetim verileri alınamadı.";

        if (message === "Admin erişimi doğrulanamadı.") {
          setNotice(
            "Yönetim oturumu doğrulanamadı. Lütfen yönetim giriş sayfasından tekrar giriş yap."
          );
        } else {
          setNotice(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminToken, queryAdminToken]
  );

  useEffect(() => {
    const token = resolveAdminToken(queryAdminToken);
    setAdminToken(token);
    void fetchDashboard("initial", token);
  }, [fetchDashboard, queryAdminToken]);

  const kpiCards = useMemo(
    () => [
      {
        title: "Bekleyen Uzman",
        value: String(stats.pendingExperts),
        description: "Onay kuyruğundaki başvurular",
        href: "/admin/uzman-basvurulari",
      },
      {
        title: "Bekleyen Yorum",
        value: String(stats.pendingReviews),
        description: `${stats.totalReviews} toplam yorum`,
        href: "/admin/reviews",
      },
      {
        title: "Tamamlanan Seans",
        value: String(stats.completedSessions),
        description: `${stats.totalSessions} toplam seans`,
        href: "/admin/conversations",
      },
      {
        title: "Bu Ay Gelir",
        value: formatMoney(stats.thisMonthRevenue),
        description: `${formatMoney(stats.thisMonthCommission)} komisyon`,
        href: "/admin/payments",
      },
      {
        title: "Aktif Uzman",
        value: String(stats.activeExperts),
        description: `${stats.totalExperts} toplam uzman`,
        href: "/admin/uzman-basvurulari",
      },
      {
        title: "Toplam Danışan",
        value: String(stats.totalClients),
        description: "Başvuru kayıtları",
        href: "/admin/danisan-basvurulari",
      },
    ],
    [stats]
  );

  const visibleActivities = activities.slice(0, 8);

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
                Gösterge Paneli
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Günlük operasyon durumunu, bekleyen işleri ve son hareketleri tek ekrandan takip et.
                Detaylı işlem için sol menüden ilgili bölüme geç.
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((item) => (
            <Link
              key={item.title}
              href={buildAdminUrl(item.href, adminToken)}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <p className="text-sm font-bold text-slate-500">{item.title}</p>
              <p className="mt-2 break-words text-4xl font-black tracking-tight text-slate-950">
                {item.value}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{item.description}</p>
                <span className="text-sm font-black text-indigo-700">Aç →</span>
              </div>
            </Link>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Son Aktiviteler</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Başvuru, ödeme, yorum ve operasyon hareketleri.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                {visibleActivities.length} kayıt
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <ActivitySkeleton />
              ) : visibleActivities.length > 0 ? (
                visibleActivities.map((activity) => {
                  const href = activity.href
                    ? buildAdminUrl(activity.href, adminToken)
                    : "/admin";

                  return (
                    <Link
                      key={activity.id}
                      href={href}
                      className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 no-underline transition hover:border-indigo-200 hover:bg-indigo-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getActivityClass(
                              activity.type
                            )}`}
                          >
                            {getActivityTypeLabel(activity.type)}
                          </span>
                          <p className="text-sm font-black text-slate-950">
                            {activity.title}
                          </p>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {activity.description}
                        </p>
                      </div>

                      <p className="min-w-fit text-xs font-bold text-slate-500">
                        {formatDate(activity.createdAt)}
                      </p>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-black text-slate-600">Henüz aktivite yok</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Yeni başvuru, ödeme veya yorum geldiğinde burada görünecek.
                  </p>
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-slate-950">Finans Özeti</h2>
            <p className="mt-1 text-sm text-slate-500">
              Özet finans görünümü. Detay için Ödemeler ekranına geç.
            </p>

            <div className="mt-5 space-y-3">
              <FinanceLine label="Toplam Gelir" value={formatMoney(stats.totalRevenue)} />
              <FinanceLine label="Bu Ay Gelir" value={formatMoney(stats.thisMonthRevenue)} />
              <FinanceLine label="Bu Ay Komisyon" value={formatMoney(stats.thisMonthCommission)} />
              <FinanceLine label="Bekleyen Uzman Payı" value={formatMoney(stats.pendingExpertPayout)} />
            </div>

            <Link
              href={buildAdminUrl("/admin/payments", adminToken)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline transition hover:bg-slate-800"
            >
              Ödemeleri Aç
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}

function ActivitySkeleton() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-3xl border border-slate-200 bg-slate-50"
        />
      ))}
    </>
  );
}

function FinanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-8">
          <div className="mx-auto max-w-7xl rounded-[1.75rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Gösterge paneli yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminHomeContent />
    </Suspense>
  );
}
