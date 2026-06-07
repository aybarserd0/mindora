import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type BookingStatus = 'scheduled' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'no_show'
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
type PayoutStatus = 'unpaid' | 'scheduled' | 'paid' | 'blocked' | null

type PaymentRow = {
  id: string
  amount: number | null
  commission_amount: number | null
  expert_amount: number | null
  status: PaymentStatus | string | null
  expert_payout_status: PayoutStatus | string
  created_at: string | null
}

type BookingRow = {
  id: string
  expert_id: string | null
  client_id: string | null
  conversation_id: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  status: BookingStatus | string | null
}

type ConversationRow = {
  id: string
  expert_id: string | null
  client_id: string | null
  status: string | null
  payment_status: string | null
}

type DashboardSummary = {
  upcomingSessions: number
  activeClients: number
  monthlyRevenue: number
  pendingPayouts: number
  totalRevenue: number
  completedPayouts: number
}

const UPCOMING_BOOKING_STATUSES = ['scheduled', 'confirmed', 'active']
const ACTIVE_CONVERSATION_STATUSES = ['active', 'matched', 'open']

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function toNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function getMonthStartIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString()
}

function getNowIso() {
  return new Date().toISOString()
}

function getUniqueClientCount(conversations: ConversationRow[]) {
  const clientIds = new Set<string>()

  for (const conversation of conversations) {
    if (conversation.client_id) clientIds.add(conversation.client_id)
  }

  return clientIds.size
}

function buildSummary({
  upcomingBookings,
  activeConversations,
  payments,
}: {
  upcomingBookings: BookingRow[]
  activeConversations: ConversationRow[]
  payments: PaymentRow[]
}): DashboardSummary {
  const monthStart = getMonthStartIso()
  const paidPayments = payments.filter((payment) => payment.status === 'paid')
  const monthlyPaidPayments = paidPayments.filter((payment) => {
    if (!payment.created_at) return false
    return payment.created_at >= monthStart
  })
  const pendingPayoutPayments = paidPayments.filter(
    (payment) => payment.expert_payout_status !== 'paid'
  )
  const completedPayoutPayments = paidPayments.filter(
    (payment) => payment.expert_payout_status === 'paid'
  )

  return {
    upcomingSessions: upcomingBookings.length,
    activeClients: getUniqueClientCount(activeConversations),
    monthlyRevenue: monthlyPaidPayments.reduce(
      (sum, payment) => sum + toNumber(payment.expert_amount),
      0
    ),
    pendingPayouts: pendingPayoutPayments.reduce(
      (sum, payment) => sum + toNumber(payment.expert_amount),
      0
    ),
    totalRevenue: paidPayments.reduce(
      (sum, payment) => sum + toNumber(payment.expert_amount),
      0
    ),
    completedPayouts: completedPayoutPayments.reduce(
      (sum, payment) => sum + toNumber(payment.expert_amount),
      0
    ),
  }
}

export async function GET(req: NextRequest) {
  try {
    const expertId = req.nextUrl.searchParams.get('expertId')

    if (!isValidUuid(expertId)) {
      return jsonError('Geçerli expertId gerekli.', 400)
    }

    const supabase = getSupabaseAdmin()
    const nowIso = getNowIso()

    const [upcomingBookingsResult, activeConversationsResult, paymentsResult] =
      await Promise.all([
        supabase
          .from('bookings' as never)
          .select(
            'id,expert_id,client_id,conversation_id,scheduled_start_at,scheduled_end_at,status'
          )
          .eq('expert_id', expertId as never)
          .gte('scheduled_start_at', nowIso as never)
          .in('status', UPCOMING_BOOKING_STATUSES as never)
          .order('scheduled_start_at', { ascending: true })
          .limit(5),

        supabase
          .from('conversations' as never)
          .select('id,expert_id,client_id,status,payment_status')
          .eq('expert_id', expertId as never)
          .in('status', ACTIVE_CONVERSATION_STATUSES as never),

        supabase
          .from('payments' as never)
          .select(
            'id,amount,commission_amount,expert_amount,status,expert_payout_status,created_at'
          )
          .eq('expert_id', expertId as never)
          .order('created_at', { ascending: false }),
      ])

    if (upcomingBookingsResult.error) throw upcomingBookingsResult.error
    if (activeConversationsResult.error) throw activeConversationsResult.error
    if (paymentsResult.error) throw paymentsResult.error

    const upcomingBookings =
      (upcomingBookingsResult.data || []) as unknown as BookingRow[]
    const activeConversations =
      (activeConversationsResult.data || []) as unknown as ConversationRow[]
    const payments = (paymentsResult.data || []) as unknown as PaymentRow[]

    const summary = buildSummary({
      upcomingBookings,
      activeConversations,
      payments,
    })

    return NextResponse.json({
      ok: true,
      summary,
      upcomingSessions: upcomingBookings,
      activeConversations,
      recentPayments: payments.slice(0, 5),
    })
  } catch (err) {
    console.error('Expert dashboard GET error:', err)

    return NextResponse.json(
      { ok: false, error: 'Uzman dashboard verileri alınamadı.' },
      { status: 500 }
    )
  }
}
