"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";

type ReportStatus = "all" | "open" | "investigating" | "resolved" | "rejected";

type ReportStats = {
  totalReports: number;
  openReports: number;
  investigatingReports: number;
  resolvedReports: number;
  rejectedReports: number;
  safetyReports: number;
};

type Report = {
  id: string;
  reporterType: string;
  reporterId?: string | null;
  reportedUserType: string;
  reportedUserId?: string | null;
  conversationId?: string | null;
  bookingId?: string | null;
  sessionId?: string | null;
  category: string;
  categoryLabel: string;
  description?: string | null;
  status: string;
  adminNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ReportsResponse = {
  ok?: boolean;
  stats?: ReportStats;
  reports?: Report[];
  error?: string;
};

const emptyStats: ReportStats = {
  totalReports: 0,
  openReports: 0,
  investigatingReports: 0,
  resolvedReports: 0,
  rejectedReports: 0,
  safetyReports: 0,
};

const statusFilters: Array<{ label: string; value: ReportStatus }> = [
  { label: "Tümü", value: "all" },
  { label: "Açık", value: "open" },
  { label: "İnceleniyor", value: "investigating" },
  { label: "Çözüldü", value: "resolved" },
  { label: "Reddedildi", value: "rejected" },
];

function buildAdminUrl(path: string, adminToken: string) {
  if (!adminToken) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}adminToken=${encodeURIComponent(adminToken)}`;
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
  if (status === "open") return { label: "Açık", className: "border-rose-200 bg-rose-50 text-rose-700" };
  if (status === "investigating") return { label: "İnceleniyor", className: "border-amber-200 bg-amber-50 text-amber-700" };
  if (status === "resolved") return { label: "Çözüldü", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (status === "rejected") return { label: "Reddedildi", className: "border-slate-200 bg-slate-100 text-slate-700" };

  return { label: "Belirsiz", className: "border-slate-200 bg-slate-100 text-slate-700" };
}

function AdminReportsContent() {
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("adminToken") || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState<ReportStats>(emptyStats);
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus>("open");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchReports = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const params = new URLSearchParams();
        if (adminToken) params.set("adminToken", adminToken);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const response = await fetch(`/api/admin/reports?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(adminToken ? { "x-admin-token": adminToken } : {}),
          },
        });

        const data = (await response.json().catch(() => ({}))) as ReportsResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Raporlar alınamadı.");
        }

        setStats(data.stats || emptyStats);
        setReports(data.reports || []);
      } catch (error) {
        setStats(emptyStats);
        setReports([]);
        setNotice(error instanceof Error ? error.message : "Raporlar alınamadı.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminToken, statusFilter]
  );

  useEffect(() => {
    void fetchReports("initial");
  }, [fetchReports]);

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return reports.filter((report) => {
      const text = [
        report.id,
        report.reporterType,
        report.reporterId,
        report.reportedUserType,
        report.reportedUserId,
        report.category,
        report.categoryLabel,
        report.description,
        report.status,
        report.adminNote,
        formatDate(report.createdAt),
      ]
        .join(" ")
        .toLowerCase();

      return !keyword || text.includes(keyword);
    });
  }, [reports, search]);

  async function updateReportStatus(reportId: string, status: "open" | "investigating" | "resolved" | "rejected") {
    try {
      setActionLoading(`${reportId}:${status}`);
      setNotice("");

      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({
          reportId,
          status,
          adminNote: adminNotes[reportId] || "",
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Rapor güncellenemedi.");
      }

      setNotice(data.message || "Rapor güncellendi.");
      await fetchReports("refresh");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Rapor güncellenemedi.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <header className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Raporlar ve Güvenlik İncelemeleri
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Danışan ve uzmanlardan gelen sorun bildirimlerini incele, durum ata ve operasyon notu ekle.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchReports("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Yenile"}
              </button>
              <Link
                href={buildAdminUrl("/admin", adminToken)}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800"
              >
                Yönetim Merkezi
              </Link>
            </div>
          </div>
        </header>

        {notice ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-700 shadow-sm">
            <p className="text-sm font-semibold">Bilgilendirme</p>
            <p className="mt-1 text-sm font-semibold">{notice}</p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Toplam" value={String(stats.totalReports)} description="Tüm raporlar" />
          <SummaryCard title="Açık" value={String(stats.openReports)} description="İlk müdahale bekler" />
          <SummaryCard title="İnceleniyor" value={String(stats.investigatingReports)} description="Aktif takip" />
          <SummaryCard title="Çözüldü" value={String(stats.resolvedReports)} description="Tamamlanan" />
          <SummaryCard title="Güvenlik" value={String(stats.safetyReports)} description="Risk kategorisi" />
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Filtrele ve Ara</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kategori, kullanıcı tipi, açıklama veya durum bilgisine göre arama yap.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rapor ara..."
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 lg:w-80"
            />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {statusFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatusFilter(item.value)}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  statusFilter === item.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Rapor Listesi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Bildirim detayları ve admin inceleme aksiyonları.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Yükleniyor" : `${filteredReports.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Raporlar yükleniyor" description="Güvenlik ve destek bildirimleri hazırlanıyor." />
          ) : filteredReports.length > 0 ? (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  adminToken={adminToken}
                  note={adminNotes[report.id] ?? report.adminNote ?? ""}
                  onNoteChange={(value) =>
                    setAdminNotes((current) => ({
                      ...current,
                      [report.id]: value,
                    }))
                  }
                  actionLoading={actionLoading}
                  onStatusChange={updateReportStatus}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Rapor bulunamadı"
              description="Yeni sorun bildirimi geldiğinde burada listelenecektir."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function ReportCard({
  report,
  adminToken,
  note,
  onNoteChange,
  actionLoading,
  onStatusChange,
}: {
  report: Report;
  adminToken: string;
  note: string;
  onNoteChange: (value: string) => void;
  actionLoading: string;
  onStatusChange: (reportId: string, status: "open" | "investigating" | "resolved" | "rejected") => Promise<void>;
}) {
  const config = getStatusConfig(report.status);

  return (
    <article className="rounded-xl border border-slate-200/80 bg-slate-50 p-5 transition-all duration-200 hover:border-slate-300">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}>
              {config.label}
            </span>
            <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {report.categoryLabel}
            </span>
            <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {formatDate(report.createdAt)}
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {report.reporterType} → {report.reportedUserType}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {report.description || "Açıklama girilmemiş."}
          </p>

          <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 md:grid-cols-2">
            <p>Bildiren ID: {report.reporterId || "-"}</p>
            <p>Bildirilen ID: {report.reportedUserId || "-"}</p>
            <p>Konuşma: {report.conversationId || "-"}</p>
            <p>Seans: {report.sessionId || "-"}</p>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Admin notu</span>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={3}
              placeholder="İnceleme notu ekle..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
          {report.conversationId ? (
            <Link
              href={buildAdminUrl(`/admin/conversations/${encodeURIComponent(report.conversationId)}`, adminToken)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:text-slate-900"
            >
              Konuşma
            </Link>
          ) : null}

          {report.status !== "open" ? (
            <ActionButton
              label="Açık"
              loading={actionLoading === `${report.id}:open`}
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => onStatusChange(report.id, "open")}
            />
          ) : null}

          {report.status !== "investigating" ? (
            <ActionButton
              label="İncele"
              loading={actionLoading === `${report.id}:investigating`}
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => onStatusChange(report.id, "investigating")}
            />
          ) : null}

          {report.status !== "resolved" ? (
            <ActionButton
              label="Çözüldü"
              loading={actionLoading === `${report.id}:resolved`}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onStatusChange(report.id, "resolved")}
            />
          ) : null}

          {report.status !== "rejected" ? (
            <ActionButton
              label="Reddet"
              loading={actionLoading === `${report.id}:rejected`}
              className="bg-slate-800 text-white hover:bg-slate-900"
              onClick={() => onStatusChange(report.id, "rejected")}
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
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? "İşleniyor..." : label}
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-500">Raporlar yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminReportsContent />
    </Suspense>
  );
}
