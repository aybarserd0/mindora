"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ReviewStatus = "all" | "pending" | "approved" | "rejected" | "hidden";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

type ExpertReview = {
  id: string;
  bookingId?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  rating: number;
  reviewText?: string | null;
  status: "pending" | "approved" | "rejected" | "hidden" | string;
  isPublic?: boolean;
  isApproved?: boolean;
  clientDisplayName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ExpertReviewsStats = {
  averageRating: number;
  totalReviews: number;
  publicReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  hiddenReviews: number;
  thisMonthReviews: number;
  ratingDistribution?: Record<string, number>;
};

type ExpertReviewsResponse = {
  ok?: boolean;
  expert?: {
    id?: string;
    name?: string;
    slug?: string | null;
  };
  stats?: ExpertReviewsStats;
  reviews?: ExpertReview[];
  error?: string;
};

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Onay Bekliyor", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  approved: { label: "Yayında", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  rejected: { label: "Reddedildi", className: "bg-rose-50 text-rose-700 ring-rose-100" },
  hidden: { label: "Gizli", className: "bg-slate-100 text-slate-700 ring-slate-200" },
};

const statusFilters: Array<{ label: string; value: ReviewStatus }> = [
  { label: "Tümü", value: "all" },
  { label: "Onay Bekleyen", value: "pending" },
  { label: "Yayında", value: "approved" },
  { label: "Reddedilen", value: "rejected" },
  { label: "Gizli", value: "hidden" },
];

const ratingFilters: Array<{ label: string; value: RatingFilter }> = [
  { label: "Tüm Puanlar", value: "all" },
  { label: "5 Yıldız", value: "5" },
  { label: "4 Yıldız", value: "4" },
  { label: "3 Yıldız", value: "3" },
  { label: "2 Yıldız", value: "2" },
  { label: "1 Yıldız", value: "1" },
];

const emptyStats: ExpertReviewsStats = {
  averageRating: 0,
  totalReviews: 0,
  publicReviews: 0,
  pendingReviews: 0,
  approvedReviews: 0,
  rejectedReviews: 0,
  hiddenReviews: 0,
  thisMonthReviews: 0,
  ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
};

function buildTokenUrl(path: string, token: string) {
  if (!token) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}token=${encodeURIComponent(token)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih bilinmiyor";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih bilinmiyor";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getStatusConfig(status: string) {
  return statusLabels[status] || {
    label: "Belirsiz",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };
}

function StarRating({ rating, size = "text-lg" }: { rating: number; size?: string }) {
  const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));

  return (
    <div className={`flex items-center gap-0.5 ${size}`} aria-label={`${safeRating} yıldız`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= safeRating ? "text-amber-400" : "text-slate-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

function ExpertReviewsContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const explicitExpertId = searchParams.get("expertId") || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [expertName, setExpertName] = useState("Mindora Uzmanı");
  const [stats, setStats] = useState<ExpertReviewsStats>(emptyStats);
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [search, setSearch] = useState("");

  const fetchReviews = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setNotice("");

        const params = new URLSearchParams();
        params.set("limit", "200");

        if (token) params.set("token", token);
        if (explicitExpertId) params.set("expertId", explicitExpertId);

        const response = await fetch(`/api/expert/reviews?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = (await response.json().catch(() => ({}))) as ExpertReviewsResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Yorumlar alınamadı.");
        }

        setExpertName(data.expert?.name || "Mindora Uzmanı");
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
    [token, explicitExpertId]
  );

  useEffect(() => {
    void fetchReviews("initial");
  }, [fetchReviews]);

  const filteredReviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return reviews
      .filter((review) => {
        if (statusFilter !== "all" && review.status !== statusFilter) return false;
        if (ratingFilter !== "all" && Number(review.rating) !== Number(ratingFilter)) return false;

        const text = [
          review.clientDisplayName,
          review.reviewText,
          review.status,
          getStatusConfig(review.status).label,
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
  }, [reviews, statusFilter, ratingFilter, search]);

  const distribution = stats.ratingDistribution || emptyStats.ratingDistribution || {};
  const maxDistribution = Math.max(...Object.values(distribution).map((value) => Number(value) || 0), 1);

  return (
    <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Uzman Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Yorumlar ve Puanlar
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                {expertName} profilinize gelen danışan değerlendirmelerini, ortalama puanınızı ve moderasyon durumlarını takip edin.
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
                href={buildTokenUrl("/expert/dashboard", token)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {notice ? (
          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <p className="text-sm font-black">Yorumlar yüklenemedi</p>
            <p className="mt-1 text-sm font-semibold">{notice}</p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Ortalama Puan"
            value={stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"}
            description={`${stats.publicReviews} yayındaki yorum`}
            accent={<StarRating rating={Math.round(stats.averageRating)} />}
          />
          <SummaryCard title="Toplam Yorum" value={String(stats.totalReviews)} description="Tüm değerlendirmeler" />
          <SummaryCard title="Bu Ay" value={String(stats.thisMonthReviews)} description="Yeni gelen yorum" />
          <SummaryCard title="Onay Bekleyen" value={String(stats.pendingReviews)} description="Admin moderasyonu bekler" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.5fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Puan Dağılımı</h2>
            <p className="mt-1 text-sm text-slate-500">Yayındaki onaylı yorumlara göre hesaplanır.</p>

            <div className="mt-6 space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = Number(distribution[String(rating)] || 0);
                const width = Math.round((count / maxDistribution) * 100);

                return (
                  <div key={rating} className="grid grid-cols-[72px_1fr_36px] items-center gap-3">
                    <div className="flex items-center gap-1 text-sm font-black text-slate-700">
                      {rating} <span className="text-amber-400">★</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
                    </div>
                    <div className="text-right text-sm font-black text-slate-600">{count}</div>
                  </div>
                );
              })}
            </div>
          </article>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Yorum metni, danışan kodu, puan veya durum bilgisine göre arama yapın.
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

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              {ratingFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRatingFilter(item.value)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    ratingFilter === item.value
                      ? "bg-indigo-600 text-white ring-indigo-600"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Yorum Listesi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Danışan değerlendirmeleri ve yayın durumları.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? "Yükleniyor" : `${filteredReviews.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Yorumlar yükleniyor" description="Değerlendirme kayıtlarınız hazırlanıyor." />
          ) : filteredReviews.length > 0 ? (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} token={token} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz yorum bulunamadı"
              description="Tamamlanan seanslardan sonra danışanlar yorum bırakabilir. Onaylanan yorumlar uzman profilinizde sosyal kanıt olarak görünür."
            />
          )}
        </section>
      </div>
    </section>
  );
}

function SummaryCard({
  title,
  value,
  description,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  accent?: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        {accent ? <div className="pt-1">{accent}</div> : null}
      </div>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function ReviewCard({ review, token }: { review: ExpertReview; token: string }) {
  const config = getStatusConfig(review.status);

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating rating={review.rating} size="text-xl" />
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
              {config.label}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {review.clientDisplayName || "Danışan"}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-700">
            {review.reviewText?.trim() || "Danışan yalnızca puan bıraktı."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              {formatDate(review.createdAt)}
            </span>
            {review.isPublic ? (
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Public</span>
            ) : (
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Private</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          {review.conversationId ? (
            <Link
              href={buildTokenUrl(`/expert/chat/${encodeURIComponent(review.conversationId)}`, token)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
            >
              Sohbete Git
            </Link>
          ) : null}

          {review.sessionId ? (
            <Link
              href={buildTokenUrl(`/expert/session/${encodeURIComponent(review.sessionId)}`, token)}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
            >
              Seansı Aç
            </Link>
          ) : null}
        </div>
      </div>
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

export default function ExpertDashboardReviewsPage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Yorumlar yükleniyor...</p>
          </div>
        </section>
      }
    >
      <ExpertReviewsContent />
    </Suspense>
  );
}
