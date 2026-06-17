"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ReviewStatus = "all" | "pending" | "approved" | "rejected" | "hidden";
type ReviewAction = "approve" | "reject" | "hide" | "restore_public";

type AdminReview = {
  id: string;
  expertId: string;
  expertName: string;
  expertTitle?: string | null;
  expertSlug?: string | null;
  clientDisplayName: string;
  bookingId?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  rating: number;
  reviewText?: string | null;
  isPublic: boolean;
  isApproved: boolean;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AdminReviewStats = {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  hiddenReviews: number;
  publicReviews: number;
};

type AdminReviewsResponse = {
  ok?: boolean;
  stats?: AdminReviewStats;
  reviews?: AdminReview[];
  error?: string;
};

const emptyStats: AdminReviewStats = {
  totalReviews: 0,
  pendingReviews: 0,
  approvedReviews: 0,
  rejectedReviews: 0,
  hiddenReviews: 0,
  publicReviews: 0,
};

const statusFilters: Array<{ label: string; value: ReviewStatus }> = [
  { label: "Tümü", value: "all" },
  { label: "Onay Bekleyen", value: "pending" },
  { label: "Yayında", value: "approved" },
  { label: "Reddedilen", value: "rejected" },
  { label: "Gizli", value: "hidden" },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Onay Bekliyor", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  approved: { label: "Yayında", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  rejected: { label: "Reddedildi", className: "bg-rose-50 text-rose-700 ring-rose-100" },
  hidden: { label: "Gizli", className: "bg-slate-100 text-slate-700 ring-slate-200" },
};

function buildAdminUrl(path: string, adminToken: string) {
  if (!adminToken) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}adminToken=${encodeURIComponent(adminToken)}`;
}

function getStatusConfig(status: string) {
  return statusLabels[status] || {
    label: "Belirsiz",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih bilinmiyor";

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

function StarRating({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));

  return (
    <div className="flex items-center gap-0.5 text-xl" aria-label={`${safeRating} yıldız`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= safeRating ? "text-amber-400" : "text-slate-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

function AdminReviewsContent() {
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("adminToken") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [stats, setStats] = useState<AdminReviewStats>(emptyStats);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("pending");
  const [search, setSearch] = useState("");

  const fetchReviews = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const params = new URLSearchParams();
        params.set("limit", "300");
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (adminToken) params.set("adminToken", adminToken);

        const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(adminToken ? { "x-admin-token": adminToken } : {}),
          },
        });

        const data = (await response.json().catch(() => ({}))) as AdminReviewsResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Yorumlar alınamadı.");
        }

        setStats(data.stats || emptyStats);
        setReviews(data.reviews || []);
      } catch (error) {
        setStats(emptyStats);
        setReviews([]);
        setNotice(error instanceof Error ? error.message : "Yorumlar alınamadı.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminToken, statusFilter]
  );

  useEffect(() => {
    void fetchReviews("initial");
  }, [fetchReviews]);

  const filteredReviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return reviews
      .filter((review) => {
        const text = [
          review.id,
          review.expertName,
          review.expertTitle,
          review.clientDisplayName,
          review.reviewText,
          review.status,
          getStatusConfig(review.status).label,
          review.rating,
          formatDate(review.createdAt),
        ]
          .join(" ")
          .toLowerCase();

        return !keyword || text.includes(keyword);
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [reviews, search]);

  async function handleAction(reviewId: string, action: ReviewAction) {
    try {
      setActionLoadingId(`${reviewId}:${action}`);
      setNotice("");

      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({ reviewId, action }),
      });

      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Moderasyon işlemi başarısız.");
      }

      await fetchReviews("refresh");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Moderasyon işlemi başarısız.");
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Admin Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Yorum Moderasyonu
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Danışan yorumlarını inceleyin, yayına alın, reddedin veya gizleyin. Yayına alınan yorumlar public uzman sayfalarında sosyal kanıt olarak kullanılacaktır.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchReviews("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Yenile"}
              </button>
              <Link
                href={buildAdminUrl("/admin", adminToken)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                Admin Dashboard
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard title="Toplam" value={String(stats.totalReviews)} description="Tüm yorumlar" />
          <SummaryCard title="Bekleyen" value={String(stats.pendingReviews)} description="Onay bekler" />
          <SummaryCard title="Yayında" value={String(stats.approvedReviews)} description="Onaylandı" />
          <SummaryCard title="Public" value={String(stats.publicReviews)} description="Profilde görünür" />
          <SummaryCard title="Reddedilen" value={String(stats.rejectedReviews)} description="Yayınlanmaz" />
          <SummaryCard title="Gizli" value={String(stats.hiddenReviews)} description="Pasif yorum" />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
              <p className="mt-1 text-sm text-slate-500">
                Uzman, danışan kodu, yorum metni, puan veya duruma göre arama yapın.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Yorum ara..."
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

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Yorum Listesi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Seçili filtreye göre listelenen değerlendirmeler.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? "Yükleniyor" : `${filteredReviews.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Yorumlar yükleniyor" description="Moderasyon kayıtları hazırlanıyor." />
          ) : filteredReviews.length > 0 ? (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  adminToken={adminToken}
                  actionLoadingId={actionLoadingId}
                  onAction={handleAction}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Bu filtrede yorum bulunamadı"
              description="Yeni yorumlar geldiğinde burada moderasyon için listelenecektir."
            />
          )}
        </section>
      </div>
    </section>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function ReviewCard({
  review,
  adminToken,
  actionLoadingId,
  onAction,
}: {
  review: AdminReview;
  adminToken: string;
  actionLoadingId: string;
  onAction: (reviewId: string, action: ReviewAction) => Promise<void>;
}) {
  const config = getStatusConfig(review.status);

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating rating={review.rating} />
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
              {config.label}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {review.clientDisplayName}
            </span>
          </div>

          <h3 className="mt-4 text-base font-black text-slate-950">{review.expertName}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{review.expertTitle || "Uzman"}</p>

          <p className="mt-4 text-sm leading-6 text-slate-700">
            {review.reviewText?.trim() || "Danışan yalnızca puan bıraktı."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              {formatDate(review.createdAt)}
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              {review.isPublic ? "Public" : "Private"}
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              {review.isApproved ? "Approved" : "Not approved"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
          {review.expertSlug ? (
            <Link
              href={`/uzmanlar/${encodeURIComponent(review.expertSlug)}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
            >
              Profili Aç
            </Link>
          ) : null}

          {review.conversationId ? (
            <Link
              href={buildAdminUrl(`/admin/conversations/${encodeURIComponent(review.conversationId)}`, adminToken)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
            >
              Konuşma
            </Link>
          ) : null}

          {review.status !== "approved" ? (
            <ActionButton
              label="Onayla"
              loading={actionLoadingId === `${review.id}:approve`}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onAction(review.id, "approve")}
            />
          ) : null}

          {review.status !== "rejected" ? (
            <ActionButton
              label="Reddet"
              loading={actionLoadingId === `${review.id}:reject`}
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => onAction(review.id, "reject")}
            />
          ) : null}

          {review.status !== "hidden" ? (
            <ActionButton
              label="Gizle"
              loading={actionLoadingId === `${review.id}:hide`}
              className="bg-slate-800 text-white hover:bg-slate-900"
              onClick={() => onAction(review.id, "hide")}
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

export default function AdminReviewsPage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Yorum moderasyonu yükleniyor...</p>
          </div>
        </section>
      }
    >
      <AdminReviewsContent />
    </Suspense>
  );
}
