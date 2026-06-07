import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
type PayoutStatus = 'unpaid' | 'scheduled' | 'paid' | 'blocked'

type RawPaymentRow = {
  id?: string | null
  expert_id?: string | null
  client_id?: string | null
  amount?: number | string | null
  commission_amount?: number | string | null
  expert_amount?: number | string | null
  status?: string | null
  expert_payout_status?: string | null
  expert_payout_paid_at?: string | null
  created_at?: string | null
  iyzico_payment_id?: string | null
  iyzico_conversation_id?: string | null
  client_applications?: {
    id?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
  } | null
}

type EarningItem = {
  id: string
  expertId: string | null
  clientId: string | null
  clientName: string
  clientEmail: string | null
  grossAmount: number
  commissionAmount: number
  expertAmount: number
  status: PaymentStatus
  payoutStatus: PayoutStatus
  payoutPaidAt: string | null
  createdAt: string | null
  iyzicoPaymentId: string | null
  iyzicoConversationId: string | null
}

const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
]

const PAYOUT_STATUSES: PayoutStatus[] = ['unpaid', 'scheduled', 'paid', 'blocked']

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const normalized = toText(value).toLowerCase()
  return PAYMENT_STATUSES.includes(normalized as PaymentStatus)
    ? (normalized as PaymentStatus)
    : 'pending'
}

function normalizePayoutStatus(value: unknown): PayoutStatus {
  const normalized = toText(value).toLowerCase()
  return PAYOUT_STATUSES.includes(normalized as PayoutStatus)
    ? (normalized as PayoutStatus)
    : 'unpaid'
}

function isCurrentMonth(value: string | null) {
  if (!value) return false

  const date = new Date(value)
  const now = new Date()

  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function isDateOnOrAfter(value: string | null, startIso: string | null) {
  if (!startIso) return true
  if (!value) return false

  const valueTime = new Date(value).getTime()
  const startTime = new Date(startIso).getTime()

  if (!Number.isFinite(valueTime) || !Number.isFinite(startTime)) return true

  return valueTime >= startTime
}

function isDateOnOrBefore(value: string | null, endIso: string | null) {
  if (!endIso) return true
  if (!value) return false

  const valueTime = new Date(value).getTime()
  const endTime = new Date(endIso).getTime()

  if (!Number.isFinite(valueTime) || !Number.isFinite(endTime)) return true

  return valueTime <= endTime
}

function normalizeDateParam(value: string | null) {
  const clean = toText(value)
  if (!clean) return null

  const date = new Date(clean)
  if (!Number.isFinite(date.getTime())) return null

  return date.toISOString()
}

function mapPayment(row: RawPaymentRow): EarningItem {
  const client = row.client_applications || null

  return {
    id: toText(row.id) || crypto.randomUUID(),
    expertId: toText(row.expert_id) || null,
    clientId: toText(client?.id || row.client_id) || null,
    clientName: toText(client?.name) || 'Danışan',
    clientEmail: toText(client?.email) || null,
    grossAmount: toNumber(row.amount),
    commissionAmount: toNumber(row.commission_amount),
    expertAmount: toNumber(row.expert_amount),
    status: normalizePaymentStatus(row.status),
    payoutStatus: normalizePayoutStatus(row.expert_payout_status),
    payoutPaidAt: toText(row.expert_payout_paid_at) || null,
    createdAt: toText(row.created_at) || null,
    iyzicoPaymentId: toText(row.iyzico_payment_id) || null,
    iyzicoConversationId: toText(row.iyzico_conversation_id) || null,
  }
}

function sum(items: EarningItem[], getter: (item: EarningItem) => number) {
  return items.reduce((total, item) => {
    const value = Number(getter(item) || 0)
    return Number.isFinite(value) ? total + value : total
  }, 0)
}

function buildSummary(earnings: EarningItem[]) {
  const paid = earnings.filter((item) => item.status === 'paid')
  const pending = earnings.filter((item) => item.status === 'pending')
  const failed = earnings.filter((item) => item.status === 'failed')
  const refunded = earnings.filter((item) => item.status === 'refunded')
  const currentMonthPaid = paid.filter((item) => isCurrentMonth(item.createdAt))
  const unpaidPayouts = paid.filter((item) => item.payoutStatus !== 'paid')
  const paidPayouts = paid.filter((item) => item.payoutStatus === 'paid')

  return {
    totalRecords: earnings.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    failedCount: failed.length,
    refundedCount: refunded.length,
    totalGross: sum(paid, (item) => item.grossAmount),
    totalCommission: sum(paid, (item) => item.commissionAmount),
    totalNet: sum(paid, (item) => item.expertAmount),
    currentMonthNet: sum(currentMonthPaid, (item) => item.expertAmount),
    pendingAmount: sum(pending, (item) => item.grossAmount),
    pendingPayout: sum(unpaidPayouts, (item) => item.expertAmount),
    completedPayout: sum(paidPayouts, (item) => item.expertAmount),
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const expertId = toText(req.nextUrl.searchParams.get('expertId'))
    const status = toText(req.nextUrl.searchParams.get('status')).toLowerCase()
    const payoutStatus = toText(req.nextUrl.searchParams.get('payoutStatus')).toLowerCase()
    const startDate = normalizeDateParam(req.nextUrl.searchParams.get('startDate'))
    const endDate = normalizeDateParam(req.nextUrl.searchParams.get('endDate'))
    const limitParam = Number(req.nextUrl.searchParams.get('limit') || 100)
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 500)
      : 100

    if (expertId && !isValidUuid(expertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    if (status && status !== 'all' && !PAYMENT_STATUSES.includes(status as PaymentStatus)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli ödeme durumu gerekli.' },
        { status: 400 }
      )
    }

    if (
      payoutStatus &&
      payoutStatus !== 'all' &&
      !PAYOUT_STATUSES.includes(payoutStatus as PayoutStatus)
    ) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli payout durumu gerekli.' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('payments' as never)
      .select(
        `
        id,
        expert_id,
        client_id,
        amount,
        commission_amount,
        expert_amount,
        status,
        expert_payout_status,
        expert_payout_paid_at,
        created_at,
        iyzico_payment_id,
        iyzico_conversation_id,
        client_applications(id, name, email, phone)
        `
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (expertId) {
      query = query.eq('expert_id', expertId as never)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status as never)
    }

    if (payoutStatus && payoutStatus !== 'all') {
      query = query.eq('expert_payout_status', payoutStatus as never)
    }

    if (startDate) {
      query = query.gte('created_at', startDate as never)
    }

    if (endDate) {
      query = query.lte('created_at', endDate as never)
    }

    const { data, error } = await query

    if (error) {
      console.error('EXPERT_EARNINGS_QUERY_ERROR', error)
      return NextResponse.json(
        { ok: false, error: 'Kazanç bilgileri alınamadı.' },
        { status: 500 }
      )
    }

    const earnings = ((data || []) as RawPaymentRow[])
      .map(mapPayment)
      .filter(
        (item) =>
          isDateOnOrAfter(item.createdAt, startDate) &&
          isDateOnOrBefore(item.createdAt, endDate)
      )

    return NextResponse.json({
      ok: true,
      meta: {
        expertId: expertId || null,
        status: status || 'all',
        payoutStatus: payoutStatus || 'all',
        startDate,
        endDate,
        limit,
      },
      summary: buildSummary(earnings),
      earnings,
    })
  } catch (error) {
    console.error('EXPERT_EARNINGS_ROUTE_ERROR', error)

    return NextResponse.json(
      { ok: false, error: 'Kazanç endpointi çalıştırılamadı.' },
      { status: 500 }
    )
  }
}
