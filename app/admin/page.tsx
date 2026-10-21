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
  stats?: Partial<DashboardStats>;
  recentActivities?: DashboardActivity[];
  error?: string;
};

type CardTone = "indigo" | "emerald" | "amber" | "sky" | "violet" | "slate";

type KpiCard = {
  title: string;
  value: string;
  description: string;
  href: string;
  tone: CardTone;
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

const ADMIN_TOKEN_KEYS = ["mindora_admin_token", "adminToken"] as const;

function normalizeToken(value: unknown) {
  return String(value || "").trim();
}

function toSafeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function mergeStats(stats?: Partial<DashboardStats>): DashboardStats {
  return {
    totalExperts: toSafeNumber(stats?.totalExperts),
    activeExperts: toSafeNumber(stats?.activeExperts),
    pendingExperts: toSafeNumber(stats?.pendingExperts),
    totalClients: toSafeNumber(stats?.totalClients),
    totalSessions: toSafeNumber(stats?.totalSessions),
    completedSessions: toSafeNumber(stats?.completedSessions),
    pendingReviews: toSafeNumber(stats?.pendingReviews),
    totalReviews: toSafeNumber(stats?.totalReviews),
    totalRevenue: toSafeNumber(stats?.totalRevenue),
    thisMonthRevenue: toSafeNumber(stats?.thisMonthRevenue),
    thisMonthCommission: toSafeNumber(stats?.thisMonthCommission),
    pendingExpertPayout: toSafeNumber(stats?.pendingExpertPayout),
  };
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const target = `${name}=`;
  const rawValue = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(target))
    ?.slice(target.length);

  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function getStoredAdminToken() {
  if (typeof window === "undefined") return "";

  for (const key of ADMIN_TOKEN_KEYS) {
    const localToken = normalizeToken(window.localStorage.getItem(key));
    if (localToken) return localToken;

    const sessionToken = normalizeToken(window.sessionStorage.getItem(key));
    if (sessionToken) return sessionToken;
  }

  return "";
}

function persistAdminToken(token: string) {
  const safeToken = normalizeToken(token);
  if (typeof window === "undefined" || !safeToken) return;

  window.localStorage.setItem("mindora_admin_token", safeToken);
}

function resolveAdminToken(queryToken: string) {
  const safeQueryToken = normalizeToken(queryToken);

  if (safeQueryToken) {
    persistAdminToken(safeQueryToken);
    return safeQueryToken;
  }

  const cookieToken = normalizeToken(getCookieValue("mindora_admin"));
  if (cookieToken) return cookieToken;

  return getStoredAdminToken();
}

function buildAdminUrl(path: string, adminToken: string) {
  const safeToken = normalizeToken(adminToken);
  if (!safeToken) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}adminToken=${encodeURIComponent(safeToken)}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(toSafeNumber(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(toSafeNumber(value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "percent",
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
  if (type === "expert") return "border border-violet-200 bg-violet-50 text-violet-700";
  if (type === "client") return "border border-sky-200 bg-sky-50 text-sky-700";
  if (type === "payment") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "review") return "border border-amber-200 bg-amber-50 text-amber-700";

  return "border border-slate-200 bg-slate-100 text-slate-700";
}

function getKpiToneClass(tone: CardTone) {
  const classes: Record<CardTone, string> = {
    indigo: "hover:border-indigo-200",
    emerald: "hover:border-emerald-200",
    amber: "hover:border-amber-200",
    sky: "hover:border-sky-200",
    violet: "hover:border-violet-200",
    slate: "hover:border-slate-300",
  };

  return classes[tone];
}

function AdminHomeContent() {
  const searchParams = useSearchParams();
  const queryAdminToken = searchParams.get("adminToken") || searchParams.get("token") || "";

  const [adminToken, setAdminToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);

  const fetchDashboard = useCallback(
    async (mode: "initial" | "refresh" = "refresh", tokenOverride?: string) => {
      const safeAdminToken = normalizeToken(tokenOverride || adminToken || resolveAdminToken(queryAdminToken));
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);

      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const params = new URLSearchParams();
        if (safeAdminToken) params.set("adminToken", safeAdminToken);

        const endpoint = params.toString()
          ? `/api/admin/dashboard?${params.toString()}`
          : "/api/admin/dashboard";

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
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

        setStats(mergeStats(data.stats));
        setActivities(Array.isArray(data.recentActivities) ? data.recentActivities : []);
        setLastUpdated(new Date().toISOString());
      } catch (error) {
        setStats(emptyStats);
        setActivities([]);

        const message = error instanceof Error ? error.message : "Yönetim verileri alınamadı.";

        if (message === "Admin erişimi doğrulanamadı.") {
          setNotice("Yönetim oturumu doğrulanamadı. Lütfen yönetim giriş sayfasından tekrar giriş yap.");
        } else if (error instanceof DOMException && error.name === "AbortError") {
          setNotice("Yönetim verileri zamanında alınamadı. Bağlantıyı kontrol edip tekrar dene.");
        } else {
          setNotice(message);
        }
      } finally {
        window.clearTimeout(timeout);
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

  const completionRate = stats.totalSessions > 0 ? stats.completedSessions / stats.totalSessions : 0;
  const activeExpertRate = stats.totalExperts > 0 ? stats.activeExperts / stats.totalExperts : 0;

  const kpiCards = useMemo<KpiCard[]>(
    () => [
      {
        title: "Bekleyen Uzman",
        value: formatNumber(stats.pendingExperts),
        description: "Onay kuyruğundaki başvurular",
        href: "/admin/uzman-basvurulari",
        tone: "violet",
      },
      {
        title: "Bekleyen Yorum",
        value: formatNumber(stats.pendingReviews),
        description: `${formatNumber(stats.totalReviews)} toplam yorum`,
        href: "/admin/reviews",
        tone: "amber",
      },
      {
        title: "Tamamlanan Seans",
        value: formatNumber(stats.completedSessions),
        description: `${formatNumber(stats.totalSessions)} toplam seans`,
        href: "/admin/conversations",
        tone: "indigo",
      },
      {
        title: "Bu Ay Gelir",
        value: formatMoney(stats.thisMonthRevenue),
        description: `${formatMoney(stats.thisMonthCommission)} komisyon`,
        href: "/admin/payments",
        tone: "emerald",
      },
      {
        title: "Aktif Uzman",
        value: formatNumber(stats.activeExperts),
        description: `${formatNumber(stats.totalExperts)} toplam uzman`,
        href: "/admin/uzman-basvurulari",
        tone: "sky",
      },
      {
        title: "Toplam Danışan",
        value: formatNumber(stats.totalClients),
        description: "Başvuru ve danışan kayıtları",
        href: "/admin/danisan-basvurulari",
        tone: "slate",
      },
    ],
    [stats]
  );

  const visibleActivities = activities.slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.45fr_0.55fr]">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <p className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Mindora Yönetim Paneli
                </p>
                <p className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Operasyon merkezi
                </p>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Gösterge Paneli
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Başvuruları, seansları, ödemeleri, yorumları ve son operasyon hareketlerini tek ekrandan takip et.
                C12 Analytics sayfası ile detaylı büyüme ve gelir analizine geçebilirsin.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => void fetchDashboard("refresh")}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center rounded-lg bg-pine-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading || refreshing ? "Yükleniyor..." : "Verileri Yenile"}
                </button>

                <Link
                  href={buildAdminUrl("/admin/analytics", adminToken)}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-indigo-700"
                >
                  Analytics'i Aç →
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-200/80 bg-pine-800 p-6 text-white lg:border-l lg:border-t-0 md:p-8">
              <p className="text-xs font-semibold text-slate-400">
                Anlık durum
              </p>

              <div className="mt-5 space-y-4">
                <StatusLine label="Seans Tamamlama" value={formatPercent(completionRate)} />
                <StatusLine label="Aktif Uzman Oranı" value={formatPercent(activeExpertRate)} />
                <StatusLine label="Bu Ay Komisyon" value={formatMoney(stats.thisMonthCommission)} />
              </div>

              <p className="mt-5 text-xs font-semibold text-slate-400">
                Son güncelleme: {lastUpdated ? formatDate(lastUpdated) : loading ? "Yükleniyor..." : "-"}
              </p>
            </div>
          </div>
        </header>

        {notice ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <KpiSkeleton />
          ) : (
            kpiCards.map((item, index) => (
              <Link
                key={item.title}
                href={buildAdminUrl(item.href, adminToken)}
                className={`animate-fade-in-up rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 ease-out ${getKpiToneClass(
                  item.tone
                )}`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className="text-sm font-semibold text-slate-500">{item.title}</p>
                <p className="mt-2 break-words text-4xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{item.description}</p>
                  <span className="text-sm font-semibold text-indigo-700">Aç →</span>
                </div>
              </Link>
            ))
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Son Aktiviteler</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Başvuru, ödeme, yorum ve operasyon hareketleri.
                </p>
              </div>

              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {visibleActivities.length} kayıt
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <ActivitySkeleton />
              ) : visibleActivities.length > 0 ? (
                visibleActivities.map((activity) => {
                  const href = activity.href ? buildAdminUrl(activity.href, adminToken) : "/admin";

                  return (
                    <Link
                      key={activity.id}
                      href={href}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 no-underline transition-all duration-200 ease-out hover:border-indigo-200 hover:bg-indigo-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getActivityClass(activity.type)}`}>
                            {getActivityTypeLabel(activity.type)}
                          </span>
                          <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-slate-500">
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
                <EmptyState
                  title="Henüz aktivite yok"
                  description="Yeni başvuru, ödeme veya yorum geldiğinde burada görünecek."
                />
              )}
            </div>
          </article>

          <div className="space-y-5">
            <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold text-slate-900">Finans Özeti</h2>
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
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-pine-800 px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 ease-out hover:bg-pine-900"
              >
                Ödemeleri Aç
              </Link>
            </article>

            <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold text-slate-900">C12 Analytics Hazır</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Günlük başvuru, ödeme, aylık gelir, komisyon ve dönüşüm metrikleri için ayrı analytics ekranına geçiş hazırlandı.
              </p>

              <Link
                href={buildAdminUrl("/admin/analytics", adminToken)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 ease-out hover:bg-indigo-700"
              >
                Analytics Dashboard'a Git
              </Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="h-40 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
      ))}
    </>
  );
}

function ActivitySkeleton() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-xl border border-slate-200/80 bg-slate-50" />
      ))}
    </>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function FinanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-6 md:py-8">
          <div className="mx-auto max-w-7xl rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-500">Gösterge paneli yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminHomeContent />
    </Suspense>
  );
}
