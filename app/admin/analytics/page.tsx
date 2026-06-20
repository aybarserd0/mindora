"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AnalyticsOverview = {
  totalRevenue: number;
  totalCommission: number;
  totalExperts: number;
  totalClients: number;
  totalSessions: number;
};

type ChartPoint = {
  label: string;
  value: number;
};

type AnalyticsConversion = {
  totalApplications: number;
  matchedApplications: number;
  paidPayments: number;
  completedSessions: number;
  approvedReviews: number;
  applicationToMatchRate: number;
  matchToPaymentRate: number;
  paymentToSessionRate: number;
  sessionToReviewRate: number;
};

type ExpertPerformanceRow = {
  expertId: string;
  expertName: string;
  sessions: number;
  completedSessions: number;
  revenue: number;
  commission: number;
  averageRating: number;
  reviewCount: number;
};

type AnalyticsResponse = {
  ok?: boolean;
  overview?: Partial<AnalyticsOverview>;
  charts?: {
    applications?: ChartPoint[];
    payments?: ChartPoint[];
    revenueByMonth?: ChartPoint[];
    commissionByMonth?: ChartPoint[];
  };
  conversion?: Partial<AnalyticsConversion>;
  expertPerformance?: ExpertPerformanceRow[];
  error?: string;
};

const emptyOverview: AnalyticsOverview = {
  totalRevenue: 0,
  totalCommission: 0,
  totalExperts: 0,
  totalClients: 0,
  totalSessions: 0,
};

const emptyConversion: AnalyticsConversion = {
  totalApplications: 0,
  matchedApplications: 0,
  paidPayments: 0,
  completedSessions: 0,
  approvedReviews: 0,
  applicationToMatchRate: 0,
  matchToPaymentRate: 0,
  paymentToSessionRate: 0,
  sessionToReviewRate: 0,
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  return `%${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0)}`;
}

function formatRating(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getChartMax(points: ChartPoint[]) {
  const max = Math.max(...points.map((point) => Number(point.value) || 0), 0);
  return max > 0 ? max : 1;
}

function getBestExpertBadge(index: number, row: ExpertPerformanceRow) {
  if (index === 0 && (row.revenue > 0 || row.completedSessions > 0 || row.averageRating > 0)) {
    return "En İyi";
  }

  if (row.averageRating >= 4.8 && row.reviewCount >= 3) {
    return "Yüksek Puan";
  }

  if (row.completedSessions >= 10) {
    return "Aktif";
  }

  return "";
}

function getFunnelHealth(rate: number) {
  if (rate >= 70) return "Güçlü";
  if (rate >= 40) return "Orta";
  if (rate > 0) return "İyileştir";
  return "Veri Yok";
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const queryAdminToken = searchParams.get("adminToken") || searchParams.get("token") || "";

  const [adminToken, setAdminToken] = useState("");
  const [overview, setOverview] = useState<AnalyticsOverview>(emptyOverview);
  const [conversion, setConversion] = useState<AnalyticsConversion>(emptyConversion);
  const [applications, setApplications] = useState<ChartPoint[]>([]);
  const [payments, setPayments] = useState<ChartPoint[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<ChartPoint[]>([]);
  const [commissionByMonth, setCommissionByMonth] = useState<ChartPoint[]>([]);
  const [expertPerformance, setExpertPerformance] = useState<ExpertPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const fetchAnalytics = useCallback(
    async (mode: "initial" | "refresh" = "refresh", tokenOverride?: string) => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const safeAdminToken = normalizeToken(
          tokenOverride || adminToken || resolveAdminToken(queryAdminToken)
        );

        const params = new URLSearchParams();
        if (safeAdminToken) params.set("adminToken", safeAdminToken);

        const endpoint = params.toString()
          ? `/api/admin/analytics?${params.toString()}`
          : "/api/admin/analytics";

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(safeAdminToken ? { "x-admin-token": safeAdminToken } : {}),
          },
        });

        const data = (await response.json().catch(() => ({}))) as AnalyticsResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Analytics verileri alınamadı.");
        }

        if (safeAdminToken) {
          setAdminToken(safeAdminToken);
          persistAdminToken(safeAdminToken);
        }

        setOverview({
          ...emptyOverview,
          ...(data.overview || {}),
        });
        setConversion({
          ...emptyConversion,
          ...(data.conversion || {}),
        });

        setApplications(Array.isArray(data.charts?.applications) ? data.charts.applications : []);
        setPayments(Array.isArray(data.charts?.payments) ? data.charts.payments : []);
        setRevenueByMonth(
          Array.isArray(data.charts?.revenueByMonth) ? data.charts.revenueByMonth : []
        );
        setCommissionByMonth(
          Array.isArray(data.charts?.commissionByMonth) ? data.charts.commissionByMonth : []
        );
        setExpertPerformance(
          Array.isArray(data.expertPerformance) ? data.expertPerformance : []
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Analytics verileri alınamadı.";
        setNotice(message);
        setOverview(emptyOverview);
        setConversion(emptyConversion);
        setApplications([]);
        setPayments([]);
        setRevenueByMonth([]);
        setCommissionByMonth([]);
        setExpertPerformance([]);
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
    void fetchAnalytics("initial", token);
  }, [fetchAnalytics, queryAdminToken]);

  const kpiCards = useMemo(
    () => [
      {
        title: "Toplam Gelir",
        value: formatMoney(overview.totalRevenue),
        description: "Onaylı / başarılı ödemeler",
      },
      {
        title: "Toplam Komisyon",
        value: formatMoney(overview.totalCommission),
        description: "Mindora gelir payı",
      },
      {
        title: "Toplam Uzman",
        value: formatNumber(overview.totalExperts),
        description: "Kayıtlı uzman profilleri",
      },
      {
        title: "Toplam Danışan",
        value: formatNumber(overview.totalClients),
        description: "Danışan başvuru kayıtları",
      },
      {
        title: "Toplam Seans",
        value: formatNumber(overview.totalSessions),
        description: "Oluşturulan seans kayıtları",
      },
      {
        title: "Ort. Seans Geliri",
        value: formatMoney(
          overview.totalSessions > 0 ? overview.totalRevenue / overview.totalSessions : 0
        ),
        description: "Gelir / toplam seans",
      },
    ],
    [overview]
  );

  const topExpert = expertPerformance[0];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                C12 Analytics Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Analytics
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Başvuru, ödeme, gelir, komisyon, dönüşüm ve uzman performans metriklerini tek ekrandan takip et.
                Bu ekran yönetim kararları, pazarlama takibi ve yatırımcı sunumu için temel veri merkezi olarak tasarlandı.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={buildAdminUrl("/admin", adminToken)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 no-underline transition hover:bg-slate-50"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={() => void fetchAnalytics("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Verileri Yenile"}
              </button>
            </div>
          </div>
        </header>

        {notice ? (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-bold text-slate-500">{item.title}</p>
              <p className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {loading ? "..." : item.value}
              </p>
              <p className="mt-3 text-sm text-slate-500">{item.description}</p>
            </article>
          ))}
        </section>

        <ConversionMetrics conversion={conversion} loading={loading} />

        {topExpert ? (
          <section className="rounded-[1.75rem] border border-indigo-100 bg-indigo-50 p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">
                  Öne Çıkan Uzman
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {topExpert.expertName || "Uzman"}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Gelir, seans ve puan performansına göre en güçlü uzman görünümü.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Gelir" value={formatMoney(topExpert.revenue)} />
                <MiniMetric label="Seans" value={formatNumber(topExpert.completedSessions)} />
                <MiniMetric label="Puan" value={formatRating(topExpert.averageRating)} />
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-2">
          <ChartCard
            title="Başvuru Grafiği"
            description="Danışan ve uzman başvurularının günlük dağılımı."
            points={applications}
            valueFormatter={formatNumber}
            loading={loading}
          />

          <ChartCard
            title="Ödeme Grafiği"
            description="Başarılı ödeme adetlerinin günlük dağılımı."
            points={payments}
            valueFormatter={formatNumber}
            loading={loading}
          />

          <ChartCard
            title="Aylık Gelir"
            description="Başarılı ödemelere göre aylık toplam gelir."
            points={revenueByMonth}
            valueFormatter={formatMoney}
            loading={loading}
          />

          <ChartCard
            title="Aylık Komisyon"
            description="Mindora komisyon gelirinin aylık dağılımı."
            points={commissionByMonth}
            valueFormatter={formatMoney}
            loading={loading}
          />
        </section>

        <ExpertPerformanceTable rows={expertPerformance} loading={loading} />
      </div>
    </main>
  );
}

function ConversionMetrics({
  conversion,
  loading,
}: {
  conversion: AnalyticsConversion;
  loading: boolean;
}) {
  const steps = [
    {
      title: "Başvuru → Eşleşme",
      rate: conversion.applicationToMatchRate,
      fromLabel: "Başvuru",
      fromValue: conversion.totalApplications,
      toLabel: "Eşleşme",
      toValue: conversion.matchedApplications,
      description: "Danışan başvurularının uzmanla eşleşme başarısı.",
    },
    {
      title: "Eşleşme → Ödeme",
      rate: conversion.matchToPaymentRate,
      fromLabel: "Eşleşme",
      fromValue: conversion.matchedApplications,
      toLabel: "Ödeme",
      toValue: conversion.paidPayments,
      description: "Eşleşen danışanların ödeme yapma oranı.",
    },
    {
      title: "Ödeme → Seans",
      rate: conversion.paymentToSessionRate,
      fromLabel: "Ödeme",
      fromValue: conversion.paidPayments,
      toLabel: "Seans",
      toValue: conversion.completedSessions,
      description: "Ödeme sonrası tamamlanan seans dönüşümü.",
    },
    {
      title: "Seans → Yorum",
      rate: conversion.sessionToReviewRate,
      fromLabel: "Seans",
      fromValue: conversion.completedSessions,
      toLabel: "Yorum",
      toValue: conversion.approvedReviews,
      description: "Tamamlanan seanslardan gelen onaylı yorum oranı.",
    },
  ];

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
            C12.2 Conversion Metrics
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Dönüşüm Hunisi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Mindora'nın başvurudan yoruma kadar nerede güçlendiğini ve nerede para kaybettiğini gösterir.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          4 kritik oran
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        {steps.map((step) => (
          <article
            key={step.title}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">{step.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  {step.description}
                </p>
              </div>

              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                {getFunnelHealth(step.rate)}
              </span>
            </div>

            <p className="mt-5 text-4xl font-black tracking-tight text-slate-950">
              {loading ? "..." : formatPercent(step.rate)}
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{ width: `${Math.max(0, Math.min(100, step.rate))}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniMetric
                label={step.fromLabel}
                value={loading ? "..." : formatNumber(step.fromValue)}
              />
              <MiniMetric
                label={step.toLabel}
                value={loading ? "..." : formatNumber(step.toValue)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-indigo-100">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  points,
  valueFormatter,
  loading,
}: {
  title: string;
  description: string;
  points: ChartPoint[];
  valueFormatter: (value: number) => string;
  loading: boolean;
}) {
  const safePoints = Array.isArray(points) ? points : [];
  const maxValue = getChartMax(safePoints);

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          {safePoints.length} veri
        </span>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
        ) : safePoints.length > 0 ? (
          <div className="flex h-64 items-end gap-2 overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
            {safePoints.map((point, index) => {
              const value = Number(point.value) || 0;
              const height = Math.max(8, Math.round((value / maxValue) * 190));

              return (
                <div
                  key={`${point.label}-${index}`}
                  className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                  title={`${point.label}: ${valueFormatter(value)}`}
                >
                  <span className="text-[10px] font-black text-slate-500">
                    {value > 0 ? valueFormatter(value) : ""}
                  </span>
                  <div
                    className="w-full rounded-t-2xl bg-indigo-600"
                    style={{ height }}
                  />
                  <span className="max-w-16 truncate text-[10px] font-bold text-slate-500">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-black text-slate-600">Henüz veri yok</p>
            <p className="mt-1 text-sm text-slate-500">
              Kayıtlar oluştuğunda grafik otomatik dolacak.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function ExpertPerformanceTable({
  rows,
  loading,
}: {
  rows: ExpertPerformanceRow[];
  loading: boolean;
}) {
  const safeRows = Array.isArray(rows) ? rows.slice(0, 20) : [];

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Uzman Performansı</h2>
          <p className="mt-1 text-sm text-slate-500">
            Seans, gelir, komisyon ve yorum puanına göre uzman performans tablosu.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          İlk 20 uzman
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
        {loading ? (
          <div className="space-y-3 bg-white p-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : safeRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Uzman</th>
                  <th className="px-4 py-4">Rozet</th>
                  <th className="px-4 py-4 text-right">Seans</th>
                  <th className="px-4 py-4 text-right">Tamamlanan</th>
                  <th className="px-4 py-4 text-right">Gelir</th>
                  <th className="px-4 py-4 text-right">Komisyon</th>
                  <th className="px-4 py-4 text-right">Puan</th>
                  <th className="px-4 py-4 text-right">Yorum</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {safeRows.map((row, index) => {
                  const badge = getBestExpertBadge(index, row);

                  return (
                    <tr key={row.expertId || `${row.expertName}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">
                              {row.expertName || "İsimsiz Uzman"}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              ID: {row.expertId || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {badge ? (
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                            {badge}
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-sm font-black text-slate-700">
                        {formatNumber(row.sessions)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-slate-700">
                        {formatNumber(row.completedSessions)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-slate-950">
                        {formatMoney(row.revenue)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-slate-700">
                        {formatMoney(row.commission)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-slate-700">
                        {formatRating(row.averageRating)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-slate-700">
                        {formatNumber(row.reviewCount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 p-8 text-center">
            <p className="text-sm font-black text-slate-600">Henüz uzman performans verisi yok</p>
            <p className="mt-1 text-sm text-slate-500">
              Analytics API expertPerformance alanını döndürdüğünde tablo otomatik dolacak.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-8">
          <div className="mx-auto max-w-7xl rounded-[1.75rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Analytics yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
