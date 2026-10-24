import { NextRequest, NextResponse } from 'next/server'
import { enforceAdminRequest } from '@/lib/security/admin-auth'
import { cleanUuid } from '@/lib/security/validation'
import { refundPayment } from '@/lib/payments/refund'

export const runtime = 'nodejs'

/** Admin: başarısız ya da bekleyen bir iadeyi tekrar dener veya elle iade başlatır. */
export async function POST(req: NextRequest) {
  const unauthorized = enforceAdminRequest(req)
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as { paymentId?: unknown } | null
  const paymentId = cleanUuid(body?.paymentId)
  if (!paymentId) return NextResponse.json({ ok: false, error: 'Geçerli ödeme gerekli.' }, { status: 400 })

  const result = await refundPayment(paymentId, {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    // Yarıda kalmış iadeler için; Iyzico toplam tutarı aşan iadeyi zaten reddeder
    allowPendingRetry: true,
  })

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
