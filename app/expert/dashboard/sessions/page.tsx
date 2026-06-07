'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type SessionStatus =
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
  sessionReady?: boolean
  liveSessionId?: string | null
}

type SessionsResponse = {
  ok: boolean
  sessions?: ApiSession[]
  summary?: {
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
  status: SessionStatus
  conversationHref: string
  sessionHref: string
  canJoin: boolean
  scheduledStartAt: string | null
}

const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
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
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  unknown: {
    label: 'Bilinmiyor',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
}

function normalizeStatus(value: string | null | undefined): SessionStatus {
  if (
    value === 'scheduled' ||
    value === 'confirmed' ||
    value === 'active' ||
    value === 'completed' ||
    value === 'cancelled' ||
    value === 'no_show'
  ) {
    return value
  }

  return 'unknown'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return '-'
  }
}

function formatTime(value: string | null | undefined) {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return '-'
  }
}

function calculateDuration(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return '50 dk'

  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()

  if (!Number.isFinite(diffMs) || diffMs <= 0) return '50 dk'

  return `${Math.round(diffMs / 60000)} dk`
}

function toUiSession(session: ApiSession): UiSession {
  const status = normalizeStatus(session.status)
  const conversationHref = session.conversationId
    ? `/expert/chat/${session.conversationId}`
    : '/expert/dashboard/clients'
  const sessionHref = session.id ? `/expert/session/${session.id}` : '#'

  return {
    id: session.id,
    clientName: session.clientName?.trim() || 'Danışan',
    clientEmail: session.clientEmail?.trim() || null,
    topic: session.topic?.trim() || 'Online görüşme',
    date: formatDate(session.scheduledStartAt),
    time: formatTime(session.scheduledStartAt),
    duration: calculateDuration(session.scheduledStartAt, session.scheduledEndAt),
    status,
    conversationHref,
    sessionHref,
    canJoin: Boolean(session.sessionReady) || status === 'confirmed' || status === 'active',
    scheduledStartAt: session.scheduledStartAt,
  }
}

function isUpcoming(status: SessionStatus) {
  return status === 'scheduled' || status === 'confirmed' || status === 'active'
}

function isPast(status: SessionStatus) {
  return status === 'completed' || status === 'cancelled' || status === 'no_show'
}

export default function ExpertDashboardSessionsPage() {
  const [sessions, setSessions] = useState<UiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchSessions() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/expert/sessions', { cache: 'no-store' })
      const data = (await response.json()) as SessionsResponse

      if (!response.ok || !data.ok) {
        setError(data.error || 'Seanslar alınamadı.')
        setSessions([])
        return
      }

      setSessions((data.sessions || []).map(toUiSession))
    } catch {
      setError('Seans verileri alınırken beklenmeyen bir hata oluştu.')
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((session) => isUpcoming(session.status))
        .sort((a, b) => {
          const dateA = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0
          const dateB = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0
          return dateA - dateB
        }),
    [sessions]
  )

  const pastSessions = useMemo(
    () =>
      sessions
        .filter((session) => isPast(session.status))
        .sort((a, b) => {
          const dateA = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0
          const dateB = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0
          return dateB - dateA
        }),
    [sessions]
  )

  const summaryCards = [
    {
      title: 'Yaklaşan Seans',
      value: upcomingSessions.length.toString(),
      description: 'Planlanan görüşmeler',
    },
    {
      title: 'Tamamlanan',
      value: pastSessions
        .filter((session) => session.status === 'completed')
        .length.toString(),
      description: 'Geçmiş görüşmeler',
    },
    {
      title: 'Aktif Seans',
      value: upcomingSessions
        .filter((session) => session.status === 'active')
        .length.toString(),
      description: 'Şu anda devam eden',
    },
    {
      title: 'İptal / Gelmedi',
      value: pastSessions
        .filter((session) => session.status === 'cancelled' || session.status === 'no_show')
        .length.toString(),
      description: 'Takip gerektiren kayıt',
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Uzman Paneli</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Seanslar
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Yaklaşan, aktif ve geçmiş seanslarınızı tek ekrandan takip edin.
              Görüşmeye katılabilir, danışan sohbetine dönebilir ve seans durumlarını
              kontrol edebilirsiniz.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={fetchSessions}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Yükleniyor...' : 'Yenile'}
            </button>
            <Link
              href="/expert/dashboard/availability"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Müsaitlik Yönet
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Seans verileri alınamadı.</p>
            <p className="mt-1 text-amber-800">{error}</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((item) => (
            <SummaryCard
              key={item.title}
              title={item.title}
              value={item.value}
              description={item.description}
            />
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Yaklaşan Seanslar
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bugün ve önümüzdeki günlerde planlanan görüşmeler.
                </p>
              </div>

              <Link
                href="/expert/dashboard/availability"
                className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                Yeni uygunluk ekle
              </Link>
            </div>

            {loading ? (
              <LoadingState message="Yaklaşan seanslar yükleniyor..." />
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} mode="upcoming" />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henüz yaklaşan seans yok"
                description="Danışan bir seans planladığında burada tarih, saat, danışan ve katılım bağlantısı ile görünecek."
                actionHref="/expert/dashboard/availability"
                actionLabel="Müsaitliklerini düzenle"
              />
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Bugünün Akışı</h2>
            <p className="mt-1 text-sm text-slate-500">Günlük seans kontrol listesi.</p>

            <div className="mt-6 space-y-3">
              <ChecklistItem title="Kamera ve mikrofon kontrolü" />
              <ChecklistItem title="Danışan notlarını gözden geçir" />
              <ChecklistItem title="Seans sonrası kısa not bırak" />
              <ChecklistItem title="Gerekirse yeni randevu planla" />
            </div>

            <div className="mt-6 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
              <p className="text-sm font-semibold text-indigo-950">Canlı veri bağlantısı aktif</p>
              <p className="mt-1 text-sm leading-6 text-indigo-800">
                Bu sayfa /api/expert/sessions endpointinden bookings verilerini çekmeye hazırdır.
              </p>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Geçmiş Seanslar</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tamamlanan, iptal edilen veya gelinmeyen görüşmeler.
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingState message="Geçmiş seanslar yükleniyor..." />
          ) : pastSessions.length > 0 ? (
            <PastSessionsTable sessions={pastSessions} />
          ) : (
            <EmptyState
              title="Henüz geçmiş seans yok"
              description="Tamamlanan görüşmeler ve seans geçmişi burada listelenecek."
            />
          )}
        </section>
      </section>
    </main>
  )
}

function PastSessionsTable({ sessions }: { sessions: UiSession[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4 font-semibold">Danışan</th>
              <th className="px-5 py-4 font-semibold">Tarih</th>
              <th className="px-5 py-4 font-semibold">Saat</th>
              <th className="px-5 py-4 font-semibold">Durum</th>
              <th className="px-5 py-4 font-semibold">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sessions.map((session) => (
              <tr key={session.id} className="align-top transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-950">{session.clientName}</p>
                  <p className="mt-1 text-xs text-slate-500">{session.topic}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{session.date}</td>
                <td className="px-5 py-4 text-slate-600">{session.time}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={session.status} />
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={session.conversationHref}
                    className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
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
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{session.clientName}</h3>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{session.topic}</p>
          {session.clientEmail ? (
            <p className="mt-1 text-xs text-slate-400">{session.clientEmail}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
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
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Chat'e Git
          </Link>
          {mode === 'upcoming' ? (
            session.canJoin ? (
              <Link
                href={session.sessionHref}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Görüşmeye Katıl
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
                Görüşme Hazır Değil
              </span>
            )
          ) : null}
        </div>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.className}`}
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
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{message}</p>
    </div>
  )
}

function ChecklistItem({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
        ✓
      </span>
      <span className="text-sm font-medium text-slate-700">{title}</span>
    </div>
  )
}
