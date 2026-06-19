"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";

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
  pending: {
    label: "Onay Bekliyor",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  approved: {
    label: "Yayında",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  rejected: {
    label: "Reddedildi",
    className: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  hidden: {
    label: "Gizli",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

function buildAdminUrl(path: string, adminToken: string) {
  if (!adminToken) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}adminToken=${encodeURIComponent(adminToken)}`;
}

function getStatusConfig(status: string) {
  return (
    statusLabels[status] || {
      label: "Belirsiz",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
    }
  );
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

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
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
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
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
    const keyword = normalizeText(search);

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

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

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
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Yorum Moderasyonu
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Danışan yorumlarını incele, yayına al, reddet veya gizle. Onaylanan yorumlar
                uzman profillerinde güven kanıtı olarak kullanılacaktır.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchReviews("refresh")}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || refreshing ? "Yükleniyor..." : "Yenile"}
            </button>
          </div>
        </header>

        {notice ? (
          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <p className="text-sm font-black">Bilgilendirme</p>
            <p className="mt-1 text-sm font-semibold">{notice}</p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard title="Toplam Yorum" value={String(stats.totalReviews)} description="Tüm değerlendirmeler" />
          <SummaryCard title="Bekleyen" value={String(stats.pendingReviews)} description="Onay bekleyenler" />
          <SummaryCard title="Yayında" value={String(stats.approvedReviews)} description="Onaylananlar" />
          <SummaryCard title="Profilde Görünen" value={String(stats.publicReviews)} description="Kullanıcıya açık" />
          <SummaryCard title="Reddedilen" value={String(stats.rejectedReviews)} description="Yayınlanmayanlar" />
          <SummaryCard title="Gizli" value={String(stats.hiddenReviews)} description="Pasife alınanlar" />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Uzman, danışan, yorum metni, puan veya durum ara..."
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`rounded-2xl px-4 py-2 text-xs font-black ring-1 transition-all duration-200 ${
                    statusFilter === item.value
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <StateBox title="Yorumlar yükleniyor" description="Moderasyon kayıtları hazırlanıyor." />
        ) : filteredReviews.length > 0 ? (
          <section className="grid gap-4">
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                adminToken={adminToken}
                actionLoadingId={actionLoadingId}
                onAction={handleAction}
              />
            ))}
          </section>
        ) : (
          <StateBox
            title="Yorum bulunamadı"
            description="Seçili filtrede yorum yok. Yeni değerlendirmeler geldiğinde burada görünecektir."
          />
        )}
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
      <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950">{value}</p>
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
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating rating={review.rating} />
            <StatusPill className={config.className}>{config.label}</StatusPill>
            <StatusPill className="bg-slate-100 text-slate-600 ring-slate-200">
              {review.clientDisplayName}
            </StatusPill>
            <StatusPill
              className={
                review.isPublic
                  ? "bg-sky-50 text-sky-700 ring-sky-100"
                  : "bg-slate-100 text-slate-600 ring-slate-200"
              }
            >
              {review.isPublic ? "Profilde Görünür" : "Profilde Gizli"}
            </StatusPill>
            <StatusPill
              className={
                review.isApproved
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-amber-50 text-amber-700 ring-amber-100"
              }
            >
              {review.isApproved ? "Onaylı" : "Onay Bekliyor"}
            </StatusPill>
          </div>

          <h2 className="mt-4 text-base font-black text-slate-950">{review.expertName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {review.expertTitle || "Uzman"}
          </p>

          <p className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-slate-200">
            {review.reviewText?.trim() || "Danışan yalnızca puan bıraktı."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
              Oluşturulma: {formatDate(review.createdAt)}
            </span>
            {review.updatedAt ? (
              <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                Güncelleme: {formatDate(review.updatedAt)}
              </span>
            ) : null}
            {review.bookingId ? (
              <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                Randevu ID: {review.bookingId}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:w-56 xl:flex-col">
          {review.expertSlug ? (
            <Link
              href={`/uzmanlar/${encodeURIComponent(review.expertSlug)}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Profili Aç
            </Link>
          ) : null}

          {review.conversationId ? (
            <Link
              href={buildAdminUrl(
                `/admin/conversations/${encodeURIComponent(review.conversationId)}`,
                adminToken
              )}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Konuşmayı Aç
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
          ) : (
            <ActionButton
              label="Tekrar Yayına Al"
              loading={actionLoadingId === `${review.id}:restore_public`}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => onAction(review.id, "restore_public")}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {children}
    </span>
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
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? "İşleniyor..." : label}
    </button>
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
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <section className={`rounded-[2rem] border p-8 text-center shadow-sm ${className}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold">{description}</p>
    </section>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Yorum moderasyonu yükleniyor...</p>
          </div>
        </main>
      }
    >
      <AdminReviewsContent />
    </Suspense>
  );
}
