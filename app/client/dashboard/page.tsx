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

type DashboardNotification = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
}

type NotificationsResponse = {
  ok: boolean
  notifications?: DashboardNotification[]
  unreadCount?: number
  error?: string
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
  if (normalized === 'locked') return 'Hazırlanıyor'
  if (normalized === 'closed') return 'Kapalı'
  if (normalized === 'unknown') return 'Bekleniyor'

  return status || 'Bekleniyor'
}

function normalizePaymentStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'paid') return 'Ödeme tamamlandı'
  if (normalized === 'pending') return 'Ödeme bekleniyor'
  if (normalized === 'failed') return 'Ödeme başarısız'
  if (normalized === 'refunded') return 'Ödeme iade edildi'
  if (normalized === 'unknown') return 'Bekleniyor'

  return status || 'Bekleniyor'
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
  if (normalized === 'unknown') return 'Bekleniyor'

  return status || 'Bekleniyor'
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

function getNotificationTypeLabel(type?: string | null) {
  const normalized = String(type || '').trim().toLowerCase()

  if (normalized === 'message') return 'Mesaj'
  if (normalized === 'session') return 'Seans'
  if (normalized === 'payment') return 'Ödeme'
  if (normalized === 'review') return 'Değerlendirme'
  if (normalized === 'admin') return 'Mindora'
  if (normalized === 'system') return 'Sistem'

  return 'Bildirim'
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
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [softNotice, setSoftNotice] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')

  const handlePayNow = useCallback(async () => {
    if (!dashboard?.client?.id) return

    setPayLoading(true)
    setPayError('')

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: dashboard.client.id }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok || !data?.paymentPageUrl) {
        throw new Error(data?.error || 'Ödeme bağlantısı oluşturulamadı.')
      }

      window.location.href = data.paymentPageUrl
    } catch (err) {
      setPayLoading(false)
      setPayError(
        err instanceof Error && err.message ? err.message : 'Ödeme bağlantısı oluşturulamadı.'
      )
    }
  }, [dashboard?.client?.id])

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
  const notificationsHref = useMemo(() => buildTokenUrl('/client/notifications', token), [token])

  const loadDashboard = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!token || isPlaceholderToken(token)) {
        setDashboard(null)
        setSoftNotice('Danışan paneliniz henüz aktif bağlantı ile açılmadı.')
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

        setSoftNotice('')

        const res = await fetch(`/api/client/dashboard?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        const data = (await res.json().catch(() => null)) as DashboardResponse | null

        if (!res.ok || !data?.ok || !data.dashboard) {
          throw new Error(data?.error || 'Panel bilgileri henüz hazırlanmadı.')
        }

        setDashboard(data.dashboard)
      } catch (err) {
        setDashboard(null)
        setSoftNotice(
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Danışan paneliniz henüz aktif hale getirilmedi.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token]
  )

  const loadNotifications = useCallback(async () => {
    if (!token || isPlaceholderToken(token) || !dashboard?.conversation?.id) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      setNotificationsLoading(true)

      const res = await fetch(
        `/api/notifications?role=client&conversationId=${encodeURIComponent(
          dashboard.conversation.id
        )}&token=${encodeURIComponent(token)}&limit=5`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      const data = (await res.json().catch(() => null)) as NotificationsResponse | null

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Bildirimler alınamadı.')
      }

      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setNotificationsLoading(false)
    }
  }, [dashboard?.conversation?.id, token])

  useEffect(() => {
    void loadDashboard('initial')
  }, [loadDashboard])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  if (loading) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-black text-slate-600">Dashboard yükleniyor...</p>
        </div>
      </section>
    )
  }

  if (!dashboard) {
    return (
      <InactiveDashboardState
        token={token}
        notice={softNotice}
        refreshing={refreshing}
        onRetry={() => void loadDashboard('refresh')}
      />
    )
  }

  const nextSession = dashboard.nextSession
  const canJoinSession = isSessionJoinable(nextSession, sessionUrl)

  return (
    <section className="px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg lg:p-8">
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
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-sm font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? 'Yükleniyor...' : 'Yenile'}
              </button>

              {chatUrl !== '#' ? (
                <Link
                  href={chatUrl}
                  className="rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
                >
                  Sohbete Git
                </Link>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-500"
                >
                  Sohbet Beklemede
                </button>
              )}

              {canJoinSession ? (
                <a
                  href={sessionUrl}
                  className="rounded-2xl bg-emerald-600 px-5 py-4 text-center text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
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

        {dashboard.conversation.paymentStatus !== 'paid' ? (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-center shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              Son adım
            </p>
            <h2 className="mt-2 text-2xl font-black text-amber-950 sm:text-3xl">
              Eşleşmeniz hazır! Terapistinizle görüşmeye başlamak için ödemenizi tamamlayın.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-amber-800">
              Ödemeniz onaylandığı an sohbet ve görüşme alanınız otomatik olarak açılır, size
              ve uzmanınıza bildirim gider.
            </p>

            {payError ? (
              <p className="mx-auto mt-4 max-w-xl rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                {payError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handlePayNow()}
              disabled={payLoading || !dashboard.client.id}
              className="mx-auto mt-6 block w-full max-w-sm rounded-2xl bg-amber-600 px-8 py-5 text-center text-lg font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {payLoading ? 'Ödeme bağlantısı hazırlanıyor...' : 'Ödemeyi Yap ve Görüşmeyi Başlat'}
            </button>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Yaklaşan" value={String(dashboard.stats.upcomingCount)} subtitle="aktif seans" />
          <MetricCard title="Tamamlanan" value={String(dashboard.stats.completedCount)} subtitle="geçmiş seans" />
          <MetricCard title="Toplam" value={String(dashboard.stats.totalSessions)} subtitle="randevu" />
          <MetricCard title="Bildirim" value={String(unreadCount)} subtitle="okunmamış" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
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
                    <MiniCard label="Video" value={nextSession.session_ready ? 'Hazır' : 'Hazırlanıyor'} />
                    <MiniCard label="Saat Dilimi" value={nextSession.timezone || 'Europe/Istanbul'} />
                    <MiniCard label="Durum" value={normalizeBookingStatus(nextSession.status)} />
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    {canJoinSession ? (
                      <a
                        href={sessionUrl}
                        className="flex-1 rounded-2xl bg-emerald-600 px-5 py-4 text-center text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
                      >
                        Güvenli Görüşmeye Katıl
                      </a>
                    ) : null}

                    {chatUrl !== '#' ? (
                      <Link
                        href={chatUrl}
                        className="flex-1 rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
                      >
                        Sohbete Git
                      </Link>
                    ) : null}
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
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                Hızlı İşlemler
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Kısayollar</h2>
              <div className="mt-5 grid gap-3">
                <QuickLink href={sessionsHref} title="Seanslarım" description="Yaklaşan ve geçmiş seanslar" />
                <QuickLink href={paymentsHref} title="Ödemelerim" description="Ödeme geçmişi ve durumlar" />
                <QuickLink href={filesHref} title="Dosyalarım" description="Paylaşılan dosyalar" />
                <QuickLink href={profileHref} title="Profilim" description="Hesap ve destek bilgileri" />
                <QuickLink href={notificationsHref} title="Bildirimler" description={`${unreadCount} okunmamış bildirim`} />
              </div>
            </section>

            <ListCard
              title="Bildirimler"
              eyebrow="Merkez"
              emptyText={notificationsLoading ? 'Bildirimler yükleniyor.' : 'Henüz bildirim yok.'}
              actionHref={notificationsHref}
              actionLabel="Tümünü gör"
            >
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} token={token} />
              ))}
            </ListCard>

            <ListCard title="Son Mesajlar" eyebrow="Chat" emptyText="Henüz mesaj görünmüyor.">
              {dashboard.recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md"
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

function InactiveDashboardState({
  token,
  notice,
  refreshing,
  onRetry,
}: {
  token: string
  notice: string
  refreshing: boolean
  onRetry: () => void
}) {
  const sessionsHref = buildTokenUrl('/client/dashboard/sessions', token)
  const paymentsHref = buildTokenUrl('/client/dashboard/payments', token)
  const filesHref = buildTokenUrl('/client/dashboard/files', token)
  const profileHref = buildTokenUrl('/client/dashboard/profile', token)
  const notificationsHref = buildTokenUrl('/client/notifications', token)

  return (
    <section className="px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 lg:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
              Mindora Danışan Paneli
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Danışan paneli henüz aktif değil
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              İlk eşleşme, ödeme veya seans hazırlığı tamamlandığında kişisel paneliniz
              otomatik olarak aktif hale gelir. Bu alanda randevularınızı, ödemelerinizi,
              dosyalarınızı ve uzman görüşmenizi takip edebilirsiniz.
            </p>

            {notice ? (
              <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-black text-indigo-950">Süreç bilgilendirmesi</p>
                <p className="mt-1 text-sm leading-6 text-indigo-800">{notice}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onRetry}
                disabled={refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? 'Kontrol ediliyor...' : 'Tekrar Kontrol Et'}
              </button>
              <Link
                href="/eslesme"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
              >
                Ücretsiz Ön Eşleşme
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                Ana Sayfa
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProcessCard
            title="Uzman Eşleşmesi"
            description="Başvurunuz değerlendirilir ve size uygun uzman süreci hazırlanır."
          />
          <ProcessCard
            title="Randevular"
            description="Planlanan seanslarınız tarih ve saat bilgileriyle burada görünür."
          />
          <ProcessCard
            title="Ödemeler"
            description="Ödeme geçmişiniz ve ödeme sonrası erişim durumunuz güvenli şekilde takip edilir."
          />
          <ProcessCard
            title="Dosyalar"
            description="Görüşme sürecinde paylaşılan dosyalar bu panelde listelenir."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
              Panelde Neler Olacak?
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Mindora süreciniz</h2>
            <div className="mt-5 space-y-3">
              <StepLine index="1" title="Ön eşleşme" text="İhtiyacınıza göre uygun uzman ve süreç belirlenir." />
              <StepLine index="2" title="Güvenli ödeme" text="Ödeme tamamlandığında chat ve seans erişiminiz açılır." />
              <StepLine index="3" title="Online görüşme" text="Hazır olan seanslara güvenli bağlantı üzerinden katılırsınız." />
              <StepLine index="4" title="Takip ve dosyalar" text="Mesajlar, ödemeler ve paylaşımlar panelinizde kalır." />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
              Hızlı Erişim
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Panel bölümleri</h2>
            <div className="mt-5 grid gap-3">
              <QuickLink href={sessionsHref} title="Seanslarım" description="Randevu ve görüşme takibi" />
              <QuickLink href={paymentsHref} title="Ödemelerim" description="Ödeme geçmişi ve durumlar" />
              <QuickLink href={filesHref} title="Dosyalarım" description="Paylaşılan belgeler" />
              <QuickLink href={profileHref} title="Profilim" description="Hesap ve eşleşme bilgileri" />
              <QuickLink href={notificationsHref} title="Bildirimler" description="Süreç ve sistem bildirimleri" />
            </div>
          </section>
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
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
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-lg"
    >
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
    </Link>
  )
}

function ProcessCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  )
}

function StepLine({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
        {index}
      </span>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </div>
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
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
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

function NotificationRow({
  notification,
  token,
}: {
  notification: DashboardNotification
  token: string
}) {
  const href = notification.link ? buildTokenUrl(notification.link, token) : ''

  const content = (
    <div
      className={`rounded-2xl p-4 ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        notification.isRead
          ? 'bg-slate-50 ring-slate-100 hover:bg-slate-100'
          : 'bg-indigo-50 ring-indigo-100 hover:bg-indigo-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
            notification.isRead
              ? 'bg-white text-slate-600 ring-slate-200'
              : 'bg-white text-indigo-700 ring-indigo-100'
          }`}
        >
          {getNotificationTypeLabel(notification.type)}
        </span>

        <span className="text-xs font-bold text-slate-500">
          {formatDateTime(notification.createdAt)}
        </span>
      </div>

      <p className="mt-3 text-sm font-black text-slate-950">
        {notification.title}
      </p>

      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
        {getPreview(notification.message)}
      </p>

      {!notification.isRead ? (
        <p className="mt-2 text-xs font-black text-indigo-600">Yeni bildirim</p>
      ) : null}
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}

function SessionRow({ booking, compact = false }: { booking: DashboardBooking; compact?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md">
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
