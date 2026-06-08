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

function sumMoney(items: PaymentRow[]) {
  return items.reduce((total, item) => {
    const value = Number(item.expert_amount || 0)
    return Number.isFinite(value) ? total + value : total
  }, 0)
}

function getClientName(clientId: string | null | undefined, clientsById: Map<string, ClientRow>) {
  if (!clientId) return 'Danışan'
  return clientsById.get(clientId)?.name?.trim() || 'Danışan'
}

function getStatusLabel(status: string | null | undefined) {
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
      return 'İptal Edildi'
    default:
      return 'Planlandı'
  }
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

async function getDashboardData(): Promise<DashboardData> {
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

    let bookingsQuery = supabase
      .from('session_bookings' as never)
      .select('id, expert_id, conversation_id, scheduled_start_at, scheduled_end_at, status')
      .in('status', ['scheduled', 'confirmed', 'active'] as never)
      .gte('scheduled_start_at', nowIso as never)
      .order('scheduled_start_at', { ascending: true })
      .limit(5)

    let conversationsQuery = supabase
      .from('conversations')
      .select('id, client_application_id, expert_id, status, payment_status, updated_at')
      .in('status', ['active', 'matched', 'open'])
      .limit(6)

    let paymentsQuery = supabase
      .from('payments')
      .select('id, expert_id, expert_amount, status, expert_payout_status, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (expertId) {
      bookingsQuery = bookingsQuery.eq('expert_id', expertId as never)
      conversationsQuery = conversationsQuery.eq('expert_id', expertId)
      paymentsQuery = paymentsQuery.eq('expert_id', expertId)
    }

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

    const activeConversations = (conversationsResult.data || []) as unknown as ConversationRow[]
    const clientIds = activeConversations
      .map((conversation) => conversation.client_application_id)
      .filter((id): id is string => Boolean(id))

    return {
      upcomingBookings: (bookingsResult.data || []) as unknown as BookingRow[],
      activeConversations,
      payments: (paymentsResult.data || []) as unknown as PaymentRow[],
      clientsById: await fetchClientsByIds(clientIds),
    }
  } catch (error) {
    console.error('EXPERT_DASHBOARD_RUNTIME_ERROR', error)
    return emptyData
  }
}

export default async function ExpertDashboardPage() {
  const data = await getDashboardData()

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
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
              Günlük Özet
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Hoş geldiniz.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Danışanlarınızı, görüşmelerinizi, çalışma saatlerinizi ve kazançlarınızı tek ekrandan takip edin.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/expert/dashboard/sessions"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Görüşmeleri Aç
            </Link>
            <Link
              href="/expert/dashboard/availability"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
            >
              Müsaitlik Ekle
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-bold text-slate-500">{card.label}</p>
            <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-950">Yaklaşan Görüşmeler</h3>
              <p className="mt-1 text-sm text-slate-500">Bugün ve sonraki günlerdeki planlı seanslar.</p>
            </div>
            <Link href="/expert/dashboard/sessions" className="text-sm font-black text-indigo-600 hover:text-indigo-700">
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
                    <p className="text-sm font-black text-slate-950">Planlanan görüşme</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(booking.scheduled_start_at)}</p>
                  </div>
                  <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                    {getStatusLabel(booking.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz yaklaşan görüşme yok"
              description="Yeni bir seans planlandığında tarih, saat ve katılım bilgileri burada görünecek."
            />
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Hızlı İşlemler</h3>
          <p className="mt-1 text-sm text-slate-500">Sık kullanılan uzman paneli adımları.</p>

          <div className="mt-5 space-y-3">
            <QuickLink href="/expert/dashboard/availability" title="Müsaitlik Ekle" description="Haftalık uygun gün ve saatlerinizi düzenleyin." />
            <QuickLink href="/expert/dashboard/clients" title="Danışanları Gör" description="Aktif danışan süreçlerini kontrol edin." />
            <QuickLink href="/expert/dashboard/earnings" title="Kazançları İncele" description="Net kazanç ve ödeme durumunu takip edin." />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-950">Danışanlar</h3>
              <p className="mt-1 text-sm text-slate-500">Devam eden danışan süreçleri.</p>
            </div>
            <Link href="/expert/dashboard/clients" className="text-sm font-black text-indigo-600 hover:text-indigo-700">
              Tümünü gör
            </Link>
          </div>

          {data.activeConversations.length > 0 ? (
            <div className="space-y-3">
              {data.activeConversations.slice(0, 3).map((conversation) => (
                <div key={conversation.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {getClientName(conversation.client_application_id, data.clientsById)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Durum: {getStatusLabel(conversation.status)}</p>
                  </div>
                  <Link href={`/expert/chat/${conversation.id}`} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">
                    Mesaj
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz aktif danışan yok"
              description="Eşleşme tamamlandığında danışan bilgileriniz burada listelenecek."
            />
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Bugünkü Öncelikler</h3>
          <p className="mt-1 text-sm text-slate-500">Görüşme öncesi kısa kontrol listesi.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              'Kamera ve mikrofon kontrolü',
              'Danışan notlarını gözden geçir',
              'Görüşme sonrası kısa not bırak',
              'Gerekirse yeni randevu planla',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">✓</span>
                <span className="text-sm font-bold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50">
      <span>
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span>
      </span>
      <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500">→</span>
    </Link>
  )
}
