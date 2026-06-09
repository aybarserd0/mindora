'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type ClientSessionStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'canceled'
  | 'no_show'
  | 'rescheduled'
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
  | 'rescheduled'
  | 'unknown'

type ApiClientSession = {
  id: string
  conversationId?: string | null
  expertId?: string | null
  expertName?: string | null
  expertTitle?: string | null
  expertPhotoUrl?: string | null
  scheduledStartAt?: string | null
  scheduledEndAt?: string | null
  timezone?: string | null
  status?: ClientSessionStatus | null
  sessionReady?: boolean | null
  liveSessionId?: string | null
  joinHref?: string | null
  chatHref?: string | null
  createdAt?: string | null
}

type ClientSessionsResponse = {
  ok?: boolean
  sessions?: ApiClientSession[]
  upcomingSessions?: ApiClientSession[]
  completedSessions?: ApiClientSession[]
  error?: string
}

type UiSession = {
  id: string
  conversationId: string | null
  expertName: string
  expertTitle: string
  expertPhotoUrl: string | null
  scheduledStartAt: string | null
  scheduledEndAt: string | null
  timezone: string
  status: NormalizedSessionStatus
  date: string
  timeRange: string
  duration: string
  startTime: number
  canJoin: boolean
  joinHref: string
  chatHref: string
}

type SessionFilter = 'all' | 'upcoming' | 'completed' | 'cancelled'

const JOINABLE_STATUSES: NormalizedSessionStatus[] = ['scheduled', 'confirmed', 'active']
const UPCOMING_STATUSES: NormalizedSessionStatus[] = [
  'pending',
  'scheduled',
  'confirmed',
  'active',
  'rescheduled',
]
const FINISHED_STATUSES: NormalizedSessionStatus[] = ['completed', 'cancelled', 'no_show']

const statusConfig: Record<NormalizedSessionStatus, { label: string; className: string }> = {
  pending: { label: 'Beklemede', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  scheduled: { label: 'Planlandı', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  confirmed: { label: 'Onaylandı', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  active: { label: 'Aktif', className: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
  completed: { label: 'Tamamlandı', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  cancelled: { label: 'İptal', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  no_show: { label: 'Katılmadı', className: 'bg-orange-50 text-orange-700 ring-orange-100' },
  rescheduled: { label: 'Ertelendi', className: 'bg-purple-50 text-purple-700 ring-purple-100' },
  unknown: { label: 'Belirlenmedi', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

const filters: Array<{ label: string; value: SessionFilter }> = [
  { label: 'Tümü', value: 'all' },
  { label: 'Yaklaşan', value: 'upcoming' },
  { label: 'Tamamlanan', value: 'completed' },
  { label: 'İptal / Katılmadı', value: 'cancelled' },
]

function normalizeStatus(value: string | null | undefined): NormalizedSessionStatus {
  const normalized = String(value || '').trim().toLowerCase()

  if (
    normalized === 'pending' ||
    normalized === 'scheduled' ||
    normalized === 'confirmed' ||
    normalized === 'active' ||
    normalized === 'completed' ||
    normalized === 'no_show' ||
    normalized === 'rescheduled'
  ) {
    return normalized
  }

  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled'

  return 'unknown'
}

function getDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function getTime(value?: string | null) {
  return getDate(value)?.getTime() || 0
}

function formatDate(value?: string | null) {
  const date = getDate(value)
  if (!date) return 'Tarih bekleniyor'

  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatTimeRange(startAt?: string | null, endAt?: string | null) {
  const start = getDate(startAt)
  const end = getDate(endAt)

  if (!start || !end) return 'Saat bekleniyor'

  const formatter = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function calculateDuration(startAt?: string | null, endAt?: string | null) {
  const start = getTime(startAt)
  const end = getTime(endAt)

  if (!start || !end || end <= start) return '50 dk'

  return `${Math.round((end - start) / 60000)} dk`
}

function buildTokenUrl(path: string | null | undefined, token: string) {
  if (!path) return '#'
  if (!token) return path

  try {
    const isAbsolute = /^https?:\/\//i.test(path)
    const url = isAbsolute ? new URL(path) : new URL(path, 'https://mindora.local')

    if (!url.searchParams.get('token')) {
      url.searchParams.set('token', token)
    }

    if (isAbsolute) return url.toString()

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    if (path.includes('token=')) return path

    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}token=${encodeURIComponent(token)}`
  }
}

function fallbackId(session: ApiClientSession, index: number) {
  return [session.id, session.conversationId, session.scheduledStartAt, index]
    .filter(Boolean)
    .join('-')
}

function toUiSession(session: ApiClientSession, index: number, token: string): UiSession {
  const status = normalizeStatus(session.status)
  const startTime = getTime(session.scheduledStartAt)
  const rawJoinHref =
    session.joinHref || (session.id ? `/client/session/${encodeURIComponent(session.id)}` : null)
  const rawChatHref =
    session.chatHref ||
    (session.conversationId ? `/client/chat/${encodeURIComponent(session.conversationId)}` : null)

  const canJoin =
    JOINABLE_STATUSES.includes(status) &&
    Boolean(session.sessionReady || session.liveSessionId || session.joinHref)

  return {
    id: String(session.id || fallbackId(session, index) || `session-${index}`),
    conversationId: session.conversationId || null,
    expertName: session.expertName?.trim() || 'Uzman eşleştirme sürecinde',
    expertTitle: session.expertTitle?.trim() || 'Mindora Uzmanı',
    expertPhotoUrl: session.expertPhotoUrl?.trim() || null,
    scheduledStartAt: session.scheduledStartAt || null,
    scheduledEndAt: session.scheduledEndAt || null,
    timezone: session.timezone || 'Europe/Istanbul',
    status,
    date: formatDate(session.scheduledStartAt),
    timeRange: formatTimeRange(session.scheduledStartAt, session.scheduledEndAt),
    duration: calculateDuration(session.scheduledStartAt, session.scheduledEndAt),
    startTime,
    canJoin,
    joinHref: buildTokenUrl(rawJoinHref, token),
    chatHref: buildTokenUrl(rawChatHref, token),
  }
}

function isUpcoming(session: UiSession) {
  if (session.status === 'active') return true
  if (!UPCOMING_STATUSES.includes(session.status)) return false
  if (!session.startTime) return true

  return session.startTime >= Date.now()
}

function isPast(session: UiSession) {
  if (FINISHED_STATUSES.includes(session.status)) return true
  if (!session.startTime) return false

  return session.startTime < Date.now() && session.status !== 'active'
}

function isCancelledLike(session: UiSession) {
  return session.status === 'cancelled' || session.status === 'no_show'
}

function statusLabel(status: NormalizedSessionStatus) {
  return statusConfig[status]?.label || statusConfig.unknown.label
}

function ClientSessionsContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [sessions, setSessions] = useState<UiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [softNotice, setSoftNotice] = useState('')
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [search, setSearch] = useState('')

  const fetchSessions = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!token) {
        setSoftNotice('Güvenli erişim bağlantısı bulunamadı. Size iletilen danışan paneli bağlantısını kullanabilirsiniz.')
        setSessions([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      try {
        if (mode === 'initial') setLoading(true)
        else setRefreshing(true)

        setSoftNotice('')

        const response = await fetch(`/api/client/sessions?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        const data = (await response.json().catch(() => ({}))) as ClientSessionsResponse

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || 'Henüz planlanmış seansınız bulunmuyor.')
        }

        const merged = [
          ...(data.sessions || []),
          ...(data.upcomingSessions || []),
          ...(data.completedSessions || []),
        ]

        const seen = new Set<string>()
        const normalized = merged
          .map((session, index) => toUiSession(session, index, token))
          .filter((session) => {
            if (seen.has(session.id)) return false
            seen.add(session.id)
            return true
          })

        setSessions(normalized)
      } catch (err) {
        setSessions([])
        setSoftNotice(
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Henüz planlanmış seansınız bulunmuyor.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void fetchSessions('initial')
  }, [fetchSessions])

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter(isUpcoming)
        .sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0
          if (!a.startTime) return 1
          if (!b.startTime) return -1
          return a.startTime - b.startTime
        }),
    [sessions]
  )

  const pastSessions = useMemo(
    () => sessions.filter(isPast).sort((a, b) => b.startTime - a.startTime),
    [sessions]
  )

  const filteredSessions = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return sessions
      .filter((session) => {
        if (filter === 'upcoming') return isUpcoming(session)
        if (filter === 'completed') return session.status === 'completed'
        if (filter === 'cancelled') return isCancelledLike(session)
        return true
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
          .join(' ')
          .toLowerCase()

        return !keyword || text.includes(keyword)
      })
      .sort((a, b) => {
        if (filter === 'completed' || filter === 'cancelled') return b.startTime - a.startTime
        if (!a.startTime && !b.startTime) return 0
        if (!a.startTime) return 1
        if (!b.startTime) return -1
        return a.startTime - b.startTime
      })
  }, [sessions, filter, search])

  const nextSession = upcomingSessions[0] || null
  const completedCount = pastSessions.filter((session) => session.status === 'completed').length
  const cancelledCount = pastSessions.filter(isCancelledLike).length

  return (
    <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Danışan Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Seanslarım
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Yaklaşan ve geçmiş görüşmelerinizi takip edin. Hazır olan online
                görüşmelere güvenli bağlantı üzerinden katılabilirsiniz.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchSessions('refresh')}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? 'Yükleniyor...' : 'Yenile'}
              </button>
              <Link
                href={buildTokenUrl('/client/dashboard', token)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                Dashboard
              </Link>
              {nextSession?.canJoin ? (
                <a
                  href={nextSession.joinHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
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
            onRetry={() => void fetchSessions('refresh')}
          />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Yaklaşan" value={String(upcomingSessions.length)} description="Bugün ve sonrası" />
          <SummaryCard title="Tamamlanan" value={String(completedCount)} description="Geçmiş görüşme" />
          <SummaryCard title="İptal / Katılmadı" value={String(cancelledCount)} description="Takip gerektiren" />
          <SummaryCard title="Toplam" value={String(sessions.length)} description="Tüm seans kayıtları" />
        </section>

        {nextSession ? (
          <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                  Sıradaki Seans
                </p>
                <h2 className="mt-3 text-3xl font-black">{nextSession.date}</h2>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  {nextSession.timeRange} • {nextSession.duration} • {nextSession.timezone}
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Uzman: <span className="font-black text-white">{nextSession.expertName}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={nextSession.chatHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
                >
                  Sohbete Git
                </Link>
                {nextSession.canJoin ? (
                  <a
                    href={nextSession.joinHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
                  >
                    Görüşmeye Katıl
                  </a>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-slate-300">
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
              <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
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
                className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  filter === item.value
                    ? 'bg-slate-950 text-white ring-slate-950'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
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
              <h2 className="text-xl font-black text-slate-950">Seans Listesi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Seans detayları, durum bilgileri ve hızlı aksiyonlar.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? 'Yükleniyor' : `${filteredSessions.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Seanslar yükleniyor" description="Randevu kayıtlarınız hazırlanıyor." />
          ) : filteredSessions.length > 0 ? (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
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
    </section>
  )
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function SessionCard({ session }: { session: UiSession }) {
  const config = statusConfig[session.status] || statusConfig.unknown

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-lg font-black text-white">
            {session.expertPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.expertPhotoUrl} alt={session.expertName} className="h-full w-full object-cover" />
            ) : (
              session.expertName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
                .join('') || 'M'
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-950">{session.expertName}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
                {config.label}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{session.expertTitle}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{session.date}</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{session.timeRange}</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{session.duration}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Link
            href={session.chatHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
          >
            Sohbete Git
          </Link>

          {session.canJoin ? (
            <a
              href={session.joinHref}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
            >
              Görüşmeye Katıl
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-slate-200 px-4 py-2 text-sm font-black text-slate-500">
              Görüşme Hazırlanıyor
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function NoticeCard({
  title,
  description,
  detail,
  onRetry,
}: {
  title: string
  description: string
  detail?: string
  onRetry: () => void
}) {
  return (
    <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 text-indigo-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 text-indigo-800">{description}</p>
          {detail ? (
            <p className="mt-1 text-xs font-semibold text-indigo-500">{detail}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md"
        >
          Yenile
        </button>
      </div>
    </section>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

export default function ClientDashboardSessionsPage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Seanslar yükleniyor...</p>
          </div>
        </section>
      }
    >
      <ClientSessionsContent />
    </Suspense>
  )
}
