import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getExpertIdFromCookies } from '@/lib/security/expert-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type BookingRow = {
  id: string
  expert_id: string | null
  conversation_id: string | null
  client_id: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  status: string | null
}

type ConversationRow = {
  id: string
  client_application_id: string | null
  expert_id: string | null
  status: string | null
  payment_status: string | null
  updated_at: string | null
}

type PaymentRow = {
  id: string
  expert_id: string | null
  expert_amount: number | null
  status: string | null
  expert_payout_status: string | null
  created_at: string | null
}

type NotificationRow = {
  id: string
  user_type: string
  user_id: string | null
  title: string
  message: string
  type: string
  is_read: boolean
  link: string | null
  created_at: string
}


type ClientRow = {
  id: string
  name: string | null
  email: string | null
}

type DashboardData = {
  upcomingBookings: BookingRow[]
  activeConversations: ConversationRow[]
  payments: PaymentRow[]
  notifications: NotificationRow[]
  unreadNotificationCount: number
  clientsById: Map<string, ClientRow>
}

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value || 0)

  if (!Number.isFinite(numberValue)) return '₺0'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Tarih bekleniyor'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Tarih bekleniyor'

  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTimeRange(startAt: string | null | undefined, endAt: string | null | undefined) {
  if (!startAt || !endAt) return 'Saat bekleniyor'

  const start = new Date(startAt)
  const end = new Date(endAt)

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return 'Saat bekleniyor'
  }

  const formatter = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function isCurrentMonth(value: string | null | undefined) {
  if (!value) return false

  const date = new Date(value)
  const now = new Date()

  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function sumMoney(items: PaymentRow[]) {
  return items.reduce((total, item) => {
    const value = Number(item.expert_amount || 0)
    return Number.isFinite(value) ? total + value : total
  }, 0)
}

function getClientName(clientId: string | null | undefined, clientsById: Map<string, ClientRow>) {
  if (!clientId) return 'Danışan bilgisi bekleniyor'
  return clientsById.get(clientId)?.name?.trim() || 'Danışan bilgisi bekleniyor'
}

function getClientEmail(clientId: string | null | undefined, clientsById: Map<string, ClientRow>) {
  if (!clientId) return null
  return clientsById.get(clientId)?.email?.trim() || null
}

function getStatusLabel(status: string | null | undefined) {
  switch ((status || '').toLowerCase()) {
    case 'matched':
      return 'Eşleşti'
    case 'open':
      return 'Açık'
    case 'scheduled':
      return 'Planlandı'
    case 'confirmed':
      return 'Onaylandı'
    case 'active':
      return 'Aktif'
    case 'completed':
      return 'Tamamlandı'
    case 'cancelled':
    case 'canceled':
      return 'İptal edildi'
    case 'paid':
      return 'Ödeme tamamlandı'
    case 'pending':
      return 'Bekleniyor'
    case 'failed':
      return 'Başarısız'
    case 'refunded':
      return 'İade edildi'
    default:
      return 'Bekleniyor'
  }
}

function getStatusBadgeClass(status: string | null | undefined) {
  const normalized = (status || '').toLowerCase()

  if (normalized === 'active' || normalized === 'confirmed' || normalized === 'paid') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (normalized === 'scheduled' || normalized === 'matched' || normalized === 'open') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  }

  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'failed') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  if (normalized === 'completed' || normalized === 'refunded') {
    return 'border-slate-200 bg-slate-100 text-slate-700'
  }

  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function getNotificationTypeLabel(type: string | null | undefined) {
  switch ((type || '').toLowerCase()) {
    case 'message':
      return 'Mesaj'
    case 'session':
      return 'Seans'
    case 'payment':
      return 'Ödeme'
    case 'review':
      return 'Değerlendirme'
    case 'admin':
      return 'Mindora'
    case 'system':
      return 'Sistem'
    default:
      return 'Bildirim'
  }
}

function getPreview(value: string | null | undefined, maxLength = 120) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim()

  if (!clean) return 'İçerik bulunmuyor.'
  if (clean.length <= maxLength) return clean

  return `${clean.slice(0, maxLength)}...`
}


async function fetchClientsByIds(clientIds: string[]) {
  const uniqueIds = Array.from(new Set(clientIds.filter(Boolean)))

  if (uniqueIds.length === 0) {
    return new Map<string, ClientRow>()
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('client_applications')
      .select('id, name, email')
      .in('id', uniqueIds)

    if (error) {
      console.error('EXPERT_DASHBOARD_CLIENTS_ERROR', error)
      return new Map<string, ClientRow>()
    }

    return new Map((data || []).map((client) => [client.id, client as ClientRow]))
  } catch (error) {
    console.error('EXPERT_DASHBOARD_CLIENTS_RUNTIME_ERROR', error)
    return new Map<string, ClientRow>()
  }
}

async function fetchExpertNotifications(expertId: string | null) {
  const empty = {
    notifications: [] as NotificationRow[],
    unreadNotificationCount: 0,
  }

  try {
    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()

    let notificationsQuery = (supabase as any)
      .from('notifications')
      .select('id, user_type, user_id, title, message, type, is_read, link, created_at')
      .eq('user_type', 'expert')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(5)

    let unreadQuery = (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_type', 'expert')
      .eq('is_read', false)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

    if (expertId) {
      notificationsQuery = notificationsQuery.or(`user_id.is.null,user_id.eq.${expertId}`)
      unreadQuery = unreadQuery.or(`user_id.is.null,user_id.eq.${expertId}`)
    } else {
      notificationsQuery = notificationsQuery.is('user_id', null)
      unreadQuery = unreadQuery.is('user_id', null)
    }

    const [notificationsResult, unreadResult] = await Promise.all([
      notificationsQuery,
      unreadQuery,
    ])

    if (notificationsResult.error) {
      console.error('EXPERT_DASHBOARD_NOTIFICATIONS_ERROR', notificationsResult.error)
      return empty
    }

    if (unreadResult.error) {
      console.error('EXPERT_DASHBOARD_NOTIFICATIONS_COUNT_ERROR', unreadResult.error)
    }

    return {
      notifications: (notificationsResult.data || []) as NotificationRow[],
      unreadNotificationCount: unreadResult.error ? 0 : unreadResult.count || 0,
    }
  } catch (error) {
    console.error('EXPERT_DASHBOARD_NOTIFICATIONS_RUNTIME_ERROR', error)
    return empty
  }
}


async function getDashboardData(expertId: string): Promise<DashboardData> {
  const emptyData: DashboardData = {
    upcomingBookings: [],
    activeConversations: [],
    payments: [],
    notifications: [],
    unreadNotificationCount: 0,
    clientsById: new Map<string, ClientRow>(),
  }

  try {
    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()

    const bookingsQuery = supabase
      .from('session_bookings')
      .select('id, expert_id, conversation_id, client_id, scheduled_start_at, scheduled_end_at, status')
      .eq('expert_id', expertId)
      .in('status', ['scheduled', 'confirmed', 'active'])
      .gte('scheduled_start_at', nowIso)
      .order('scheduled_start_at', { ascending: true })
      .limit(6)

    const conversationsQuery = supabase
      .from('conversations')
      .select('id, client_application_id, expert_id, status, payment_status, updated_at')
      .eq('expert_id', expertId)
      .in('status', ['active', 'matched', 'open'])
      .order('updated_at', { ascending: false })
      .limit(6)

    const paymentsQuery = supabase
      .from('payments')
      .select('id, expert_id, expert_amount, status, expert_payout_status, created_at')
      .eq('expert_id', expertId)
      .order('created_at', { ascending: false })
      .limit(100)

    const [bookingsResult, conversationsResult, paymentsResult] = await Promise.all([
      bookingsQuery,
      conversationsQuery,
      paymentsQuery,
    ])

    if (bookingsResult.error || conversationsResult.error || paymentsResult.error) {
      console.error('EXPERT_DASHBOARD_QUERY_ERROR', {
        bookings: bookingsResult.error,
        conversations: conversationsResult.error,
        payments: paymentsResult.error,
      })

      return emptyData
    }

    const upcomingBookings = (bookingsResult.data || []) as unknown as BookingRow[]
    const activeConversations = (conversationsResult.data || []) as unknown as ConversationRow[]
    const payments = (paymentsResult.data || []) as unknown as PaymentRow[]

    const clientIds = [
      ...activeConversations.map((conversation) => conversation.client_application_id),
      ...upcomingBookings.map((booking) => booking.client_id),
    ].filter((id): id is string => Boolean(id))

    const [clientsById, notificationData] = await Promise.all([
      fetchClientsByIds(clientIds),
      fetchExpertNotifications(expertId),
    ])

    return {
      upcomingBookings,
      activeConversations,
      payments,
      notifications: notificationData.notifications,
      unreadNotificationCount: notificationData.unreadNotificationCount,
      clientsById,
    }
  } catch (error) {
    console.error('EXPERT_DASHBOARD_RUNTIME_ERROR', error)
    return emptyData
  }
}

export default async function ExpertDashboardPage() {
  const expertId = await getExpertIdFromCookies()

  if (!expertId) {
    redirect('/expert/login')
  }

  const data = await getDashboardData(expertId)

  const paidPayments = data.payments.filter((payment) => payment.status === 'paid')
  const thisMonthPayments = paidPayments.filter((payment) => isCurrentMonth(payment.created_at))
  const pendingPayments = paidPayments.filter((payment) => payment.expert_payout_status !== 'paid')

  const activeClientCount = new Set(
    data.activeConversations
      .map((conversation) => conversation.client_application_id)
      .filter(Boolean)
  ).size

  const cards = [
    {
      label: 'Yaklaşan Görüşme',
      value: String(data.upcomingBookings.length),
      helper: 'Planlanan seans',
    },
    {
      label: 'Aktif Danışan',
      value: String(activeClientCount || data.activeConversations.length),
      helper: 'Devam eden süreç',
    },
    {
      label: 'Bu Ay Kazanç',
      value: formatMoney(sumMoney(thisMonthPayments)),
      helper: 'Net uzman kazancı',
    },
    {
      label: 'Bekleyen Ödeme',
      value: formatMoney(sumMoney(pendingPayments)),
      helper: 'Aktarım bekleyen',
    },
    {
      label: 'Bildirim',
      value: String(data.unreadNotificationCount),
      helper: 'Okunmamış',
    },
  ]

  return (
    <section className="px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Mindora Uzman Paneli
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Hoş geldiniz.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Danışanlarınızı, görüşmelerinizi, çalışma saatlerinizi ve kazançlarınızı
                tek ekrandan güvenli şekilde takip edin.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="green">Panel erişimi aktif</StatusPill>
                <StatusPill>Güvenli uzman alanı</StatusPill>
                <StatusPill tone="blue">{data.upcomingBookings.length} yaklaşan seans</StatusPill>
                <StatusPill tone="blue">{data.unreadNotificationCount} okunmamış bildirim</StatusPill>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/expert/dashboard/sessions"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
              >
                Görüşmeleri Aç
              </Link>
              <Link
                href="/expert/dashboard/verification"
                className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-all duration-200 ease-out hover:bg-indigo-100"
              >
                Belgeleri Doğrula
              </Link>
              <Link
                href="/expert/dashboard/availability"
                className="inline-flex items-center justify-center rounded-full bg-pine-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-pine-900"
              >
                Müsaitlik Yönet
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card, index) => (
            <MetricCard
              key={card.label}
              title={card.label}
              value={card.value}
              subtitle={card.helper}
              index={index}
            />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <Panel
            title="Yaklaşan Görüşmeler"
            description="Bugün ve sonraki günlerdeki planlı seanslar."
            actionHref="/expert/dashboard/sessions"
            actionLabel="Tümünü gör"
          >
            {data.upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingBookings.map((booking) => (
                  <SessionItem
                    key={booking.id}
                    booking={booking}
                    clientName={getClientName(booking.client_id, data.clientsById)}
                    clientEmail={getClientEmail(booking.client_id, data.clientsById)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henüz yaklaşan görüşme yok"
                description="Yeni bir seans planlandığında tarih, saat, danışan ve katılım bilgileri burada görünecek."
              />
            )}
          </Panel>

          <Panel title="Hızlı İşlemler" description="Sık kullanılan uzman paneli adımları.">
            <div className="grid gap-3">
              <QuickLink
                href="/expert/dashboard/availability"
                title="Müsaitlik Yönet"
                description="Haftalık uygun gün ve saatlerinizi düzenleyin."
              />
              <QuickLink
                href="/expert/dashboard/clients"
                title="Danışanları Gör"
                description="Aktif danışan süreçlerini kontrol edin."
              />
              <QuickLink
                href="/expert/dashboard/earnings"
                title="Kazançları İncele"
                description="Net kazanç ve ödeme durumunu takip edin."
              />
              <QuickLink
                href="/expert/dashboard/profile"
                title="Profili Düzenle"
                description="Uzman profilinizi ve görünür bilgilerinizi yönetin."
              />
              <QuickLink
                href="/expert/dashboard/verification"
                title="Doğrulama Merkezi"
                description="Diploma, lisans ve sertifika belgelerinizi güvenli şekilde yönetin."
              />
              <QuickLink
                href="/expert/notifications"
                title="Bildirimler"
                description={`${data.unreadNotificationCount} okunmamış bildirim ve son sistem güncellemeleri.`}
              />
            </div>
          </Panel>
        </section>

        <Panel
          title="Bildirimler"
          description="Son sistem, seans, ödeme ve danışan bildirimleri."
          actionHref="/expert/notifications"
          actionLabel="Tümünü gör"
        >
          {data.notifications.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz bildirim yok"
              description="Yeni mesaj, seans, ödeme ve sistem bildirimleri burada görünecek."
            />
          )}
        </Panel>

        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                C14 Uzman Doğrulama
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Güven rozetinizi tamamlayın.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Diploma, lisans ve uzmanlık belgeleri doğrulanan profiller danışan tarafında daha güvenilir görünür.
                Belgelerinizi yükleyip admin onay sürecini buradan takip edebilirsiniz.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
              <VerificationMiniCard label="Diploma" value="Yükleme" />
              <VerificationMiniCard label="Lisans / Sertifika" value="Kontrol" />
            </div>

            <Link
              href="/expert/dashboard/verification"
              className="inline-flex items-center justify-center rounded-full bg-pine-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-pine-900"
            >
              Doğrulama Merkezini Aç
            </Link>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel
            title="Danışanlar"
            description="Devam eden danışan süreçleri."
            actionHref="/expert/dashboard/clients"
            actionLabel="Tümünü gör"
          >
            {data.activeConversations.length > 0 ? (
              <div className="space-y-3">
                {data.activeConversations.slice(0, 4).map((conversation) => (
                  <ClientItem
                    key={conversation.id}
                    conversation={conversation}
                    clientName={getClientName(conversation.client_application_id, data.clientsById)}
                    clientEmail={getClientEmail(conversation.client_application_id, data.clientsById)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henüz aktif danışan yok"
                description="Eşleşme tamamlandığında danışan bilgileriniz, chat bağlantınız ve süreç durumunuz burada listelenecek."
              />
            )}
          </Panel>

          <Panel title="Bugünkü Öncelikler" description="Görüşme öncesi kısa kontrol listesi.">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'Kamera ve mikrofon kontrolü',
                'Danışan notlarını gözden geçir',
                'Görüşme sonrası kısa not bırak',
                'Gerekirse yeni randevu planla',
                'Eksik belge ve profil bilgilerini kontrol et',
              ].map((item) => (
                <ChecklistItem key={item}>{item}</ChecklistItem>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </section>
  )
}

function NotificationItem({ notification }: { notification: NotificationRow }) {
  const content = (
    <article
      className={`rounded-xl border p-4 transition-all duration-200 ease-out ${
        notification.is_read
          ? 'border-slate-200/80 bg-slate-50 hover:border-slate-300'
          : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            notification.is_read
              ? 'border-slate-200 bg-white text-slate-600'
              : 'border-indigo-200 bg-white text-indigo-700'
          }`}
        >
          {getNotificationTypeLabel(notification.type)}
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {formatDateTime(notification.created_at)}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-900">{notification.title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {getPreview(notification.message)}
      </p>

      {!notification.is_read ? (
        <p className="mt-2 text-xs font-semibold text-indigo-600">Yeni bildirim</p>
      ) : null}
    </article>
  )

  if (!notification.link) return content

  return (
    <Link href={notification.link} className="block">
      {content}
    </Link>
  )
}

function VerificationMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function StatusPill({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'green' | 'blue'
}) {
  const className =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-slate-200 bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  index = 0,
}: {
  title: string
  value: string
  subtitle: string
  index?: number
}) {
  return (
    <article
      className="animate-fade-in-up rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:border-slate-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </article>
  )
}

function Panel({
  title,
  description,
  children,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  children: ReactNode
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="shrink-0 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  )
}

function SessionItem({
  booking,
  clientName,
  clientEmail,
}: {
  booking: BookingRow
  clientName: string
  clientEmail: string | null
}) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 transition-all duration-200 ease-out hover:border-indigo-200 hover:bg-indigo-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{clientName}</p>
          {clientEmail ? <p className="mt-1 text-xs font-semibold text-slate-500">{clientEmail}</p> : null}
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {formatDateTime(booking.scheduled_start_at)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {formatTimeRange(booking.scheduled_start_at, booking.scheduled_end_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {booking.conversation_id ? (
            <Link
              href={`/expert/chat/${booking.conversation_id}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Chat
            </Link>
          ) : null}
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
              booking.status
            )}`}
          >
            {getStatusLabel(booking.status)}
          </span>
        </div>
      </div>
    </article>
  )
}

function ClientItem({
  conversation,
  clientName,
  clientEmail,
}: {
  conversation: ConversationRow
  clientName: string
  clientEmail: string | null
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 transition-all duration-200 ease-out hover:border-indigo-200 hover:bg-indigo-50 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{clientName}</p>
        {clientEmail ? <p className="mt-1 text-xs font-semibold text-slate-500">{clientEmail}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
              conversation.status
            )}`}
          >
            {getStatusLabel(conversation.status)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
              conversation.payment_status
            )}`}
          >
            {getStatusLabel(conversation.payment_status)}
          </span>
        </div>
      </div>

      <Link
        href={`/expert/chat/${conversation.id}`}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:bg-slate-100"
      >
        Mesaj
      </Link>
    </article>
  )
}

function ChecklistItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 transition-all duration-200 ease-out hover:bg-indigo-50">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700">
        ✓
      </span>
      <span className="text-sm font-semibold text-slate-700">{children}</span>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50 p-4 transition-all duration-200 ease-out hover:border-indigo-200 hover:bg-indigo-50"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span>
      </span>
      <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500">
        →
      </span>
    </Link>
  )
}
