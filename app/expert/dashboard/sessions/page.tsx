'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type SessionStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'canceled'
  | 'no_show'
  | 'unknown'
  | string

type NormalizedSessionStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'unknown'

type SessionFilter = 'all' | 'today' | 'upcoming' | 'active' | 'past'

type ApiSession = {
  id: string
  conversationId: string | null
  clientId: string | null
  clientName: string
  clientEmail?: string | null
  topic?: string | null
  scheduledStartAt: string | null
  scheduledEndAt: string | null
  status: SessionStatus
  statusLabel?: string
  sessionReady?: boolean
  liveSessionId?: string | null
  joinHref?: string | null
  chatHref?: string | null
}

type SessionsResponse = {
  ok: boolean
  sessions?: ApiSession[]
  summary?: {
    total?: number
    upcoming?: number
    completed?: number
    cancelled?: number
    active?: number
  }
  error?: string
}

type UiSession = {
  id: string
  clientName: string
  clientEmail: string | null
  topic: string
  date: string
  time: string
  duration: string
  status: NormalizedSessionStatus
  conversationHref: string
  sessionHref: string
  canJoin: boolean
  scheduledStartAt: string | null
  scheduledEndAt: string | null
  startTime: number
  endTime: number
}

const JOINABLE_STATUSES: NormalizedSessionStatus[] = ['confirmed', 'active']
const UPCOMING_STATUSES: NormalizedSessionStatus[] = ['pending', 'scheduled', 'confirmed', 'active']
const FINISHED_STATUSES: NormalizedSessionStatus[] = ['completed', 'cancelled', 'no_show']

const statusConfig: Record<
  NormalizedSessionStatus,
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: 'Beklemede',
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
    dotClassName: 'bg-amber-500',
  },
  scheduled: {
    label: 'Planlandı',
    className: 'bg-blue-50 text-blue-700 ring-blue-100',
    dotClassName: 'bg-blue-500',
  },
  confirmed: {
    label: 'Onaylandı',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dotClassName: 'bg-emerald-500',
  },
  active: {
    label: 'Aktif',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    dotClassName: 'bg-indigo-500',
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    dotClassName: 'bg-slate-500',
  },
  cancelled: {
    label: 'İptal',
    className: 'bg-rose-50 text-rose-700 ring-rose-100',
    dotClassName: 'bg-rose-500',
  },
  no_show: {
    label: 'Gelmedi',
    className: 'bg-orange-50 text-orange-700 ring-orange-100',
    dotClassName: 'bg-orange-500',
  },
  unknown: {
    label: 'Belirsiz',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    dotClassName: 'bg-slate-400',
  },
}

const filterLabels: Record<SessionFilter, string> = {
  all: 'Tümü',
  today: 'Bugün',
  upcoming: 'Yaklaşan',
  active: 'Aktif',
  past: 'Geçmiş',
}

function normalizeStatus(value: string | null | undefined): NormalizedSessionStatus {
  const normalized = String(value || '').toLowerCase().trim()

  if (
    normalized === 'pending' ||
    normalized === 'scheduled' ||
    normalized === 'confirmed' ||
    normalized === 'active' ||
    normalized === 'completed' ||
    normalized === 'no_show'
  ) {
    return normalized
  }

  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled'

  return 'unknown'
}

function getTime(value: string | null | undefined) {
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatDate(value: string | null | undefined) {
  const time = getTime(value)
  if (!time) return 'Tarih yok'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(time))
}

function formatShortDate(value: string | null | undefined) {
  const time = getTime(value)
  if (!time) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(time))
}

function formatTime(value: string | null | undefined) {
  const time = getTime(value)
  if (!time) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))
}

function calculateDuration(start: string | null | undefined, end: string | null | undefined) {
  const startTime = getTime(start)
  const endTime = getTime(end)

  if (!startTime || !endTime || endTime <= startTime) return '50 dk'

  return `${Math.round((endTime - startTime) / 60000)} dk`
}

function buildFallbackId(session: ApiSession, index: number) {
  return [session.id, session.conversationId, session.clientId, session.scheduledStartAt, index]
    .filter(Boolean)
    .join('-')
}

function toUiSession(session: ApiSession, index: number): UiSession {
  const status = normalizeStatus(session.status)
  const conversationHref =
    session.chatHref ||
    (session.conversationId ? `/expert/chat/${session.conversationId}` : '/expert/dashboard/clients')
  const sessionHref = session.joinHref || (session.id ? `/expert/session/${session.id}` : '#')
  const startTime = getTime(session.scheduledStartAt)
  const endTime = getTime(session.scheduledEndAt)
  const canJoin =
    Boolean(session.sessionReady || session.liveSessionId || session.joinHref) &&
    JOINABLE_STATUSES.includes(status)

  return {
    id: String(session.id || buildFallbackId(session, index)),
    clientName: session.clientName?.trim() || 'Danışan',
    clientEmail: session.clientEmail?.trim() || null,
    topic: session.topic?.trim() || 'Online görüşme',
    date: formatDate(session.scheduledStartAt),
    time: formatTime(session.scheduledStartAt),
    duration: calculateDuration(session.scheduledStartAt, session.scheduledEndAt),
    status,
    conversationHref,
    sessionHref,
    canJoin,
    scheduledStartAt: session.scheduledStartAt,
    scheduledEndAt: session.scheduledEndAt,
    startTime,
    endTime,
  }
}

function isFutureOrToday(session: UiSession) {
  if (session.status === 'active') return true
  if (!session.startTime) return false

  return session.startTime >= Date.now()
}

function isUpcomingSession(session: UiSession) {
  return UPCOMING_STATUSES.includes(session.status) && isFutureOrToday(session)
}

function isPastSession(session: UiSession) {
  if (FINISHED_STATUSES.includes(session.status)) return true
  if (!session.startTime) return false

  return session.startTime < Date.now() && session.status !== 'active'
}

function isToday(session: UiSession) {
  if (!session.startTime) return false

  const now = new Date()
  const date = new Date(session.startTime)

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Seans bilgileri şu anda görüntülenemiyor. Bağlantınızı kontrol edip tekrar deneyin.'
}

function getNextSessionLabel(session: UiSession | null) {
  if (!session) return 'Planlı görüşme yok'
  if (session.status === 'active') return 'Şu anda aktif'
  return `${formatShortDate(session.scheduledStartAt)} · ${session.time}`
}

export default function ExpertDashboardSessionsPage() {
  const [sessions, setSessions] = useState<UiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [softError, setSoftError] = useState('')
  const [activeFilter, setActiveFilter] = useState<SessionFilter>('all')

  const fetchSessions = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    const controller = new AbortController()

    try {
      if (mode === 'initial') {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setSoftError('')

      const response = await fetch('/api/expert/sessions', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })

      const data = (await response.json().catch(() => ({}))) as Partial<SessionsResponse>

      if (!response.ok || data.ok === false) {
        throw new Error(
          data.error ||
            'Seans bilgileri şu anda görüntülenemiyor. Birkaç dakika sonra tekrar deneyebilirsiniz.'
        )
      }

      setSessions((data.sessions || []).map(toUiSession))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      setSessions([])
      setSoftError(getSafeErrorMessage(error))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }

    return () => controller.abort()
  }, [])

  useEffect(() => {
    void fetchSessions('initial')
  }, [fetchSessions])

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter(isUpcomingSession)
        .sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0
          if (!a.startTime) return 1
          if (!b.startTime) return -1
          return a.startTime - b.startTime
        }),
    [sessions]
  )

  const pastSessions = useMemo(
    () => sessions.filter(isPastSession).sort((a, b) => b.startTime - a.startTime),
    [sessions]
  )

  const todaySessions = useMemo(() => upcomingSessions.filter(isToday), [upcomingSessions])

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'active'),
    [sessions]
  )

  const nextSession = upcomingSessions[0] || null

  const filteredSessions = useMemo(() => {
    if (activeFilter === 'today') return todaySessions
    if (activeFilter === 'upcoming') return upcomingSessions
    if (activeFilter === 'active') return activeSessions
    if (activeFilter === 'past') return pastSessions
    return sessions
      .slice()
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0
        if (!a.startTime) return 1
        if (!b.startTime) return -1
        return a.startTime - b.startTime
      })
  }, [activeFilter, activeSessions, pastSessions, sessions, todaySessions, upcomingSessions])

  const summaryCards = [
    {
      title: 'Bugünkü Görüşme',
      value: todaySessions.length.toString(),
      description: 'Bugün planlanan seans',
      detail: nextSession ? `Sıradaki: ${getNextSessionLabel(nextSession)}` : 'Bugün için sakin akış',
    },
    {
      title: 'Yaklaşan Görüşme',
      value: upcomingSessions.length.toString(),
      description: 'Bugün ve sonrası',
      detail: getNextSessionLabel(nextSession),
    },
    {
      title: 'Aktif Görüşme',
      value: activeSessions.length.toString(),
      description: 'Şu anda devam eden',
      detail: activeSessions.length > 0 ? 'Katılım kontrolü aktif' : 'Canlı görüşme yok',
    },
    {
      title: 'Tamamlanan',
      value: pastSessions.filter((session) => session.status === 'completed').length.toString(),
      description: 'Geçmiş görüşmeler',
      detail: `${pastSessions.length} toplam geçmiş kayıt`,
    },
  ]

  const filterCounts: Record<SessionFilter, number> = {
    all: sessions.length,
    today: todaySessions.length,
    upcoming: upcomingSessions.length,
    active: activeSessions.length,
    past: pastSessions.length,
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <HeroHeader
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => void fetchSessions('refresh')}
          nextSession={nextSession}
        />

        {softError ? (
          <NoticeCard
            title="Görüşme bilgileri geçici olarak gösterilemiyor"
            description={softError}
            onAction={() => void fetchSessions('refresh')}
          />
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <SummaryCard key={item.title} {...item} />
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                  Seans yönetimi
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                  Görüşme Akışı
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                  Güncel, aktif ve geçmiş görüşmeleri tek listeden takip edin.
                </p>
              </div>

              <Link
                href="/expert/dashboard/availability"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
              >
                Müsaitlikleri Düzenle
              </Link>
            </div>

            <FilterBar
              activeFilter={activeFilter}
              counts={filterCounts}
              onChange={setActiveFilter}
            />

            {loading ? (
              <LoadingState message="Görüşmeler yükleniyor..." />
            ) : filteredSessions.length > 0 ? (
              <div className="mt-5 space-y-4">
                {filteredSessions.map((session) => (
                  <SessionCard
                    key={`${activeFilter}-${session.id}`}
                    session={session}
                    mode={isPastSession(session) ? 'past' : 'upcoming'}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={activeFilter === 'past' ? 'Henüz geçmiş görüşme yok' : 'Henüz görüşme yok'}
                description={
                  activeFilter === 'past'
                    ? 'Tamamlanan, iptal edilen veya tarihi geçmiş görüşmeler burada listelenecek.'
                    : 'Danışanlarınız uygun saatlerinizi seçip randevu oluşturduğunda görüşme bilgileri burada görüntülenecek.'
                }
                actionHref="/expert/dashboard/availability"
                actionLabel="Müsaitlikleri düzenle"
              />
            )}
          </section>

          <aside className="space-y-6">
            <TodayFlowCard sessions={todaySessions} loading={loading} />
            <PreparationCard />
          </aside>
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Arşiv
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Geçmiş Görüşmeler</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tamamlanan, iptal edilen veya tarihi geçmiş görüşmeler.
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingState message="Geçmiş görüşmeler yükleniyor..." />
          ) : pastSessions.length > 0 ? (
            <PastSessionsTable sessions={pastSessions} />
          ) : (
            <EmptyState
              title="Henüz geçmiş görüşme yok"
              description="Görüşmeler tamamlandıkça burada profesyonel bir arşiv olarak listelenecek."
            />
          )}
        </section>
      </section>
    </main>
  )
}

function HeroHeader({
  loading,
  refreshing,
  nextSession,
  onRefresh,
}: {
  loading: boolean
  refreshing: boolean
  nextSession: UiSession | null
  onRefresh: () => void
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="relative p-5 sm:p-6 lg:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-50 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
              Mindora Uzman Paneli
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Görüşmeler
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Bugünkü, yaklaşan ve geçmiş görüşmelerinizi tek ekrandan takip edin.
              Danışan sohbetine dönebilir ve hazır olan görüşmelere güvenli şekilde katılabilirsiniz.
            </p>

            <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span className="truncate font-bold">Sıradaki görüşme: {getNextSessionLabel(nextSession)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {loading || refreshing ? 'Yükleniyor...' : 'Yenile'}
            </button>
            <Link
              href="/expert/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              Dashboard
            </Link>
            <Link
              href="/expert/dashboard/availability"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm shadow-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
            >
              Müsaitlik
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterBar({
  activeFilter,
  counts,
  onChange,
}: {
  activeFilter: SessionFilter
  counts: Record<SessionFilter, number>
  onChange: (filter: SessionFilter) => void
}) {
  const filters = Object.keys(filterLabels) as SessionFilter[]

  return (
    <div className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-1">
      {filters.map((filter) => {
        const isActive = activeFilter === filter

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className={`inline-flex min-w-max items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition ${
              isActive
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
            }`}
          >
            {filterLabels[filter]}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-500'
              }`}
            >
              {counts[filter]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PastSessionsTable({ sessions }: { sessions: UiSession[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-4 font-black">Danışan</th>
              <th className="px-5 py-4 font-black">Tarih</th>
              <th className="px-5 py-4 font-black">Saat</th>
              <th className="px-5 py-4 font-black">Süre</th>
              <th className="px-5 py-4 font-black">Durum</th>
              <th className="px-5 py-4 font-black">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sessions.map((session) => (
              <tr key={session.id} className="align-top transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{session.clientName}</p>
                  <p className="mt-1 text-xs text-slate-500">{session.topic}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{session.date}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{session.time}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{session.duration}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge status={session.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <Link
                    href={session.conversationHref}
                    className="text-sm font-black text-indigo-600 transition hover:text-indigo-700"
                  >
                    Sohbete git
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SessionCard({ session, mode }: { session: UiSession; mode: 'upcoming' | 'past' }) {
  const config = statusConfig[session.status] || statusConfig.unknown

  return (
    <article className="group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${config.dotClassName}`} />
            <h3 className="truncate text-base font-black text-slate-950">{session.clientName}</h3>
            <StatusBadge status={session.status} />
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">{session.topic}</p>

          {session.clientEmail ? (
            <p className="mt-1 truncate text-xs text-slate-400">{session.clientEmail}</p>
          ) : null}

          <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 sm:flex sm:flex-wrap">
            <InfoPill label={session.date} />
            <InfoPill label={session.time} />
            <InfoPill label={session.duration} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[250px]">
          <Link
            href={session.conversationHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Sohbete Git
          </Link>

          {mode === 'upcoming' ? (
            session.canJoin ? (
              <Link
                href={session.sessionHref}
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-700"
              >
                Görüşmeye Katıl
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-500 ring-1 ring-slate-200">
                Görüşme Hazırlanıyor
              </span>
            )
          ) : (
            <Link
              href={session.conversationHref}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Detayları Gör
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

function TodayFlowCard({ sessions, loading }: { sessions: UiSession[]; loading: boolean }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Bugünün Akışı</h2>
          <p className="mt-1 text-sm text-slate-500">Gün içindeki görüşme planınız.</p>
        </div>
        <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {sessions.length} seans
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <LoadingState message="Bugünün akışı yükleniyor..." compact />
        ) : sessions.length > 0 ? (
          sessions.slice(0, 4).map((session) => (
            <Link
              key={session.id}
              href={session.conversationHref}
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-black text-slate-900">{session.clientName}</p>
                <StatusBadge status={session.status} />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">
                {session.time} · {session.duration}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm font-black text-slate-800">Bugün planlı görüşme yok</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Uygunluk takviminizden yeni saat aralıkları ekleyebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function PreparationCard() {
  return (
    <section className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-black text-indigo-950">Görüşme Hazırlığı</h2>
      <p className="mt-2 text-sm leading-6 text-indigo-800">
        Görüşme başlamadan önce internet bağlantınızı, kamera ve mikrofon izinlerinizi kontrol edin.
        Hazır görüşmelerde katılım butonu aktif olur.
      </p>

      <div className="mt-5 space-y-3">
        <ChecklistItem title="Kamera ve mikrofonu kontrol et" />
        <ChecklistItem title="Danışan notlarını gözden geçir" />
        <ChecklistItem title="Görüşme sonrası kısa not bırak" />
        <ChecklistItem title="Gerekirse yeni randevu planla" />
      </div>
    </section>
  )
}

function NoticeCard({
  title,
  description,
  onAction,
}: {
  title: string
  description: string
  onAction: () => void
}) {
  return (
    <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
        >
          Tekrar Dene
        </button>
      </div>
    </section>
  )
}

function SummaryCard({
  title,
  value,
  description,
  detail,
}: {
  title: string
  value: string
  description: string
  detail: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <p className="mt-4 truncate rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
        {detail}
      </p>
    </article>
  )
}

function StatusBadge({ status }: { status: NormalizedSessionStatus }) {
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
      {label}
    </span>
  )
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black text-indigo-600 ring-1 ring-slate-200">
        +
      </div>
      <p className="mt-4 text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

function LoadingState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center ${
        compact ? 'py-5' : 'mt-5 py-8'
      }`}
    >
      <div className="mx-auto mb-3 h-2 w-24 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-400" />
      </div>
      <p className="text-sm font-black text-slate-800">{message}</p>
    </div>
  )
}

function ChecklistItem({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-indigo-100">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-indigo-600 ring-1 ring-indigo-100">
        ✓
      </span>
      <span className="text-sm font-black text-indigo-950">{title}</span>
    </div>
  )
}
