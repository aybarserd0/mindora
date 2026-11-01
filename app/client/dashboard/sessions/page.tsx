"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ClientSessionStatus =
  | "pending"
  | "scheduled"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "canceled"
  | "no_show"
  | "rescheduled"
  | "unknown"
  | string;

type NormalizedSessionStatus =
  | "pending"
  | "scheduled"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled"
  | "unknown";

type ApiClientSession = {
  id: string;
  bookingId?: string | null;
  sessionBookingId?: string | null;
  conversationId?: string | null;
  expertId?: string | null;
  expertName?: string | null;
  expertTitle?: string | null;
  expertPhotoUrl?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  timezone?: string | null;
  status?: ClientSessionStatus | null;
  paymentStatus?: string | null;
  payment_status?: string | null;
  reviewId?: string | null;
  hasReview?: boolean | null;
  sessionReady?: boolean | null;
  liveSessionId?: string | null;
  joinHref?: string | null;
  chatHref?: string | null;
  createdAt?: string | null;
  canCancel?: boolean | null;
  freeCancellation?: boolean | null;
  lateCancellation?: boolean | null;
  cancelledBy?: string | null;
  refundStatus?: string | null;
};

type ClientSessionsResponse = {
  ok?: boolean;
  sessions?: ApiClientSession[];
  upcomingSessions?: ApiClientSession[];
  completedSessions?: ApiClientSession[];
  error?: string;
};

type UiSession = {
  id: string;
  bookingId: string;
  conversationId: string | null;
  expertName: string;
  expertTitle: string;
  expertPhotoUrl: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  timezone: string;
  status: NormalizedSessionStatus;
  paymentStatus: string;
  date: string;
  timeRange: string;
  duration: string;
  startTime: number;
  canJoin: boolean;
  canReview: boolean;
  hasReview: boolean;
  joinHref: string;
  chatHref: string;
  canCancel: boolean;
  freeCancellation: boolean;
  lateCancellation: boolean;
  cancelledBy: string | null;
  refundStatus: string | null;
};

type SessionFilter = "all" | "upcoming" | "completed" | "cancelled";

type ReviewSubmitState = {
  loading: boolean;
  error: string;
  success: string;
};

const JOINABLE_STATUSES: NormalizedSessionStatus[] = ["scheduled", "confirmed", "active"];
const UPCOMING_STATUSES: NormalizedSessionStatus[] = [
  "pending",
  "scheduled",
  "confirmed",
  "active",
  "rescheduled",
];
const FINISHED_STATUSES: NormalizedSessionStatus[] = ["completed", "cancelled", "no_show"];
const REVIEWABLE_STATUSES: NormalizedSessionStatus[] = ["completed"];

const statusConfig: Record<NormalizedSessionStatus, { label: string; className: string }> = {
  pending: { label: "Ödeme bekleniyor", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  scheduled: { label: "Planlandı", className: "bg-blue-50 text-blue-700 ring-blue-100" },
  confirmed: { label: "Onaylandı", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  active: { label: "Aktif", className: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  completed: { label: "Tamamlandı", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  cancelled: { label: "İptal", className: "bg-rose-50 text-rose-700 ring-rose-100" },
  no_show: { label: "Katılmadı", className: "bg-orange-50 text-orange-700 ring-orange-100" },
  rescheduled: { label: "Ertelendi", className: "bg-purple-50 text-purple-700 ring-purple-100" },
  unknown: { label: "Belirlenmedi", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const filters: Array<{ label: string; value: SessionFilter }> = [
  { label: "Tümü", value: "all" },
  { label: "Yaklaşan", value: "upcoming" },
  { label: "Tamamlanan", value: "completed" },
  { label: "İptal / Katılmadı", value: "cancelled" },
];

function normalizeStatus(value: string | null | undefined): NormalizedSessionStatus {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "scheduled" ||
    normalized === "confirmed" ||
    normalized === "active" ||
    normalized === "completed" ||
    normalized === "no_show" ||
    normalized === "rescheduled"
  ) {
    return normalized;
  }

  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  if (normalized === "pending_payment") return "pending";

  return "unknown";
}

function getDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getTime(value?: string | null) {
  return getDate(value)?.getTime() || 0;
}

function formatDate(value?: string | null) {
  const date = getDate(value);
  if (!date) return "Tarih bekleniyor";

  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTimeRange(startAt?: string | null, endAt?: string | null) {
  const start = getDate(startAt);
  const end = getDate(endAt);

  if (!start || !end) return "Saat bekleniyor";

  const formatter = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function calculateDuration(startAt?: string | null, endAt?: string | null) {
  const start = getTime(startAt);
  const end = getTime(endAt);

  if (!start || !end || end <= start) return "50 dk";

  return `${Math.round((end - start) / 60000)} dk`;
}

function buildTokenUrl(path: string | null | undefined, token: string) {
  if (!path) return "#";
  if (!token) return path;

  try {
    const isAbsolute = /^https?:\/\//i.test(path);
    const url = isAbsolute ? new URL(path) : new URL(path, "https://mindora.local");

    if (!url.searchParams.get("token")) {
      url.searchParams.set("token", token);
    }

    if (isAbsolute) return url.toString();

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    if (path.includes("token=")) return path;

    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}token=${encodeURIComponent(token)}`;
  }
}

function fallbackId(session: ApiClientSession, index: number) {
  return [session.id, session.conversationId, session.scheduledStartAt, index]
    .filter(Boolean)
    .join("-");
}

function getBookingId(session: ApiClientSession, fallback: string) {
  return String(session.bookingId || session.sessionBookingId || session.id || fallback);
}

function toUiSession(session: ApiClientSession, index: number, token: string): UiSession {
  const status = normalizeStatus(session.status);
  const startTime = getTime(session.scheduledStartAt);
  const id = String(session.id || fallbackId(session, index) || `session-${index}`);
  const bookingId = getBookingId(session, id);
  const rawJoinHref =
    session.joinHref || (session.id ? `/client/session/${encodeURIComponent(session.id)}` : null);
  const rawChatHref =
    session.chatHref ||
    (session.conversationId ? `/client/chat/${encodeURIComponent(session.conversationId)}` : null);
  const paymentStatus = String(session.paymentStatus || session.payment_status || "").toLowerCase();
  const hasReview = Boolean(session.hasReview || session.reviewId);

  const canJoin =
    JOINABLE_STATUSES.includes(status) &&
    Boolean(session.sessionReady || session.liveSessionId || session.joinHref);

  const canReview =
    REVIEWABLE_STATUSES.includes(status) &&
    !hasReview &&
    Boolean(bookingId);

  return {
    id,
    bookingId,
    conversationId: session.conversationId || null,
    expertName: session.expertName?.trim() || "Uzman eşleştirme sürecinde",
    expertTitle: session.expertTitle?.trim() || "Mindora Uzmanı",
    expertPhotoUrl: session.expertPhotoUrl?.trim() || null,
    scheduledStartAt: session.scheduledStartAt || null,
    scheduledEndAt: session.scheduledEndAt || null,
    timezone: session.timezone || "Europe/Istanbul",
    status,
    paymentStatus,
    date: formatDate(session.scheduledStartAt),
    timeRange: formatTimeRange(session.scheduledStartAt, session.scheduledEndAt),
    duration: calculateDuration(session.scheduledStartAt, session.scheduledEndAt),
    startTime,
    canJoin,
    canReview,
    hasReview,
    joinHref: buildTokenUrl(rawJoinHref, token),
    chatHref: buildTokenUrl(rawChatHref, token),
    canCancel: Boolean(session.canCancel),
    freeCancellation: Boolean(session.freeCancellation),
    lateCancellation: Boolean(session.lateCancellation),
    cancelledBy: session.cancelledBy || null,
    refundStatus: session.refundStatus || null,
  };
}

function isUpcoming(session: UiSession) {
  if (session.status === "active") return true;
  if (!UPCOMING_STATUSES.includes(session.status)) return false;
  if (!session.startTime) return true;

  return session.startTime >= Date.now();
}

function isPast(session: UiSession) {
  if (FINISHED_STATUSES.includes(session.status)) return true;
  if (!session.startTime) return false;

  return session.startTime < Date.now() && session.status !== "active";
}

function isCancelledLike(session: UiSession) {
  return session.status === "cancelled" || session.status === "no_show";
}

function statusLabel(status: NormalizedSessionStatus) {
  return statusConfig[status]?.label || statusConfig.unknown.label;
}

function ClientSessionsContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [sessions, setSessions] = useState<UiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [softNotice, setSoftNotice] = useState("");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [search, setSearch] = useState("");
  const [reviewSession, setReviewSession] = useState<UiSession | null>(null);
  const [cancelSession, setCancelSession] = useState<UiSession | null>(null);
  const [bookingOpen, setBookingOpen] = useState(() => searchParams.get("yeni") === "1");
  const [submittedReviewBookingIds, setSubmittedReviewBookingIds] = useState<Set<string>>(new Set());

  const fetchSessions = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (!token) {
        setSoftNotice(
          "Güvenli erişim bağlantısı bulunamadı. Sana e-postayla gelen giriş bağlantısını kullanabilirsin."
        );
        setSessions([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        setSoftNotice("");

        const response = await fetch(`/api/client/sessions?token=${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = (await response.json().catch(() => ({}))) as ClientSessionsResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Henüz planlanmış seansınız bulunmuyor.");
        }

        const merged = [
          ...(data.sessions || []),
          ...(data.upcomingSessions || []),
          ...(data.completedSessions || []),
        ];

        const seen = new Set<string>();
        const normalized = merged
          .map((session, index) => toUiSession(session, index, token))
          .filter((session) => {
            if (seen.has(session.id)) return false;
            seen.add(session.id);
            return true;
          });

        setSessions(normalized);
      } catch (err) {
        setSessions([]);
        setSoftNotice(
          err instanceof Error && err.message.trim()
            ? err.message
            : "Henüz planlanmış seansınız bulunmuyor."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void fetchSessions("initial");
  }, [fetchSessions]);

  const visibleSessions = useMemo(
    () =>
      sessions.map((session) => {
        if (!submittedReviewBookingIds.has(session.bookingId)) return session;

        return {
          ...session,
          hasReview: true,
          canReview: false,
        };
      }),
    [sessions, submittedReviewBookingIds]
  );

  const upcomingSessions = useMemo(
    () =>
      visibleSessions
        .filter(isUpcoming)
        .sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime - b.startTime;
        }),
    [visibleSessions]
  );

  const pastSessions = useMemo(
    () => visibleSessions.filter(isPast).sort((a, b) => b.startTime - a.startTime),
    [visibleSessions]
  );

  const filteredSessions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return visibleSessions
      .filter((session) => {
        if (filter === "upcoming") return isUpcoming(session);
        if (filter === "completed") return session.status === "completed";
        if (filter === "cancelled") return isCancelledLike(session);
        return true;
      })
      .filter((session) => {
        const text = [
          session.id,
          session.expertName,
          session.expertTitle,
          session.status,
          statusLabel(session.status),
          session.date,
          session.timeRange,
        ]
          .join(" ")
          .toLowerCase();

        return !keyword || text.includes(keyword);
      })
      .sort((a, b) => {
        if (filter === "completed" || filter === "cancelled") return b.startTime - a.startTime;
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime - b.startTime;
      });
  }, [visibleSessions, filter, search]);

  const nextSession = upcomingSessions[0] || null;
  const completedCount = pastSessions.filter((session) => session.status === "completed").length;
  const cancelledCount = pastSessions.filter(isCancelledLike).length;
  const reviewableCount = visibleSessions.filter((session) => session.canReview).length;

  const handleReviewSubmitted = useCallback((bookingId: string) => {
    setSubmittedReviewBookingIds((current) => {
      const next = new Set(current);
      next.add(bookingId);
      return next;
    });

    setSessions((current) =>
      current.map((session) =>
        session.bookingId === bookingId
          ? {
              ...session,
              hasReview: true,
              canReview: false,
            }
          : session
      )
    );
  }, []);

  return (
    <section className="px-4 py-6 text-slate-900 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-600">
                Mindora alanın
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Seanslarım
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Yaklaşan ve geçmiş görüşmelerinizi takip edin. Hazır olan online görüşmelere
                güvenli bağlantı üzerinden katılabilir, tamamlanan seanslarınızı değerlendirebilirsiniz.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {token ? (
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="inline-flex items-center justify-center rounded-full bg-pine-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pine-900"
                >
                  Yeni seans al
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void fetchSessions("refresh")}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? "Yükleniyor..." : "Yenile"}
              </button>
              <Link
                href={buildTokenUrl("/client/dashboard", token)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                Genel bakış
              </Link>
              {nextSession?.canJoin ? (
                <a
                  href={nextSession.joinHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
                >
                  Görüşmeye Katıl
                </a>
              ) : null}
            </div>
          </div>
        </header>

        {softNotice ? (
          <NoticeCard
            title="Henüz planlanmış seansınız bulunmuyor"
            description="Yeni bir görüşme planlandığında tarih, saat ve katılım bilgileri burada görüntülenecektir."
            detail={softNotice}
            onRetry={() => void fetchSessions("refresh")}
          />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Yaklaşan" value={String(upcomingSessions.length)} description="Bugün ve sonrası" />
          <SummaryCard title="Tamamlanan" value={String(completedCount)} description="Geçmiş görüşme" />
          <SummaryCard title="Yorum Bekleyen" value={String(reviewableCount)} description="Değerlendirilebilir seans" />
          <SummaryCard title="İptal / Katılmadı" value={String(cancelledCount)} description="Takip gerektiren" />
          <SummaryCard title="Toplam" value={String(visibleSessions.length)} description="Tüm seans kayıtları" />
        </section>

        {nextSession ? (
          <section className="rounded-[2rem] border border-pine-900 bg-pine-900 p-6 text-white shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  Sıradaki Seans
                </p>
                <h2 className="mt-3 text-3xl font-semibold">{nextSession.date}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {nextSession.timeRange} • {nextSession.duration} • {nextSession.timezone}
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Uzman: <span className="font-semibold text-white">{nextSession.expertName}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={nextSession.chatHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
                >
                  Sohbete Git
                </Link>
                {nextSession.canJoin ? (
                  <a
                    href={nextSession.joinHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
                  >
                    Görüşmeye Katıl
                  </a>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-slate-300">
                    Görüşme Hazırlanıyor
                  </span>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Filtrele ve Ara</h2>
              <p className="mt-1 text-sm text-slate-500">
                Uzman adı, durum, tarih veya saat bilgisine göre arama yapın.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Seans ara..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-80"
            />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  filter === item.value
                    ? "bg-pine-800 text-white ring-pine-800"
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
              <h2 className="text-xl font-semibold text-slate-900">Seans Listesi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Seans detayları, durum bilgileri ve hızlı aksiyonlar.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Yükleniyor" : `${filteredSessions.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Seanslar yükleniyor" description="Randevu kayıtlarınız hazırlanıyor." />
          ) : filteredSessions.length > 0 ? (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onReview={() => setReviewSession(session)}
                  onCancel={() => setCancelSession(session)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Seans kaydı bulunamadı"
              description="Yeni bir görüşme planlandığında burada tarih, saat ve katılım bilgileriyle birlikte listelenecektir."
            />
          )}
        </section>
      </div>

      <ReviewModal
        session={reviewSession}
        onClose={() => setReviewSession(null)}
        onSubmitted={handleReviewSubmitted}
      />

      {bookingOpen ? <BookSessionModal token={token} onClose={() => setBookingOpen(false)} /> : null}

      <CancelModal
        key={cancelSession?.bookingId || "none"}
        session={cancelSession}
        token={token}
        onClose={() => setCancelSession(null)}
        onCancelled={() => {
          setCancelSession(null);
          void fetchSessions("refresh");
        }}
      />
    </section>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function SessionCard({
  session,
  onReview,
  onCancel,
}: {
  session: UiSession;
  onReview: () => void;
  onCancel: () => void;
}) {
  const config = statusConfig[session.status] || statusConfig.unknown;

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-lg font-semibold text-white">
            {session.expertPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.expertPhotoUrl} alt={session.expertName} className="h-full w-full object-cover" />
            ) : (
              session.expertName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
                .join("") || "M"
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{session.expertName}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.className}`}>
                {config.label}
              </span>
              {session.hasReview ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Yorum gönderildi
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{session.expertTitle}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{session.date}</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{session.timeRange}</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{session.duration}</span>
            </div>
            {session.status === "cancelled" ? (
              <p className="mt-3 text-xs font-medium text-slate-500">
                {session.refundStatus === "refunded"
                  ? "Ödemen iade edildi."
                  : session.refundStatus === "pending" || session.refundStatus === "failed"
                    ? "İaden işleniyor."
                    : session.lateCancellation
                      ? "Seansa 24 saatten az kala iptal edildiği için ücret iade edilmedi."
                      : session.cancelledBy === "expert"
                        ? "Seans uzmanın tarafından iptal edildi."
                        : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Link
            href={session.chatHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
          >
            Sohbete Git
          </Link>

          {session.canCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-50"
            >
              İptal et
            </button>
          ) : null}

          {session.canReview ? (
            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
            >
              Yorum Bırak
            </button>
          ) : session.hasReview ? (
            <span className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Yorumunuz Gönderildi
            </span>
          ) : session.canJoin ? (
            <a
              href={session.joinHref}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
            >
              Görüşmeye Katıl
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
              Görüşme Hazırlanıyor
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ReviewModal({
  session,
  onClose,
  onSubmitted,
}: {
  session: UiSession | null;
  onClose: () => void;
  onSubmitted: (bookingId: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitState, setSubmitState] = useState<ReviewSubmitState>({
    loading: false,
    error: "",
    success: "",
  });

  useEffect(() => {
    if (!session) return;

    setRating(5);
    setReviewText("");
    setSubmitState({ loading: false, error: "", success: "" });
  }, [session]);

  if (!session) return null;

  const remainingChars = 2000 - reviewText.length;

  async function handleSubmit() {
    if (!session) return;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setSubmitState({ loading: false, error: "Lütfen 1 ile 5 arasında puan seçin.", success: "" });
      return;
    }

    try {
      setSubmitState({ loading: true, error: "", success: "" });

      const response = await fetch("/api/reviews", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: session.bookingId,
          rating,
          reviewText,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Yorum gönderilemedi.");
      }

      onSubmitted(session.bookingId);
      setSubmitState({
        loading: false,
        error: "",
        success: data.message || "Yorumunuz moderasyon onayına gönderildi.",
      });
    } catch (error) {
      setSubmitState({
        loading: false,
        error: error instanceof Error ? error.message : "Yorum gönderilemedi.",
        success: "",
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-600">
              Seans Değerlendirmesi
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Uzmanı değerlendir</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {session.expertName} ile tamamlanan seansınız için deneyiminizi paylaşabilirsiniz.
              Yorumunuz admin onayından sonra yayınlanır.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitState.loading}
            className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Modalı kapat"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-800">Puanınız</p>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                disabled={submitState.loading || Boolean(submitState.success)}
                className={`text-4xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed ${
                  star <= rating ? "text-amber-400" : "text-slate-300"
                }`}
                aria-label={`${star} yıldız`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{rating}/5 puan</p>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-800">Yorumunuz</span>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value.slice(0, 2000))}
            disabled={submitState.loading || Boolean(submitState.success)}
            placeholder="Deneyiminizi kısa ve saygılı bir şekilde yazabilirsiniz. Bu alan isteğe bağlıdır."
            rows={5}
            className="mt-2 w-full resize-none rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          />
        </label>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-500">Yorumlar yayınlanmadan önce kontrol edilir.</p>
          <p className={`text-xs font-semibold ${remainingChars < 100 ? "text-rose-600" : "text-slate-400"}`}>
            {remainingChars} karakter
          </p>
        </div>

        {submitState.error ? (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {submitState.error}
          </div>
        ) : null}

        {submitState.success ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
            {submitState.success}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitState.loading}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitState.success ? "Kapat" : "Vazgeç"}
          </button>
          {!submitState.success ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitState.loading}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState.loading ? "Gönderiliyor..." : "Yorumu Gönder"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NoticeCard({
  title,
  description,
  detail,
  onRetry,
}: {
  title: string;
  description: string;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 text-indigo-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-indigo-800">{description}</p>
          {detail ? <p className="mt-1 text-xs font-semibold text-indigo-500">{detail}</p> : null}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md"
        >
          Yenile
        </button>
      </div>
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function ClientDashboardSessionsPage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 text-slate-900 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-semibold text-slate-600">Seanslar yükleniyor...</p>
          </div>
        </section>
      }
    >
      <ClientSessionsContent />
    </Suspense>
  );
}

function CancelModal({
  session,
  token,
  onClose,
  onCancelled,
}: {
  session: UiSession | null;
  token: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState("");
  const [state, setState] = useState<{ loading: boolean; error: string }>({ loading: false, error: "" });

  if (!session) return null;

  async function confirmCancel() {
    if (!session) return;
    setState({ loading: true, error: "" });
    try {
      const response = await fetch(`/api/sessions/bookings/${encodeURIComponent(session.bookingId)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: reason.trim() || undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Seans iptal edilemedi.");
      onCancelled();
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : "Seans iptal edilemedi." });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-900">Seansı iptal et</h2>
        <p className="mt-2 text-sm text-slate-600">
          {session.expertName} · {session.date} {session.timeRange}
        </p>

        <div
          className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${
            session.freeCancellation ? "bg-pine-50 text-pine-900" : "bg-amber-50 text-amber-900"
          }`}
        >
          {session.freeCancellation
            ? "Seansa 24 saatten fazla var. İptal edersen ödemenin tamamı kartına iade edilir."
            : "Seansa 24 saatten az kaldı. İptal kuralı gereği bu seansın ücreti iade edilmez ve uzmanına ödenir."}
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700">
          İstersen sebebini yaz
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 500))}
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal outline-none focus:border-slate-400 focus:bg-white"
            placeholder="Örneğin: o saatte işim çıktı"
          />
        </label>

        {state.error ? <p className="mt-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={state.loading}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void confirmCancel()}
            disabled={state.loading}
            className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {state.loading ? "İptal ediliyor..." : "Seansı iptal et"}
          </button>
        </div>
      </div>
    </div>
  );
}

type BookableSlot = { startAt: string; endAt: string; slotDurationMinutes: number };

function istanbulDayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function BookSessionModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [state, setState] = useState<{ loading: boolean; error: string }>({ loading: true, error: "" });
  const [expert, setExpert] = useState<{ name: string | null; title: string | null; price: number } | null>(null);
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [freeHours, setFreeHours] = useState(24);
  const [day, setDay] = useState("");
  const [selected, setSelected] = useState<BookableSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/client/slots?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (cancelled) return;
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Uygun saatler alınamadı.");
        const list = (data.slots || []) as BookableSlot[];
        setExpert(data.expert);
        setSlots(list);
        setFreeHours(Number(data.freeCancellationHours) || 24);
        setDay(list[0] ? istanbulDayKey(list[0].startAt) : "");
        setState({ loading: false, error: "" });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ loading: false, error: err instanceof Error ? err.message : "Uygun saatler alınamadı." });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const days = useMemo(() => {
    const map = new Map<string, BookableSlot[]>();
    for (const slot of slots) {
      const key = istanbulDayKey(slot.startAt);
      map.set(key, [...(map.get(key) || []), slot]);
    }
    return [...map.entries()];
  }, [slots]);

  const daySlots = days.find(([key]) => key === day)?.[1] || [];
  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const fmtLong = (iso: string) =>
    new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const price = expert ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(expert.price) : "";

  async function goToPayment() {
    if (!selected) return;
    setSubmitting(true);
    setState((s) => ({ ...s, error: "" }));
    try {
      const res = await fetch("/api/client/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, startAt: selected.startAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.paymentPageUrl) throw new Error(data?.error || "Ödeme başlatılamadı.");
      window.location.href = data.paymentPageUrl;
    } catch (err) {
      setSubmitting(false);
      setState((s) => ({ ...s, error: err instanceof Error ? err.message : "Ödeme başlatılamadı." }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Yeni seans al">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Yeni seans al</h2>
            <p className="mt-1 text-sm text-slate-600">
              {expert ? `${expert.name || "Uzmanın"} · 50 dakika online · ${price}` : "Uzmanının uygun saatleri"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100" aria-label="Kapat">
            Kapat
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {state.loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Uygun saatler yükleniyor...</p>
          ) : !expert ? (
            <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{state.error}</p>
          ) : days.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              Önümüzdeki üç haftada uzmanının boş saati görünmüyor. Sohbetten ona yazabilir ya da Mindora ekibinden destek isteyebilirsin.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">Gün seç</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {days.map(([key, list]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDay(key);
                      setSelected(null);
                    }}
                    className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition ${
                      key === day ? "bg-pine-800 text-white ring-pine-800" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"
                    }`}
                  >
                    {fmtDay(list[0].startAt)}
                  </button>
                ))}
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-700">Saat seç</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {daySlots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => setSelected(slot)}
                    className={`rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition ${
                      selected?.startAt === slot.startAt ? "bg-lilac-100 text-lilac-900 ring-lilac-300" : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-white"
                    }`}
                  >
                    {fmtTime(slot.startAt)}
                  </button>
                ))}
              </div>

              {selected ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <p className="font-semibold text-slate-900">{fmtLong(selected.startAt)}</p>
                  <p className="mt-1">Seans ücreti: <span className="font-semibold text-slate-900">{price}</span>. Ek ücret yok.</p>
                  <p className="mt-1">Seansa {freeHours} saatten fazla varken iptal edersen ücretin tamamı iade edilir.</p>
                </div>
              ) : null}

              {state.error ? <p className="mt-4 text-sm font-semibold text-rose-700">{state.error}</p> : null}
            </>
          )}
        </div>

        {expert && days.length > 0 ? (
          <div className="border-t border-slate-100 p-6">
            <button
              type="button"
              onClick={() => void goToPayment()}
              disabled={!selected || submitting}
              className="w-full rounded-full bg-pine-800 px-5 py-3.5 font-semibold text-white transition hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Ödeme sayfası açılıyor..." : selected ? `Ödemeye geç · ${price}` : "Bir saat seç"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">Ödeme Iyzico güvencesiyle alınır. Saatin ödeme süresince 20 dakika senin için tutulur.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
