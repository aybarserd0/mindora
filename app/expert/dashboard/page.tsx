import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
type PayoutStatus = 'unpaid' | 'scheduled' | 'paid' | 'blocked' | null

type BookingRow = {
  id: string
  expert_id: string | null
  client_id?: string | null
  conversation_id?: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  status: string | null
  client_applications?: {
    id?: string | null
    name?: string | null
    email?: string | null
  } | null
}

type ConversationRow = {
  id: string
  expert_id: string | null
  client_id?: string | null
  status: string | null
  payment_status?: string | null
  client_applications?: {
    id?: string | null
    name?: string | null
    email?: string | null
  } | null
}

type PaymentRow = {
  id: string
  expert_id: string | null
  amount: number | null
  commission_amount: number | null
  expert_amount: number | null
  status: PaymentStatus | string | null
  expert_payout_status: PayoutStatus | string
  expert_payout_paid_at: string | null
  created_at: string | null
  client_applications?: {
    id?: string | null
    name?: string | null
    email?: string | null
  } | null
}

type DashboardData = {
  expertId: string | null
  upcomingBookings: BookingRow[]
  activeConversations: ConversationRow[]
  payments: PaymentRow[]
  hasRuntimeError: boolean
  errorMessage: string | null
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

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return '-'
  }
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

function getClientName(row: BookingRow | ConversationRow | PaymentRow) {
  return row.client_applications?.name?.trim() || 'Danışan'
}

async function getExpertDashboardData(): Promise<DashboardData> {
  try {
    const supabase = getSupabaseAdmin() as any
    const nowIso = new Date().toISOString()

    const expertId = process.env.MINDORA_DEV_EXPERT_ID || null

    let bookingsQuery = supabase
      .from('bookings')
      .select(
        'id, expert_id, client_id, conversation_id, scheduled_start_at, scheduled_end_at, status, client_applications(id, name, email)'
      )
      .in('status', ['scheduled', 'confirmed', 'active'])
      .gte('scheduled_start_at', nowIso)
      .order('scheduled_start_at', { ascending: true })
      .limit(5)

    let conversationsQuery = supabase
      .from('conversations')
      .select('id, expert_id, client_id, status, payment_status, client_applications(id, name, email)')
      .in('status', ['active', 'matched', 'open'])
      .limit(100)

    let paymentsQuery = supabase
      .from('payments')
      .select(
        'id, expert_id, amount, commission_amount, expert_amount, status, expert_payout_status, expert_payout_paid_at, created_at, client_applications(id, name, email)'
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

    const firstError =
      bookingsResult.error || conversationsResult.error || paymentsResult.error || null

    if (firstError) {
      return {
        expertId,
        upcomingBookings: [],
        activeConversations: [],
        payments: [],
        hasRuntimeError: true,
        errorMessage: firstError.message || 'Dashboard verileri alınamadı.',
      }
    }

    return {
      expertId,
      upcomingBookings: (bookingsResult.data || []) as BookingRow[],
      activeConversations: (conversationsResult.data || []) as ConversationRow[],
      payments: (paymentsResult.data || []) as PaymentRow[],
      hasRuntimeError: false,
      errorMessage: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen dashboard hatası.'

    return {
      expertId: null,
      upcomingBookings: [],
      activeConversations: [],
      payments: [],
      hasRuntimeError: true,
      errorMessage: message,
    }
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

  const totalEarnings = sumNumbers(paidPayments, (payment) => payment.expert_amount)
  const thisMonthEarnings = sumNumbers(
    thisMonthPaidPayments,
    (payment) => payment.expert_amount
  )
  const pendingPayoutAmount = sumNumbers(unpaidPayouts, (payment) => payment.expert_amount)

  const uniqueActiveClientIds = new Set(
    data.activeConversations
      .map((conversation) => conversation.client_id || conversation.client_applications?.id)
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
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Uzman Paneli</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Hoş geldiniz
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Yaklaşan seanslarınızı, danışanlarınızı, müsaitlik durumunuzu ve
              kazanç özetinizi tek ekrandan takip edin.
            </p>
          </div>

          <Link
            href="/expert/dashboard/availability"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Müsaitlik Yönet
          </Link>
        </div>

        {data.hasRuntimeError ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Dashboard verisi şu an alınamadı.</p>
            <p className="mt-1 text-amber-800">{data.errorMessage}</p>
            <p className="mt-2 text-xs text-amber-700">
              Sayfa build-safe çalışır. Veri bağlantısı için tablo/kolon isimleri ve uzman
              kimliği eşleşmesi kontrol edilmeli.
            </p>
          </div>
        ) : null}

        {!data.expertId ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">Geliştirme modu</p>
            <p className="mt-1">
              Henüz oturumdaki uzman kimliği bağlanmadığı için dashboard tüm uzman verileriyle
              özetlenir. Canlı sistemde bu alan auth üzerinden sadece ilgili uzmana filtrelenecek.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <DashboardCard
              key={item.title}
              title={item.title}
              value={item.value}
              description={item.description}
            />
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Yaklaşan Seanslar
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bugün ve önümüzdeki günlerdeki planlı görüşmeler.
                </p>
              </div>

              <Link
                href="/expert/dashboard/sessions"
                className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                Tümünü gör
              </Link>
            </div>

            {data.upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {getClientName(booking)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDateTime(booking.scheduled_start_at)}
                      </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                      {booking.status || 'scheduled'}
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Kazanç Özeti</h2>
            <p className="mt-1 text-sm text-slate-500">
              Aylık gelir ve ödeme durumunuz.
            </p>

            <div className="mt-6 space-y-4">
              <MoneyRow label="Toplam Kazanç" value={formatMoney(totalEarnings)} />
              <MoneyRow label="Bu Ay" value={formatMoney(thisMonthEarnings)} />
              <MoneyRow label="Bekleyen" value={formatMoney(pendingPayoutAmount)} />
            </div>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Danışanlar</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Aktif danışanlarınız ve görüşme geçmişiniz.
                </p>
              </div>

              <Link
                href="/expert/dashboard/clients"
                className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                Tümünü gör
              </Link>
            </div>

            {data.activeConversations.length > 0 ? (
              <div className="mt-5 space-y-3">
                {data.activeConversations.slice(0, 4).map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {getClientName(conversation)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Durum: {conversation.status || '-'}
                      </p>
                    </div>

                    <Link
                      href={`/expert/chat/${conversation.id}`}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Hızlı İşlemler</h2>
            <p className="mt-1 text-sm text-slate-500">
              En sık kullanılan uzman paneli aksiyonları.
            </p>

            <div className="mt-5 space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="block rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {action.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  )
}
