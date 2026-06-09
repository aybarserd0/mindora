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

type NormalizedSessionStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'unknown'

type ApiSession = {
  id: string
  conversationId: string | null
  clientId: string | null
  clientName: string
  clientEmail?: string | null
  topic?: string | null
  scheduledStartAt: string | null
  scheduledEndAt: string | null
  status: SessionStatus | string
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
  startTime: number
}

const JOINABLE_STATUSES: NormalizedSessionStatus[] = ['confirmed', 'active']
const UPCOMING_STATUSES: NormalizedSessionStatus[] = ['pending', 'scheduled', 'confirmed', 'active']
const FINISHED_STATUSES: NormalizedSessionStatus[] = ['completed', 'cancelled', 'no_show']

const statusConfig: Record<NormalizedSessionStatus, { label: string; className: string }> = {
  pending: {
    label: 'Beklemede',
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  scheduled: {
    label: 'Planlandı',
    className: 'bg-blue-50 text-blue-700 ring-blue-100',
  },
  confirmed: {
    label: 'Onaylandı',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  active: {
    label: 'Aktif',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
  cancelled: {
    label: 'İptal',
    className: 'bg-rose-50 text-rose-700 ring-rose-100',
  },
  no_show: {
    label: 'Gelmedi',
    className: 'bg-orange-50 text-orange-700 ring-orange-100',
  },
  unknown: {
    label: 'Belirsiz',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
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

  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'cancelled'
  }

  return 'unknown'
}

function getTime(value: string | null | undefined) {
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatDate(value: string | null | undefined) {
  const time = getTime(value)
  if (!time) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
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
  return [
    session.id,
    session.conversationId,
    session.clientId,
    session.scheduledStartAt,
    index,
  ]
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
    startTime,
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

export default function ExpertDashboardSessionsPage() {
  const [sessions, setSessions] = useState<UiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [softError, setSoftError] = useState('')

  const fetchSessions = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
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
      setSessions([])
      setSoftError(getSafeErrorMessage(error))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
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
    () =>
      sessions
        .filter(isPastSession)
        .sort((a, b) => b.startTime - a.startTime),
    [sessions]
  )

  const todaySessions = useMemo(
    () => upcomingSessions.filter(isToday),
    [upcomingSessions]
  )

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'active'),
    [sessions]
  )

  const summaryCards = [
    {
      title: 'Bugünkü Görüşme',
      value: todaySessions.length.toString(),
      description: 'Bugün planlanan seans',
    },
    {
      title: 'Yaklaşan Görüşme',
      value: upcomingSessions.length.toString(),
      description: 'Bugün ve sonrası',
    },
    {
      title: 'Aktif Görüşme',
      value: activeSessions.length.toString(),
      description: 'Şu anda devam eden',
    },
    {
      title: 'Tamamlanan',
      value: pastSessions.filter((session) => session.status === 'completed').length.toString(),
      description: 'Geçmiş görüşmeler',
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Uzman Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Görüşmeler
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Bugünkü, yaklaşan ve geçmiş görüşmelerinizi tek ekrandan takip edin.
                Danışan sohbetine dönebilir ve hazır olan görüşmelere katılabilirsiniz.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchSessions('refresh')}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? 'Yükleniyor...' : 'Yenile'}
              </button>
              <Link
                href="/expert/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Dashboard
              </Link>
              <Link
                href="/expert/dashboard/availability"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
              >
                Müsaitlikleri Düzenle
              </Link>
            </div>
          </div>
        </div>

        {softError ? (
          <NoticeCard
            title="Görüşme bilgileri geçici olarak gösterilemiyor"
            description={softError}
            onAction={() => void fetchSessions('refresh')}
          />
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((item) => (
            <SummaryCard key={item.title} {...item} />
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Yaklaşan Görüşmeler</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bugün ve sonraki günlerde planlanan görüşmeler.
                </p>
              </div>

              <Link
                href="/expert/dashboard/availability"
                className="text-sm font-black text-indigo-600 transition hover:text-indigo-700"
              >
                Yeni uygunluk ekle
              </Link>
            </div>

            {loading ? (
              <LoadingState message="Yaklaşan görüşmeler yükleniyor..." />
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} mode="upcoming" />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henüz yaklaşan görüşme yok"
                description="Danışanlarınız uygun saatlerinizi seçip randevu oluşturduğunda görüşme bilgileri burada görüntülenecek."
                actionHref="/expert/dashboard/availability"
                actionLabel="Müsaitlikleri düzenle"
              />
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Bugünün Akışı</h2>
              <p className="mt-1 text-sm text-slate-500">
                Görüşme öncesi kısa hazırlık listesi.
              </p>

              <div className="mt-6 space-y-3">
                <ChecklistItem title="Kamera ve mikrofonu kontrol et" />
                <ChecklistItem title="Danışan notlarını gözden geçir" />
                <ChecklistItem title="Görüşme sonrası kısa not bırak" />
                <ChecklistItem title="Gerekirse yeni randevu planla" />
              </div>
            </section>

            <section className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <h2 className="text-lg font-black text-indigo-950">Görüşme Hazırlığı</h2>
              <p className="mt-2 text-sm leading-6 text-indigo-800">
                Görüşme başlamadan önce internet bağlantınızı, kamera ve mikrofon
                izinlerinizi kontrol edin. Hazır görüşmelerde katılım butonu aktif olur.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Geçmiş Görüşmeler</h2>
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
              description="Tamamlanan veya tarihi geçmiş görüşmeler burada listelenecek."
            />
          )}
        </section>
      </section>
    </main>
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
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                  {session.date}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                  {session.time}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                  {session.duration}
                </td>
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

function SessionCard({
  session,
  mode,
}: {
  session: UiSession
  mode: 'upcoming' | 'past'
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-950">{session.clientName}</h3>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{session.topic}</p>
          {session.clientEmail ? (
            <p className="mt-1 text-xs text-slate-400">{session.clientEmail}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              {session.date}
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              {session.time}
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              {session.duration}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Link
            href={session.conversationHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Sohbete Git
          </Link>

          {mode === 'upcoming' ? (
            session.canJoin ? (
              <Link
                href={session.sessionHref}
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-700"
              >
                Görüşmeye Katıl
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-slate-200 px-4 py-2 text-sm font-black text-slate-500">
                Görüşme Hazırlanıyor
              </span>
            )
          ) : null}
        </div>
      </div>
    </article>
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
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
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
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
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

function LoadingState({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-black text-slate-800">{message}</p>
    </div>
  )
}

function ChecklistItem({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-indigo-600 ring-1 ring-indigo-100">
        ✓
      </span>
      <span className="text-sm font-black text-slate-700">{title}</span>
    </div>
  )
}
