import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { resolveClientAccess, withToken } from '@/lib/client-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PaymentRow = {
  id: string
  expert_id: string | null
  amount: number
  status: string
  iyzico_payment_id: string | null
  payment_page_url: string | null
  paid_notified_at: string | null
  refunded_at: string | null
  refund_status: string | null
  booking_id: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  const limited = applyRateLimit(req, { scope: 'client-payments', limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const token = req.nextUrl.searchParams.get('token') || ''
  const access = await resolveClientAccess(token)
  if (!access) {
    return NextResponse.json({ ok: false, error: 'Güvenli erişim bağlantısı doğrulanamadı.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any
  const { data, error } = await supabase
    .from('payments')
    .select('id, expert_id, amount, status, iyzico_payment_id, payment_page_url, paid_notified_at, refunded_at, refund_status, booking_id, created_at')
    .eq('client_id', access.clientApplicationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('CLIENT_PAYMENTS_ERROR', error)
    return NextResponse.json({ ok: false, error: 'Ödemeler şu anda alınamadı.' }, { status: 500 })
  }

  const rows = (data || []) as PaymentRow[]
  const expertIds = Array.from(new Set(rows.map((p) => p.expert_id).filter(Boolean))) as string[]
  const { data: experts } = expertIds.length
    ? await supabase.from('experts').select('id, name, title').in('id', expertIds)
    : { data: [] }
  const expertsById = new Map<string, { name: string | null; title: string | null }>(
    (experts || []).map((e: { id: string; name: string | null; title: string | null }) => [e.id, e])
  )

  const payments = rows.map((p) => {
    // İade süreci açık ödemeler danışana "iade ediliyor" olarak görünür
    const status = p.status === 'paid' && (p.refund_status === 'pending' || p.refund_status === 'failed') ? 'refunded' : p.status
    return {
      id: p.id,
      expertId: p.expert_id,
      expertName: p.expert_id ? expertsById.get(p.expert_id)?.name || null : null,
      expertTitle: p.expert_id ? expertsById.get(p.expert_id)?.title || null : null,
      conversationId: access.conversationId,
      sessionId: p.booking_id,
      amount: Number(p.amount || 0),
      currency: 'TRY',
      status,
      iyzicoPaymentId: p.iyzico_payment_id,
      // Ödeme linki yalnızca bekleyen ödemelerde gösterilir
      paymentPageUrl: p.status === 'pending' ? p.payment_page_url : null,
      paidAt: p.status === 'paid' || p.status === 'refunded' ? p.paid_notified_at || p.created_at : null,
      refundedAt: p.refunded_at,
      createdAt: p.created_at,
      chatHref: withToken(`/client/chat/${access.conversationId}`, token),
      sessionHref: withToken('/client/dashboard/sessions', token),
    }
  })

  const sum = (list: typeof payments) => list.reduce((total, p) => total + p.amount, 0)
  const by = (status: string) => payments.filter((p) => p.status === status)

  return NextResponse.json({
    ok: true,
    payments,
    summary: {
      totalPaid: sum(by('paid')),
      totalPending: sum(by('pending')),
      totalRefunded: sum(by('refunded')),
      paidCount: by('paid').length,
      pendingCount: by('pending').length,
      failedCount: by('failed').length,
      refundedCount: by('refunded').length,
    },
  })
}
