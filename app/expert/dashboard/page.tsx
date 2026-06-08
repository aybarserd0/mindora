import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type BookingRow = {
  id: string
  expert_id: string | null
  conversation_id: string | null
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
  client_id: string | null
  amount: number | null
  commission_amount: number | null
  expert_amount: number | null
  status: string | null
  expert_payout_status: string | null
  created_at: string | null
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
  clientsById: Map<string, ClientRow>
}

const quickActions = [
  {
    title: 'Müsaitlik Yönet',
    description: 'Haftalık uygun gün ve saatlerini düzenle.',
    href: '/expert/dashboard/availability',
  },
  {
    title: 'Seansları Gör',
    description: 'Yaklaşan ve geçmiş görüşmelerini takip et.',
    href: '/expert/dashboard/sessions',
  },
  {
    title: 'Danışanlar',
    description: 'Aktif danışanlarını ve süreçlerini görüntüle.',
    href: '/expert/dashboard/clients',
  },
  {
    title: 'Kazançlar',
    description: 'Net kazançlarını ve ödeme durumunu incele.',
    href: '/expert/dashboard/earnings',
  },
]

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
  if (!value) return '-'

  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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

function sumNumbers<T>(items: T[], getter: (item: T) => number | null | undefined) {
  return items.reduce((total, item) => {
    const value = Number(getter(item) || 0)
    return Number.isFinite(value) ? total + value : total
  }, 0)
}

function normalizeStatusLabel(status: string | null | undefined) {
  switch ((status || '').toLowerCase()) {
    case 'scheduled':
      return 'Planlandı'
    case 'confirmed':
      return 'Onaylandı'
    case 'active':
      return 'Aktif'
    case 'completed':
      return 'Tamamlandı'
    case 'cancelled':
      return 'İptal'
    default:
      return status || 'Planlandı'
  }
}

function getClientName(clientId: string | null | undefined, clientsById: Map<string, ClientRow>) {
  if (!clientId) return 'Danışan'
  return clientsById.get(clientId)?.name?.trim() || 'Danışan'
}

async function fetchClientsByIds(clientIds: string[]) {
  const uniqueIds = Array.from(new Set(clientIds.filter(Boolean)))

  if (uniqueIds.length === 0) return new Map<string, ClientRow>()

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('client_applications')
      .select('id, name, email')
      .in('id', uniqueIds)

    if (error) return new Map<string, ClientRow>()
    return new Map((data || []).map((client) => [client.id, client as ClientRow]))
  } catch {
    return new Map<string, ClientRow>()
  }
}

async function getExpertDashboardData(): Promise<DashboardData> {
  const emptyData: DashboardData = {
    upcomingBookings: [],
    activeConversations: [],
    payments: [],
    clientsById: new Map<string, ClientRow>(),
  }

  try {
    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()
    const expertId = process.env.MINDORA_DEV_EXPERT_ID || null

    let bookingsQuery = (supabase as any)
      .from('session_bookings')
      .select('id, expert_id, conversation_id, scheduled_start_at, scheduled_end_at, status')
      .in('status', ['scheduled', 'confirmed', 'active'])
      .gte('scheduled_start_at', nowIso)
      .order('scheduled_start_at', { ascending: true })
      .limit(4)

    let conversationsQuery = supabase
      .from('conversations')
      .select('id, client_application_id, expert_id, status, payment_status, updated_at')
      .in('status', ['active', 'matched', 'open'])
      .order('updated_at', { ascending: false })
      .limit(20)

    let paymentsQuery = supabase
      .from('payments')
      .select(
        'id, expert_id, client_id, amount, commission_amount, expert_amount, status, expert_payout_status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100)

    if (expertId) {
      bookingsQuery = bookingsQuery.eq('expert_id', expertId)
      conversationsQuery = conversationsQuery.eq('expert_id', expertId)
      paymentsQuery = paymentsQuery.eq('expert_id', expertId)
    }

    const [bookingsResult, conversationsResult, paymentsResult] = await Promise.all([
      bookingsQuery,
      conversationsQuery,
      paymentsQuery,
    ])

    if (bookingsResult.error || conversationsResult.error || paymentsResult.error) {
      return emptyData
    }

    const upcomingBookings = (bookingsResult.data || []) as BookingRow[]
    const activeConversations = (conversationsResult.data || []) as ConversationRow[]
    const payments = (paymentsResult.data || []) as PaymentRow[]
    const clientIds = activeConversations
      .map((conversation) => conversation.client_application_id)
      .filter((id): id is string => Boolean(id))

    const clientsById = await fetchClientsByIds(clientIds)

    return {
      upcomingBookings,
      activeConversations,
      payments,
      clientsById,
    }
  } catch {
    return emptyData
  }
}

export default async function ExpertDashboardPage() {
  const data = await getExpertDashboardData()

  const paidPayments = data.payments.filter((payment) => payment.status === 'paid')
  const thisMonthPaidPayments = paidPayments.filter((payment) =>
    isCurrentMonth(payment.created_at)
  )
  const unpaidPayouts = paidPayments.filter(
    (payment) => payment.expert_payout_status !== 'paid'
  )

  const thisMonthEarnings = sumNumbers(
    thisMonthPaidPayments,
    (payment) => payment.expert_amount
  )
  const pendingPayoutAmount = sumNumbers(unpaidPayouts, (payment) => payment.expert_amount)

  const uniqueActiveClientIds = new Set(
    data.activeConversations
      .map((conversation) => conversation.client_application_id)
      .filter(Boolean)
  )

  const stats = [
    {
      title: 'Yaklaşan Seans',
      value: String(data.upcomingBookings.length),
      description: 'Planlanan görüşme',
    },
    {
      title: 'Aktif Danışan',
      value: String(uniqueActiveClientIds.size || data.activeConversations.length),
      description: 'Devam eden süreç',
    },
    {
      title: 'Bu Ay Kazanç',
      value: formatMoney(thisMonthEarnings),
      description: 'Net uzman kazancı',
    },
    {
      title: 'Bekleyen Ödeme',
      value: formatMoney(pendingPayoutAmount),
      description: 'Aktarım bekleyen',
    },
  ]

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
              Günlük özet
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Bugünkü iş akışınız hazır
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Yaklaşan seansları, aktif danışanları ve kazanç durumunu tek ekrandan hızlıca kontrol edin.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/expert/dashboard/sessions"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Seansları Aç
            </Link>
            <Link
              href="/expert/dashboard/availability"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
            >
              Müsaitlik Yönet
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <DashboardCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Yaklaşan Seanslar"
          description="Bugün ve önümüzdeki günlerdeki planlı görüşmeler."
          actionHref="/expert/dashboard/sessions"
          actionLabel="Tümünü gör"
        >
          {data.upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {data.upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">Danışan</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateTime(booking.scheduled_start_at)}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                    {normalizeStatusLabel(booking.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz yaklaşan seans yok"
              description="Yeni bir seans planlandığında burada tarih, saat ve danışan bilgisiyle görünecek."
            />
          )}
        </Panel>

        <Panel title="Hızlı İşlemler" description="En sık kullanılan uzman paneli aksiyonları.">
          <div className="grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-950 group-hover:text-indigo-700">
                      {action.title}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {action.description}
                    </p>
                  </div>
                  <span className="text-lg font-black text-slate-300 group-hover:text-indigo-500">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel
          title="Danışanlar"
          description="Aktif danışanlarınız ve görüşme geçmişiniz."
          actionHref="/expert/dashboard/clients"
          actionLabel="Tümünü gör"
        >
          {data.activeConversations.length > 0 ? (
            <div className="space-y-3">
              {data.activeConversations.slice(0, 4).map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {getClientName(conversation.client_application_id, data.clientsById)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Durum: {normalizeStatusLabel(conversation.status)}
                    </p>
                  </div>

                  <Link
                    href={`/expert/chat/${conversation.id}`}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    Chat
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz aktif danışan yok"
              description="Eşleşme tamamlandığında danışanlarınız burada listelenecek."
            />
          )}
        </Panel>

        <Panel title="Bugünkü öncelikler" description="Seans öncesi kısa kontrol listesi.">
          <div className="grid gap-3 sm:grid-cols-2">
            <ChecklistItem title="Kamera ve mikrofon kontrolü" />
            <ChecklistItem title="Danışan notlarını gözden geçir" />
            <ChecklistItem title="Seans sonrası kısa not bırak" />
            <ChecklistItem title="Yeni randevu gerekirse planla" />
          </div>
        </Panel>
      </section>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function Panel({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="shrink-0 text-sm font-black text-indigo-600 transition hover:text-indigo-700"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}

function ChecklistItem({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
        ✓
      </span>
      <span className="text-sm font-semibold text-slate-700">{title}</span>
    </div>
  )
}
