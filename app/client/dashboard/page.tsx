'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type ConversationStatus = 'locked' | 'active' | 'closed' | 'unknown' | string
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'unknown' | string

type DashboardBooking = {
  id: string
  conversation_id: string | null
  expert_id: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  timezone: string | null
  status: string
  live_session_id?: string | null
  session_ready?: boolean | null
  client_join_url?: string | null
  created_at?: string | null
}

type RecentMessage = {
  id: string
  conversation_id: string
  sender_type: 'client' | 'expert' | 'admin' | string
  sender_name: string | null
  message: string
  created_at: string
}

type ClientDashboard = {
  client: {
    id?: string | null
    name: string
    email?: string | null
  }
  expert: {
    id?: string | null
    name: string
    email?: string | null
  }
  conversation: {
    id: string
    status: ConversationStatus
    paymentStatus: PaymentStatus
    createdAt: string
    updatedAt: string
    chatUrl: string
  }
  nextSession: DashboardBooking | null
  sessionUrl: string | null
  upcomingSessions: DashboardBooking[]
  completedSessions: DashboardBooking[]
  recentMessages: RecentMessage[]
  stats: {
    upcomingCount: number
    completedCount: number
    totalSessions: number
    recentMessageCount: number
  }
}

type DashboardResponse = {
  ok: boolean
  dashboard?: ClientDashboard
  error?: string
}

function safeText(value: string | null | undefined, fallback = '-') {
  const clean = value?.trim()
  return clean || fallback
}

function getDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateTime(value?: string | null) {
  const date = getDate(value)
  if (!date) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTimeRange(startAt?: string | null, endAt?: string | null) {
  const start = getDate(startAt)
  const end = getDate(endAt)

  if (!start || !end) return '-'

  const formatter = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function normalizeConversationStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'active') return 'Aktif'
  if (normalized === 'locked') return 'Kilitli'
  if (normalized === 'closed') return 'Kapalı'

  return status || '-'
}

function normalizePaymentStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'paid') return 'Ödeme tamamlandı'
  if (normalized === 'pending') return 'Ödeme bekleniyor'
  if (normalized === 'failed') return 'Ödeme başarısız'
  if (normalized === 'refunded') return 'Ödeme iade edildi'

  return status || '-'
}

function normalizeBookingStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'scheduled') return 'Planlandı'
  if (normalized === 'confirmed') return 'Onaylandı'
  if (normalized === 'active') return 'Aktif'
  if (normalized === 'completed') return 'Tamamlandı'
  if (normalized === 'cancelled' || normalized === 'canceled') return 'İptal'
  if (normalized === 'no_show') return 'Katılmadı'
  if (normalized === 'rescheduled') return 'Ertelendi'

  return status || '-'
}

function getSenderLabel(sender?: string | null) {
  const normalized = String(sender || '').trim().toLowerCase()

  if (normalized === 'client') return 'Siz'
  if (normalized === 'expert') return 'Uzman'
  if (normalized === 'admin') return 'Mindora'

  return 'Mesaj'
}

function getPreview(message?: string | null) {
  const clean = (message || '').replace(/\s+/g, ' ').trim()

  if (!clean) return 'Mesaj içeriği yok.'
  if (clean.length <= 120) return clean

  return `${clean.slice(0, 120)}...`
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

function getBookingKey(booking: DashboardBooking, index: number) {
  return [booking.id, booking.conversation_id, booking.scheduled_start_at, index]
    .filter(Boolean)
    .join('-')
}

function isSessionJoinable(booking: DashboardBooking | null, sessionUrl: string | null) {
  if (!booking || !sessionUrl) return false

  const status = String(booking.status || '').toLowerCase()
  const statusReady = status === 'confirmed' || status === 'active' || status === 'scheduled'

  return Boolean(
    statusReady && (booking.session_ready || booking.live_session_id || booking.client_join_url)
  )
}

function isPlaceholderToken(token: string) {
  const normalized = token.trim().toLowerCase()
  return normalized === 'token' || normalized === 'gercek_token' || normalized === 'gerçek_token'
}

function ClientDashboardContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const chatUrl = useMemo(() => {
    if (!dashboard?.conversation?.chatUrl) return '#'
    return buildTokenUrl(dashboard.conversation.chatUrl, token)
  }, [dashboard, token])

  const sessionUrl = useMemo(() => {
    if (!dashboard?.sessionUrl) return ''
    return buildTokenUrl(dashboard.sessionUrl, token)
  }, [dashboard, token])

  const sessionsHref = useMemo(() => buildTokenUrl('/client/dashboard/sessions', token), [token])
  const paymentsHref = useMemo(() => buildTokenUrl('/client/dashboard/payments', token), [token])
  const filesHref = useMemo(() => buildTokenUrl('/client/dashboard/files', token), [token])
  const profileHref = useMemo(() => buildTokenUrl('/client/dashboard/profile', token), [token])

  const loadDashboard = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!token || isPlaceholderToken(token)) {
        setDashboard(null)
        setError('Dashboard erişimi için geçerli client veya session token bulunamadı.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      try {
        if (mode === 'initial') {
          setLoading(true)
        } else {
          setRefreshing(true)
        }

        setError('')

        const res = await fetch(`/api/client/dashboard?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        const data = (await res.json().catch(() => null)) as DashboardResponse | null

        if (!res.ok || !data?.ok || !data.dashboard) {
          throw new Error(data?.error || 'Dashboard bilgileri alınamadı.')
        }

        setDashboard(data.dashboard)
      } catch (err) {
        setDashboard(null)
        setError(
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Dashboard yüklenirken bağlantı hatası oluştu.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void loadDashboard('initial')
  }, [loadDashboard])

  if (loading) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-black text-slate-600">Dashboard yükleniyor...</p>
        </div>
      </section>
    )
  }

  if (error || !dashboard) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-100 bg-rose-50 p-8 text-center shadow-sm">
          <p className="text-xl font-black text-rose-700">Erişim sağlanamadı</p>
          <p className="mt-2 text-sm font-bold text-rose-600">
            {error || 'Dashboard bilgileri alınamadı.'}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadDashboard('refresh')}
              className="inline-flex justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 ring-1 ring-rose-200 transition hover:bg-rose-100"
            >
              Tekrar Dene
            </button>
            <Link
              href="/"
              className="inline-flex justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Ana sayfaya dön
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const nextSession = dashboard.nextSession
  const canJoinSession = isSessionJoinable(nextSession, sessionUrl)

  return (
    <section className="px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Danışan Paneli
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Hoş geldin, {safeText(dashboard.client.name, 'Danışan')}
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Görüşmelerini, mesajlarını ve yaklaşan seanslarını güvenli Mindora
                panelinden takip edebilirsin.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Pill tone="green">Güvenli panel</Pill>
                <Pill tone="purple">Uzman: {safeText(dashboard.expert.name, 'Uzman')}</Pill>
                <Pill tone="blue">
                  Chat: {normalizeConversationStatus(dashboard.conversation.status)}
                </Pill>
                <Pill tone="green">
                  {normalizePaymentStatus(dashboard.conversation.paymentStatus)}
                </Pill>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:w-64">
              <button
                type="button"
                onClick={() => void loadDashboard('refresh')}
                disabled={refreshing}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? 'Yükleniyor...' : 'Yenile'}
              </button>

              <Link
                href={chatUrl}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-slate-800"
              >
                Sohbete Git
              </Link>

              {canJoinSession ? (
                <a
                  href={sessionUrl}
                  className="rounded-2xl bg-emerald-600 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  Görüşmeye Katıl
                </a>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-2xl bg-emerald-100 px-5 py-4 text-sm font-black text-emerald-500"
                >
                  Görüşme Beklemede
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Yaklaşan"
            value={String(dashboard.stats.upcomingCount)}
            subtitle="aktif seans"
          />
          <MetricCard
            title="Tamamlanan"
            value={String(dashboard.stats.completedCount)}
            subtitle="geçmiş seans"
          />
          <MetricCard
            title="Toplam"
            value={String(dashboard.stats.totalSessions)}
            subtitle="randevu"
          />
          <MetricCard
            title="Mesaj"
            value={String(dashboard.stats.recentMessageCount)}
            subtitle="son kayıt"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                    Sonraki Seans
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Yaklaşan Görüşme
                  </h2>
                </div>

                {nextSession ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                    {normalizeBookingStatus(nextSession.status)}
                  </span>
                ) : null}
              </div>

              {!nextSession ? (
                <div className="mt-5 rounded-3xl bg-slate-50 p-6 text-center ring-1 ring-slate-100">
                  <p className="font-black text-slate-950">Şu anda yaklaşan seans görünmüyor.</p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    Yeni seans planlandığında burada görünecek.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl bg-slate-950 p-6 text-white">
                  <p className="text-sm font-bold text-slate-300">
                    {formatDateTime(nextSession.scheduled_start_at)}
                  </p>
                  <h3 className="mt-2 text-3xl font-black">
                    {formatTimeRange(nextSession.scheduled_start_at, nextSession.scheduled_end_at)}
                  </h3>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MiniCard label="Uzman" value={safeText(dashboard.expert.name, 'Uzman')} />
                    <MiniCard
                      label="Video"
                      value={nextSession.session_ready ? 'Hazır' : 'Hazırlanıyor'}
                    />
                    <MiniCard
                      label="Saat Dilimi"
                      value={nextSession.timezone || 'Europe/Istanbul'}
                    />
                    <MiniCard label="Durum" value={normalizeBookingStatus(nextSession.status)} />
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    {canJoinSession ? (
                      <a
                        href={sessionUrl}
                        className="flex-1 rounded-2xl bg-emerald-600 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-700"
                      >
                        Güvenli Görüşmeye Katıl
                      </a>
                    ) : null}

                    <Link
                      href={chatUrl}
                      className="flex-1 rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 transition hover:bg-slate-100"
                    >
                      Sohbete Git
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <ListCard
              title="Yaklaşan Seanslar"
              eyebrow="Takvim"
              emptyText="Yaklaşan seans bulunmuyor."
              actionHref={sessionsHref}
              actionLabel="Tümünü gör"
            >
              {dashboard.upcomingSessions.map((booking, index) => (
                <SessionRow key={getBookingKey(booking, index)} booking={booking} />
              ))}
            </ListCard>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                Hızlı İşlemler
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Kısayollar</h2>
              <div className="mt-5 grid gap-3">
                <QuickLink href={sessionsHref} title="Seanslarım" description="Yaklaşan ve geçmiş seanslar" />
                <QuickLink href={paymentsHref} title="Ödemelerim" description="Ödeme geçmişi ve durumlar" />
                <QuickLink href={filesHref} title="Dosyalarım" description="Paylaşılan dosyalar" />
                <QuickLink href={profileHref} title="Profilim" description="Hesap ve destek bilgileri" />
              </div>
            </section>

            <ListCard title="Son Mesajlar" eyebrow="Chat" emptyText="Henüz mesaj görünmüyor.">
              {dashboard.recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                      {getSenderLabel(message.sender_type)}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                    {getPreview(message.message)}
                  </p>
                </div>
              ))}
            </ListCard>

            <ListCard title="Geçmiş Seanslar" eyebrow="Arşiv" emptyText="Tamamlanan seans bulunmuyor.">
              {dashboard.completedSessions.map((booking, index) => (
                <SessionRow key={getBookingKey(booking, index)} booking={booking} compact />
              ))}
            </ListCard>
          </div>
        </section>
      </div>
    </section>
  )
}

function Pill({ children, tone }: { children: React.ReactNode; tone: 'green' | 'purple' | 'blue' }) {
  const className =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : tone === 'purple'
        ? 'bg-purple-50 text-purple-700 ring-purple-100'
        : 'bg-blue-50 text-blue-700 ring-blue-100'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {children}
    </span>
  )
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50"
    >
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
    </Link>
  )
}

function ListCard({
  eyebrow,
  title,
  emptyText,
  children,
  actionHref,
  actionLabel,
}: {
  eyebrow: string
  title: string
  emptyText: string
  children: React.ReactNode
  actionHref?: string
  actionLabel?: string
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">{title}</h2>
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="text-sm font-black text-indigo-600 transition hover:text-indigo-700">
            {actionLabel}
          </Link>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {hasChildren ? (
          children
        ) : (
          <div className="rounded-2xl bg-slate-50 p-5 text-center ring-1 ring-slate-100">
            <p className="text-sm font-bold text-slate-600">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SessionRow({ booking, compact = false }: { booking: DashboardBooking; compact?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">
            {formatDateTime(booking.scheduled_start_at)}
          </p>
          {!compact ? (
            <p className="mt-1 text-xs font-bold text-slate-500">
              {formatTimeRange(booking.scheduled_start_at, booking.scheduled_end_at)}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
          {normalizeBookingStatus(booking.status)}
        </span>
      </div>
    </div>
  )
}

export default function ClientDashboardPage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Dashboard yükleniyor...</p>
          </div>
        </section>
      }
    >
      <ClientDashboardContent />
    </Suspense>
  )
}
