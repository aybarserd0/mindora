import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hasAdminSession } from '@/lib/security/admin-auth'
import { getExpertIdFromRequest } from '@/lib/security/expert-session'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { cleanMultilineText, cleanUuid } from '@/lib/security/validation'
import { resolveConversationAccessFromToken } from '@/lib/chat-access-tokens'
import { evaluateCancellation, FREE_CANCELLATION_HOURS, type CancellationActor } from '@/lib/payments/policy'
import {
  cancelBooking,
  CANCELLABLE_STATUSES,
  findPaymentForBooking,
  getBookingForCancellation,
  type BookingForCancellation,
} from '@/lib/sessions/cancellation'

export const runtime = 'nodejs'

type Body = {
  token?: unknown
  reason?: unknown
  refund?: unknown
  dryRun?: unknown
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

/** İsteği yapanın bu randevu üzerindeki rolü; yetkisi yoksa null. */
async function resolveActor(req: NextRequest, booking: BookingForCancellation, token: string): Promise<CancellationActor | null> {
  if (hasAdminSession(req)) return 'admin'

  const expertId = await getExpertIdFromRequest(req)
  if (expertId && booking.expert_id === expertId) return 'expert'

  if (token) {
    const conversationId = await resolveConversationAccessFromToken(token, 'client')
    if (!conversationId) return null
    if (booking.conversation_id) return booking.conversation_id === conversationId ? 'client' : null

    // Sohbete bağlı olmayan eski randevular: sohbetin danışanı randevunun danışanı mı?
    const { data } = await getSupabaseAdmin()
      .from('conversations')
      .select('client_application_id')
      .eq('id', conversationId)
      .maybeSingle()
    return data?.client_application_id && data.client_application_id === booking.client_id ? 'client' : null
  }

  return null
}

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim() || null
}

/**
 * Randevu iptali. dryRun: true ile iptal etmeden kuralın sonucunu döner
 * (arayüzdeki onay penceresi için).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = applyRateLimit(req, { scope: 'booking-cancel', limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const bookingId = cleanUuid((await params).id)
  if (!bookingId) return jsonError('Geçerli randevu gerekli.')

  const body = ((await req.json().catch(() => null)) || {}) as Body
  const token = typeof body.token === 'string' ? body.token.trim().slice(0, 200) : ''

  const booking = await getBookingForCancellation(bookingId)
  if (!booking) return jsonError('Randevu bulunamadı.', 404)

  const actor = await resolveActor(req, booking, token)
  if (!actor) return jsonError('Bu randevuyu iptal etme yetkin yok.', 403)

  if (body.dryRun === true) {
    const rule = evaluateCancellation(actor, booking.scheduled_start_at)
    const payment = await findPaymentForBooking(booking)
    return NextResponse.json({
      ok: true,
      actor,
      cancellable:
        (CANCELLABLE_STATUSES as readonly string[]).includes(booking.status) &&
        new Date(booking.scheduled_start_at).getTime() > Date.now(),
      late: rule.late,
      refund: rule.refund,
      hasPaidPayment: payment?.status === 'paid',
      freeCancellationHours: FREE_CANCELLATION_HOURS,
    })
  }

  const reason = cleanMultilineText(body.reason, 500) || null
  const result = await cancelBooking({
    booking,
    actor,
    reason,
    ip: clientIp(req),
    forceRefund: actor === 'admin' && typeof body.refund === 'boolean' ? body.refund : undefined,
  })

  if (!result.ok) return jsonError(result.error, result.status)
  return NextResponse.json({ ok: true, outcome: result.outcome })
}
