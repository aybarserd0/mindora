"use client";

import { professionLabel } from "@/lib/professions";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { formatRate, resolveCommission } from "@/lib/payments/policy";

type ExpertStatus = "pending" | "approved" | "rejected" | "passive";
type StatusFilter = "all" | ExpertStatus;

type Expert = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  title: string | null;
  areas: string | null;
  experience: string | null;
  online: string | null;
  price: string | null;
  availability: string | null;
  expectation: string | null;
  note: string | null;
  status: ExpertStatus;
  created_at: string;
  founding_member?: boolean | null;
  founding_until?: string | null;
  commission_rate?: number | string | null;
  account_type?: string | null;
  profession?: string | null;
};

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Beklemede" },
  { value: "approved", label: "Onaylandı" },
  { value: "rejected", label: "Reddedildi" },
  { value: "passive", label: "Pasif" },
];

function getStatusLabel(status: ExpertStatus) {
  const labels: Record<ExpertStatus, string> = {
    pending: "Beklemede",
    approved: "Onaylandı",
    rejected: "Reddedildi",
    passive: "Pasif",
  };

  return labels[status] || "Bilinmiyor";
}

function getStatusStyle(status: ExpertStatus) {
  const styles: Record<ExpertStatus, string> = {
    approved: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border border-amber-200 bg-amber-50 text-amber-700",
    rejected: "border border-rose-200 bg-rose-50 text-rose-700",
    passive: "border border-slate-200 bg-slate-100 text-slate-700",
  };

  return styles[status] || "border border-slate-200 bg-slate-100 text-slate-700";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Tarih bilinmiyor";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function safeText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function UzmanBasvurulariPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const counts = useMemo(() => {
    return {
      all: experts.length,
      pending: experts.filter((expert) => expert.status === "pending").length,
      approved: experts.filter((expert) => expert.status === "approved").length,
      rejected: experts.filter((expert) => expert.status === "rejected").length,
      passive: experts.filter((expert) => expert.status === "passive").length,
    };
  }, [experts]);

  const filteredExperts = useMemo(() => {
    const keyword = normalizeText(search);

    return experts.filter((expert) => {
      const matchesStatus = filter === "all" || expert.status === filter;

      const searchableText = [
        expert.name,
        expert.email,
        expert.phone,
        expert.title,
        expert.areas,
        expert.experience,
        expert.online,
        expert.availability,
        expert.price,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [experts, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredExperts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedExperts = useMemo(
    () => filteredExperts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredExperts, currentPage]
  );

  const fetchExperts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/experts", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        experts?: Expert[];
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        setError(data.error || "Uzman başvuruları alınamadı.");
        return;
      }

      setExperts(Array.isArray(data.experts) ? data.experts : []);
    } catch {
      setError("Sunucuya bağlanırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function updateStatus(id: string, status: ExpertStatus) {
    const confirmText =
      status === "approved"
        ? "Bu uzmanı onaylamak istiyor musun?"
        : status === "rejected"
          ? "Bu başvuruyu reddetmek istiyor musun?"
          : "Bu uzmanı pasife almak istiyor musun?";

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingId(id);

      const response = await fetch("/api/admin/experts/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        window.alert(data.error || "Uzman durumu güncellenemedi.");
        return;
      }

      await fetchExperts();
    } catch {
      window.alert("Durum güncellenirken hata oluştu.");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    void fetchExperts();
  }, [fetchExperts]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-600">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Uzman Başvuruları
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Gelen uzman başvurularını incele, onayla, reddet veya pasife al.
                Onaylanan uzmanlar uzmanlar sayfasında görünür ve danışan
                eşleştirme sürecinde kullanılabilir.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
              >
                Yönetim Merkezi
              </Link>
              <button
                type="button"
                onClick={() => void fetchExperts()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-pine-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Yükleniyor..." : "Yenile"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value);
                setPage(1);
              }}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-all duration-200 ease-out ${
                filter === option.value
                  ? "border-pine-800 bg-pine-800 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {option.label} ({counts[option.value]})
            </button>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="İsim, e-posta, telefon, unvan veya uzmanlık alanı ara..."
            className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />
        </section>

        {loading ? (
          <StateBox title="Uzman başvuruları yükleniyor" description="Kayıtlar hazırlanıyor." />
        ) : error ? (
          <StateBox tone="error" title="Başvurular alınamadı" description={error} />
        ) : filteredExperts.length === 0 ? (
          <StateBox
            title="Kayıt bulunamadı"
            description="Bu filtre veya arama için uzman başvurusu bulunmuyor."
          />
        ) : (
          <section className="grid gap-5">
            {paginatedExperts.map((expert) => (
              <article
                key={expert.id}
                className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:border-slate-300"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">
                        {expert.name}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                          expert.status
                        )}`}
                      >
                        {getStatusLabel(expert.status)}
                      </span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                        {professionLabel(expert.profession)}
                      </span>
                      {expert.account_type === "supervision_only" ? (
                        <span className="rounded-full border border-lilac-200 bg-lilac-50 px-3 py-1 text-xs font-semibold text-lilac-800">
                          Yalnızca süpervizyon
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {safeText(expert.title)} • {safeText(expert.areas)}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Başvuru tarihi: {formatDate(expert.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updatingId === expert.id || expert.status === "approved"}
                      onClick={() => updateStatus(expert.id, "approved")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Onayla
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === expert.id || expert.status === "rejected"}
                      onClick={() => updateStatus(expert.id, "rejected")}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reddet
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === expert.id || expert.status === "passive"}
                      onClick={() => updateStatus(expert.id, "passive")}
                      className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Pasife Al
                    </button>
                  </div>
                </div>

                <CommissionPanel
                  expert={expert}
                  onSaved={(patch) =>
                    setExperts((prev) => prev.map((item) => (item.id === expert.id ? { ...item, ...patch } : item)))
                  }
                />

                <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 md:grid-cols-2">
                  <InfoRow label="Telefon" value={safeText(expert.phone)} />
                  <InfoRow label="E-posta" value={safeText(expert.email)} />
                  <InfoRow label="Unvan" value={safeText(expert.title)} />
                  <InfoRow label="Uzmanlık Alanları" value={safeText(expert.areas)} />
                  <InfoRow label="Deneyim" value={safeText(expert.experience)} />
                  <InfoRow label="Online Görüşme" value={safeText(expert.online)} />
                  <InfoRow label="Seans Ücreti" value={safeText(expert.price)} />
                  <InfoRow label="Müsaitlik" value={safeText(expert.availability)} />
                  <InfoRow
                    label="Mindora’dan Beklenti"
                    value={safeText(expert.expectation)}
                    className="md:col-span-2"
                  />
                  <InfoRow
                    label="Ek Not"
                    value={safeText(expert.note)}
                    className="md:col-span-2"
                  />
                  <p className="break-all text-xs font-semibold text-slate-400 md:col-span-2">
                    <span className="font-semibold text-slate-500">Uzman ID:</span>{" "}
                    {expert.id}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}

        {!loading && !error && filteredExperts.length > PAGE_SIZE ? (
          <section className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row">
            <p className="text-sm font-semibold text-slate-500">
              Sayfa {currentPage} / {totalPages} • Toplam {filteredExperts.length} kayıt
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <p className={className}>
      <span className="font-semibold text-slate-900">{label}:</span> {value}
    </p>
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
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-white text-slate-500";

  return (
    <section className={`rounded-xl border p-8 text-center shadow-sm ${className}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm font-semibold">{description}</p>
    </section>
  );
}

function CommissionPanel({
  expert,
  onSaved,
}: {
  expert: Expert;
  onSaved: (patch: Partial<Expert>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [customRate, setCustomRate] = useState(
    expert.commission_rate !== null && expert.commission_rate !== undefined && expert.commission_rate !== ""
      ? String(Math.round(Number(expert.commission_rate) * 10000) / 100)
      : ""
  );
  const [message, setMessage] = useState("");

  const commission = resolveCommission(expert);
  const sourceLabel =
    commission.source === "custom" ? "Özel oran" : commission.source === "founding" ? "Kurucu uzman" : "Standart";

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/experts/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: expert.id, ...payload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Kaydedilemedi.");
      onSaved(data.expert);
      setMessage("Kaydedildi. Yeni oran bundan sonraki ödemelere uygulanır.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-xl border border-lilac-100 bg-lilac-50/60 p-5 text-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="font-semibold text-slate-900">
          Komisyon: {formatRate(commission.rate)} <span className="font-medium text-slate-500">· {sourceLabel}</span>
        </p>
        {expert.founding_member && expert.founding_until ? (
          <p className="mt-1 text-xs text-slate-500">
            Kurucu indirimi {formatDate(expert.founding_until)} tarihine kadar geçerli.
          </p>
        ) : null}
        {message ? <p className="mt-1 text-xs font-semibold text-lilac-800">{message}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save({ founding: !expert.founding_member })}
          className="rounded-full border border-lilac-200 bg-white px-4 py-2 font-semibold text-lilac-900 transition hover:border-lilac-400 disabled:opacity-50"
        >
          {expert.founding_member ? "Kurucu indirimini kaldır" : "Kurucu uzman yap (12 ay)"}
        </button>
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-4 pr-1">
          <span className="text-xs font-semibold text-slate-500">Özel %</span>
          <input
            value={customRate}
            onChange={(event) => setCustomRate(event.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
            inputMode="decimal"
            placeholder="—"
            className="w-14 bg-transparent text-sm font-semibold outline-none"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ commissionRate: customRate === "" ? null : Number(customRate) })}
            className="rounded-full bg-pine-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Kaydet
          </button>
        </label>
      </div>
    </div>
  );
}
