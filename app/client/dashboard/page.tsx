'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type ConversationStatus = 'locked' | 'active' | 'closed' | string
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | string

type DashboardBooking = {
  id: string
  conversation_id: string | null
  expert_id: string | null
  scheduled_start_at: string
  scheduled_end_at: string
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

function formatDateTime(value?: string | null) {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return '-'
  }
}

function formatTimeRange(startAt?: string | null, endAt?: string | null) {
  if (!startAt || !endAt) return '-'

  try {
    const formatter = new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return `${formatter.format(new Date(startAt))} - ${formatter.format(
      new Date(endAt)
    )}`
  } catch {
    return '-'
  }
}

function getStatusLabel(status?: string) {
  if (status === 'active') return 'Aktif'
  if (status === 'locked') return 'Kilitli'
  if (status === 'closed') return 'Kapalı'
  return status || '-'
}

function getPaymentLabel(status?: string) {
  if (status === 'paid') return 'Ödeme tamamlandı'
  if (status === 'pending') return 'Ödeme bekleniyor'
  if (status === 'failed') return 'Ödeme başarısız'
  if (status === 'refunded') return 'Ödeme iade edildi'
  return status || '-'
}

function getBookingLabel(status?: string) {
  if (status === 'scheduled') return 'Planlandı'
  if (status === 'confirmed') return 'Onaylandı'
  if (status === 'active') return 'Aktif'
  if (status === 'completed') return 'Tamamlandı'
  if (status === 'cancelled') return 'İptal'
  if (status === 'no_show') return 'Katılmadı'
  if (status === 'rescheduled') return 'Ertelendi'
  return status || '-'
}

function getSenderLabel(sender?: string) {
  if (sender === 'client') return 'Siz'
  if (sender === 'expert') return 'Uzman'
  if (sender === 'admin') return 'Mindora'
  return 'Mesaj'
}

function getPreview(message?: string | null) {
  const clean = (message || '').replace(/\s+/g, ' ').trim()

  if (!clean) return 'Mesaj içeriği yok.'
  if (clean.length <= 120) return clean

  return `${clean.slice(0, 120)}...`
}

function buildTokenUrl(path: string, token: string) {
  if (!path) return '#'
  if (path.includes('token=')) return path

  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}token=${encodeURIComponent(token)}`
}

function ClientDashboardContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const chatUrl = useMemo(() => {
    if (!dashboard?.conversation?.chatUrl) return '#'
    return buildTokenUrl(dashboard.conversation.chatUrl, token)
  }, [dashboard, token])

  const sessionUrl = useMemo(() => {
    if (!dashboard?.sessionUrl) return ''
    return buildTokenUrl(dashboard.sessionUrl, token)
  }, [dashboard, token])

  async function loadDashboard() {
    if (!token) {
      setError('Dashboard erişimi için güvenli token gerekli.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const res = await fetch(
        `/api/client/dashboard?token=${encodeURIComponent(token)}`,
        {
          cache: 'no-store',
        }
      )

      const data = (await res.json().catch(() => null)) as DashboardResponse | null

      if (!res.ok || !data?.ok || !data.dashboard) {
        setError(data?.error || 'Dashboard bilgileri alınamadı.')
        return
      }

      setDashboard(data.dashboard)
    } catch {
      setError('Dashboard yüklenirken bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f3ee] px-4 py-8 text-[#171717]">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <p className="font-black text-[#6b5c4d]">Dashboard yükleniyor...</p>
        </div>
      </main>
    )
  }

  if (error || !dashboard) {
    return (
      <main className="min-h-screen bg-[#f7f3ee] px-4 py-8 text-[#171717]">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
          <p className="text-xl font-black text-red-700">Erişim sağlanamadı</p>
          <p className="mt-2 text-sm font-bold text-red-600">
            {error || 'Dashboard bilgileri alınamadı.'}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    )
  }

  const nextSession = dashboard.nextSession

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-6 text-[#171717] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Danışan Paneli
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#2b2118] md:text-4xl">
                Hoş geldin, {dashboard.client.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6b5c4d]">
                Görüşmelerini, mesajlarını ve yaklaşan seanslarını güvenli
                Mindora panelinden takip edebilirsin.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  Secure dashboard
                </span>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                  Uzman: {dashboard.expert.name}
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                  Chat: {getStatusLabel(dashboard.conversation.status)}
                </span>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100">
                  {getPaymentLabel(dashboard.conversation.paymentStatus)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:w-64">
              <Link
                href={chatUrl}
                className="rounded-2xl bg-black px-5 py-4 text-center text-sm font-black text-white transition hover:bg-[#2b2118]"
              >
                💬 Sohbete Git
              </Link>

              {sessionUrl ? (
                <a
                  href={sessionUrl}
                  className="rounded-2xl bg-emerald-500 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-600"
                >
                  🎥 Görüşmeye Katıl
                </a>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-2xl bg-emerald-100 px-5 py-4 text-sm font-black text-emerald-400"
                >
                  🎥 Görüşme Beklemede
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
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

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#e5d9cc] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7662]">
                    Sonraki Seans
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[#2b2118]">
                    Yaklaşan Görüşme
                  </h2>
                </div>

                {nextSession && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                    {getBookingLabel(nextSession.status)}
                  </span>
                )}
              </div>

              {!nextSession ? (
                <div className="mt-5 rounded-3xl bg-[#faf7f2] p-6 text-center ring-1 ring-black/5">
                  <p className="font-black text-[#2b2118]">
                    Şu anda yaklaşan seans görünmüyor.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                    Yeni seans planlandığında burada görünecek.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl bg-[#2b2118] p-6 text-white">
                  <p className="text-sm font-bold text-[#c9b8a7]">
                    {formatDateTime(nextSession.scheduled_start_at)}
                  </p>
                  <h3 className="mt-2 text-3xl font-black">
                    {formatTimeRange(
                      nextSession.scheduled_start_at,
                      nextSession.scheduled_end_at
                    )}
                  </h3>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MiniCard label="Uzman" value={dashboard.expert.name} />
                    <MiniCard
                      label="Video"
                      value={nextSession.session_ready ? 'Hazır' : 'Hazırlanıyor'}
                    />
                    <MiniCard
                      label="Saat Dilimi"
                      value={nextSession.timezone || 'Europe/Istanbul'}
                    />
                    <MiniCard
                      label="Durum"
                      value={getBookingLabel(nextSession.status)}
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    {sessionUrl && (
                      <a
                        href={sessionUrl}
                        className="flex-1 rounded-2xl bg-emerald-500 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-600"
                      >
                        🎥 Güvenli Görüşmeye Katıl
                      </a>
                    )}

                    <Link
                      href={chatUrl}
                      className="flex-1 rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#2b2118] transition hover:bg-[#f3eadf]"
                    >
                      💬 Sohbete Git
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <ListCard
              title="Yaklaşan Seanslar"
              eyebrow="Takvim"
              emptyText="Yaklaşan seans bulunmuyor."
            >
              {dashboard.upcomingSessions.map((booking) => (
                <SessionRow key={booking.id} booking={booking} />
              ))}
            </ListCard>
          </div>

          <div className="space-y-6">
            <ListCard
              title="Son Mesajlar"
              eyebrow="Chat"
              emptyText="Henüz mesaj görünmüyor."
            >
              {dashboard.recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#6b5c4d] ring-1 ring-black/5">
                      {getSenderLabel(message.sender_type)}
                    </span>
                    <span className="text-xs font-bold text-[#8a7662]">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#2b2118]">
                    {getPreview(message.message)}
                  </p>
                </div>
              ))}
            </ListCard>

            <ListCard
              title="Geçmiş Seanslar"
              eyebrow="Arşiv"
              emptyText="Tamamlanan seans bulunmuyor."
            >
              {dashboard.completedSessions.map((booking) => (
                <SessionRow key={booking.id} booking={booking} compact />
              ))}
            </ListCard>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-[#2b2118]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#6b5c4d]">{subtitle}</p>
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c9b8a7]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function ListCard({
  eyebrow,
  title,
  emptyText,
  children,
}: {
  eyebrow: string
  title: string
  emptyText: string
  children: React.ReactNode
}) {
  const hasChildren =
    Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <div className="rounded-[2rem] border border-[#e5d9cc] bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7662]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-black text-[#2b2118]">{title}</h2>

      <div className="mt-5 space-y-3">
        {hasChildren ? (
          children
        ) : (
          <div className="rounded-2xl bg-[#faf7f2] p-5 text-center ring-1 ring-black/5">
            <p className="text-sm font-bold text-[#6b5c4d]">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SessionRow({
  booking,
  compact = false,
}: {
  booking: DashboardBooking
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#2b2118]">
            {formatDateTime(booking.scheduled_start_at)}
          </p>
          {!compact && (
            <p className="mt-1 text-xs font-bold text-[#6b5c4d]">
              {formatTimeRange(booking.scheduled_start_at, booking.scheduled_end_at)}
            </p>
          )}
        </div>

        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#6b5c4d] ring-1 ring-black/5">
          {getBookingLabel(booking.status)}
        </span>
      </div>
    </div>
  )
}


export default function ClientDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f3ee] px-4 py-8 text-[#171717]">
          <div className="mx-auto max-w-6xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-black text-[#6b5c4d]">Dashboard yükleniyor...</p>
          </div>
        </main>
      }
    >
      <ClientDashboardContent />
    </Suspense>
  )
}
