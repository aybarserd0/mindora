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
  client_application_id?: string | null
  conversation_id?: string | null
  amount?: number | string | null
  commission_amount?: number | string | null
  expert_amount?: number | string | null
  status?: string | null
  expert_payout_status?: string | null
  payout_status?: string | null
  expert_payout_paid_at?: string | null
  payout_paid_at?: string | null
  created_at?: string | null
  iyzico_payment_id?: string | null
  iyzico_conversation_id?: string | null
}

type ClientRow = {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
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
  statusLabel: string
  payoutStatus: PayoutStatus
  payoutStatusLabel: string
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

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Beklemede',
  paid: 'Ödendi',
  failed: 'Başarısız',
  cancelled: 'İptal Edildi',
  refunded: 'İade Edildi',
}

const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  unpaid: 'Ödeme Bekliyor',
  scheduled: 'Planlandı',
  paid: 'Uzmana Ödendi',
  blocked: 'Blokeli',
}

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status })
}

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

function normalizeDateParam(value: string | null) {
  const clean = toText(value)
  if (!clean) return null

  const date = new Date(clean)
  if (!Number.isFinite(date.getTime())) return null

  return date.toISOString()
}

function normalizeLimit(value: string | null) {
  const limit = Number(value || 100)
  if (!Number.isInteger(limit) || limit < 1) return 100
  return Math.min(limit, 500)
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

function getPaymentClientId(row: RawPaymentRow) {
  return (
    toText(row.client_application_id) ||
    toText(row.client_id) ||
    toText(row.conversation_id) ||
    ''
  )
}

function getClientName(clientId: string | null, clientsById: Map<string, ClientRow>) {
  if (!clientId) return 'Danışan'
  return toText(clientsById.get(clientId)?.name) || 'Danışan'
}

function getClientEmail(clientId: string | null, clientsById: Map<string, ClientRow>) {
  if (!clientId) return null
  return toText(clientsById.get(clientId)?.email) || null
}

function mapPayment(row: RawPaymentRow, clientsById: Map<string, ClientRow>): EarningItem {
  const status = normalizePaymentStatus(row.status)
  const payoutStatus = normalizePayoutStatus(row.expert_payout_status || row.payout_status)
  const clientId = getPaymentClientId(row) || null

  return {
    id: toText(row.id) || crypto.randomUUID(),
    expertId: toText(row.expert_id) || null,
    clientId,
    clientName: getClientName(clientId, clientsById),
    clientEmail: getClientEmail(clientId, clientsById),
    grossAmount: toNumber(row.amount),
    commissionAmount: toNumber(row.commission_amount),
    expertAmount: toNumber(row.expert_amount),
    status,
    statusLabel: PAYMENT_STATUS_LABELS[status],
    payoutStatus,
    payoutStatusLabel: PAYOUT_STATUS_LABELS[payoutStatus],
    payoutPaidAt: toText(row.expert_payout_paid_at || row.payout_paid_at) || null,
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

async function fetchClientApplications(clientIds: string[]) {
  const uniqueIds = Array.from(
    new Set(clientIds.filter((id) => isValidUuid(id)))
  )

  if (uniqueIds.length === 0) return new Map<string, ClientRow>()

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_applications')
    .select('id, name, email, phone')
    .in('id', uniqueIds)

  if (error) {
    console.error('EXPERT_EARNINGS_CLIENTS_QUERY_ERROR', error)
    return new Map<string, ClientRow>()
  }

  return new Map((data || []).map((client) => [client.id, client as ClientRow]))
}

async function fetchPayments(params: {
  expertId: string | null
  status: string
  payoutStatus: string
  startDate: string | null
  endDate: string | null
  limit: number
}) {
  const supabase = getSupabaseAdmin()

  let query = (supabase as any)
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit)

  if (params.expertId) {
    query = query.eq('expert_id', params.expertId)
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  if (params.payoutStatus && params.payoutStatus !== 'all') {
    query = query.eq('expert_payout_status', params.payoutStatus)
  }

  if (params.startDate) {
    query = query.gte('created_at', params.startDate)
  }

  if (params.endDate) {
    query = query.lte('created_at', params.endDate)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []) as RawPaymentRow[]
}

export async function GET(req: NextRequest) {
  try {
    const requestedExpertId = toText(req.nextUrl.searchParams.get('expertId'))
    const envExpertId = toText(process.env.MINDORA_DEV_EXPERT_ID)
    const expertId = requestedExpertId || envExpertId || null
    const status = toText(req.nextUrl.searchParams.get('status')).toLowerCase()
    const payoutStatus = toText(req.nextUrl.searchParams.get('payoutStatus')).toLowerCase()
    const startDate = normalizeDateParam(req.nextUrl.searchParams.get('startDate'))
    const endDate = normalizeDateParam(req.nextUrl.searchParams.get('endDate'))
    const limit = normalizeLimit(req.nextUrl.searchParams.get('limit'))

    if (requestedExpertId && !isValidUuid(requestedExpertId)) {
      return jsonError('Geçerli expertId gerekli.', 400)
    }

    if (envExpertId && !isValidUuid(envExpertId)) {
      return jsonError('MINDORA_DEV_EXPERT_ID geçerli UUID olmalı.', 500)
    }

    if (status && status !== 'all' && !PAYMENT_STATUSES.includes(status as PaymentStatus)) {
      return jsonError('Geçerli ödeme durumu gerekli.', 400)
    }

    if (
      payoutStatus &&
      payoutStatus !== 'all' &&
      !PAYOUT_STATUSES.includes(payoutStatus as PayoutStatus)
    ) {
      return jsonError('Geçerli uzman ödeme durumu gerekli.', 400)
    }

    const rawPayments = await fetchPayments({
      expertId,
      status: status || 'all',
      payoutStatus: payoutStatus || 'all',
      startDate,
      endDate,
      limit,
    })

    const clientIds = rawPayments.map(getPaymentClientId).filter(Boolean)
    const clientsById = await fetchClientApplications(clientIds)

    const earnings = rawPayments
      .map((payment) => mapPayment(payment, clientsById))
      .filter(
        (item) =>
          isDateOnOrAfter(item.createdAt, startDate) &&
          isDateOnOrBefore(item.createdAt, endDate)
      )

    return NextResponse.json({
      ok: true,
      meta: {
        expertId,
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
      {
        ok: false,
        error:
          'Kazanç bilgileri şu anda alınamadı. Ödeme kayıtları oluştuğunda bu alan otomatik güncellenecek.',
      },
      { status: 500 }
    )
  }
}
