"use client";

import Link from "next/link";
import VerificationActions from "./components/VerificationActions";
import { useCallback, useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type VerificationStatus = "pending" | "approved" | "rejected";

type VerificationItem = {
  id: string;
  expertId: string | null;
  expertName: string;
  expertTitle: string | null;
  documentType: string | null;
  documentLabel: string;
  fileName: string | null;
  filePath: string | null;
  fileSize: number;
  status: VerificationStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
};

type VerificationStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type ApiResponse = {
  ok?: boolean;
  stats?: Partial<VerificationStats>;
  items?: VerificationItem[];
  error?: string;
};

const emptyStats: VerificationStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

function badge(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "rejected") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function statusLabel(status: string) {
  if (status === "approved") return "Onaylandı";
  if (status === "rejected") return "Reddedildi";
  return "İncelemede";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileSize(bytes?: number | null) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "-";

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExpertVerificationsAdminPage() {
  const [stats, setStats] = useState<VerificationStats>(emptyStats);
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<"all" | VerificationStatus>("all");

  const fetchVerifications = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    try {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);

      setNotice("");

      const response = await fetch("/api/admin/expert-verifications", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Doğrulama kayıtları alınamadı.");
      }

      setStats({
        ...emptyStats,
        ...(data.stats || {}),
      });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setStats(emptyStats);
      setItems([]);
      setNotice(error instanceof Error ? error.message : "Doğrulama kayıtları alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchVerifications("initial");
  }, [fetchVerifications]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;

    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  const cards = [
    {
      title: "Bekleyen",
      value: String(stats.pending),
      helper: "Admin incelemesi bekleyen belgeler",
    },
    {
      title: "Onaylanan",
      value: String(stats.approved),
      helper: "Doğrulaması tamamlanan belgeler",
    },
    {
      title: "Reddedilen",
      value: String(stats.rejected),
      helper: "Eksik veya geçersiz belgeler",
    },
    {
      title: "Toplam",
      value: String(stats.total),
      helper: "Tüm doğrulama kayıtları",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                C14 Admin
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Uzman Doğrulama Merkezi
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Uzmanların yüklediği diploma, lisans, sertifika ve kimlik doğrulama belgelerini tek merkezden inceleyin.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchVerifications("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Verileri Yenile"}
              </button>

              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        {notice ? (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-black text-amber-900">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} title={card.title} value={loading ? "..." : card.value} helper={card.helper} />
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Belge Listesi</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Private storage içinde tutulan belge kayıtları. Onay/red işlemleri gerçek API üzerinden yapılır.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                Tümü
              </FilterButton>
              <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")}>
                Bekleyen
              </FilterButton>
              <FilterButton active={filter === "approved"} onClick={() => setFilter("approved")}>
                Onaylanan
              </FilterButton>
              <FilterButton active={filter === "rejected"} onClick={() => setFilter("rejected")}>
                Reddedilen
              </FilterButton>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            {loading ? (
              <div className="space-y-3 bg-white p-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Uzman</th>
                      <th className="px-4 py-4">Belge</th>
                      <th className="px-4 py-4">Dosya</th>
                      <th className="px-4 py-4">Boyut</th>
                      <th className="px-4 py-4">Durum</th>
                      <th className="px-4 py-4">Tarih</th>
                      <th className="px-4 py-4 text-right">İşlem</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-slate-950">{item.expertName}</p>
                          {item.expertTitle ? (
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.expertTitle}</p>
                          ) : null}
                          <p className="mt-0.5 text-xs font-semibold text-slate-400">
                            ID: {item.expertId || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm font-black text-slate-700">
                          {item.documentLabel}
                        </td>

                        <td className="px-4 py-4">
                          <p className="max-w-[220px] truncate text-sm font-bold text-slate-700">
                            {item.fileName || "-"}
                          </p>
                          <p className="mt-0.5 max-w-[260px] truncate text-xs font-semibold text-slate-400">
                            {item.filePath || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-slate-600">
                          {formatFileSize(item.fileSize)}
                        </td>

                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badge(item.status)}`}>
                            {statusLabel(item.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-slate-600">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <VerificationActions
                            verificationId={item.id}
                            status={item.status}
                            onChanged={() => void fetchVerifications("refresh")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50 p-10 text-center">
                <p className="text-sm font-black text-slate-700">Kayıt bulunamadı</p>
                <p className="mt-1 text-sm text-slate-500">
                  Uzmanlar belge yüklediğinde burada listelenecek.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-xs font-black ring-1 transition ${
        active
          ? "bg-slate-950 text-white ring-slate-950"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Card({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{helper}</p>
    </article>
  );
}
