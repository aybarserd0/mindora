import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { resolveClientAccess } from '@/lib/client-access'
import { resolveCommission, splitAmount } from '@/lib/payments/policy'
import { initSessionCheckout } from '@/lib/payments/checkout'
import { getBookableExpert, getClientBookableSlots } from '@/lib/scheduling/client-booking'

export const runtime = 'nodejs'

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

/**
 * Danışan seçtiği saat için randevu oluşturur ve ödeme sayfasına yönlendirilir.
 * Randevu ödeme tamamlanana kadar "pending_payment" durumunda saati tutar.
 */
export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, { scope: 'client-bookings', limit: 10, windowMs: 60_000 })
  if (limited) return limited

  const body = (await req.json().catch(() => null)) as { token?: unknown; startAt?: unknown } | null
  const access = await resolveClientAccess(typeof body?.token === 'string' ? body.token : '')
  if (!access) return jsonError('Güvenli erişim bağlantısı doğrulanamadı.', 401)

  const startAt = typeof body?.startAt === 'string' ? new Date(body.startAt) : null
  if (!startAt || Number.isNaN(startAt.getTime())) return jsonError('Geçerli bir saat seçmelisin.')

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim() || ''
  if (!ip) return jsonError('Bağlantı bilgisi alınamadı, lütfen tekrar dene.')

  const expert = await getBookableExpert(access.expertId)
  const amount = Number(expert?.session_price)
  if (!expert || expert.status !== 'approved' || !Number.isFinite(amount) || amount <= 0) {
    return jsonError('Psikoloğun şu anda yeni randevu kabul etmiyor.', 409)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any

  // Aynı danışanın yarım kalmış önceki ödeme denemesi saati boşuna tutmasın
  const nowIso = new Date().toISOString()
  const { data: previousHolds } = await supabase
    .from('session_bookings')
    .update({ status: 'cancelled', cancellation_reason: 'Danışan başka bir saat seçti.', cancelled_at: nowIso, updated_at: nowIso })
    .eq('conversation_id', access.conversationId)
    .eq('status', 'pending_payment')
    .select('id')
  const previousIds = ((previousHolds || []) as { id: string }[]).map((row) => row.id)
  if (previousIds.length) {
    await supabase.from('payments').update({ status: 'cancelled' }).in('booking_id', previousIds).eq('status', 'pending')
  }

  const slots = await getClientBookableSlots(expert.id)
  const slot = slots.find((s) => s.startAt === startAt.toISOString())
  if (!slot) return jsonError('Bu saat artık uygun değil. Lütfen başka bir saat seç.', 409)

  const { data: client } = await supabase
    .from('client_applications')
    .select('id, name, email, phone')
    .eq('id', access.clientApplicationId)
    .maybeSingle()
  if (!client) return jsonError('Danışan kaydı bulunamadı.', 404)

  const { data: booking, error: bookingError } = await supabase
    .from('session_bookings')
    .insert({
      conversation_id: access.conversationId,
      expert_id: expert.id,
      client_id: access.clientApplicationId,
      scheduled_start_at: slot.startAt,
      scheduled_end_at: slot.endAt,
      timezone: slot.timezone,
      status: 'pending_payment',
      created_by: 'client',
    })
    .select('id')
    .single()

  if (bookingError || !booking) {
    console.error('CLIENT_BOOKING_INSERT_ERROR', bookingError)
    return jsonError(bookingError?.code === '23505' ? 'Bu saat az önce doldu. Lütfen başka bir saat seç.' : 'Randevu oluşturulamadı.', 409)
  }

  // Aynı anda aynı saati seçen başka biri varsa önce gelen kazanır
  const { data: overlapping } = await supabase
    .from('session_bookings')
    .select('id, created_at')
    .eq('expert_id', expert.id)
    .in('status', ['pending_payment', 'scheduled', 'confirmed', 'active'])
    .lt('scheduled_start_at', slot.endAt)
    .gt('scheduled_end_at', slot.startAt)
    .neq('id', booking.id)
  if ((overlapping || []).length > 0) {
    await supabase
      .from('session_bookings')
      .update({ status: 'cancelled', cancellation_reason: 'Saat aynı anda başka bir danışan tarafından alındı.', cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
    return jsonError('Bu saat az önce doldu. Lütfen başka bir saat seç.', 409)
  }

  const { rate } = resolveCommission(expert)
  const { commissionAmount, expertAmount } = splitAmount(amount, rate)

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      client_id: access.clientApplicationId,
      expert_id: expert.id,
      amount,
      commission_amount: commissionAmount,
      commission_rate: rate,
      expert_amount: expertAmount,
      status: 'pending',
      expert_payout_status: 'unpaid',
      booking_id: booking.id,
    })
    .select('id')
    .single()

  const releaseHold = async (reason: string) => {
    await supabase
      .from('session_bookings')
      .update({ status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
  }

  if (paymentError || !payment) {
    console.error('CLIENT_BOOKING_PAYMENT_INSERT_ERROR', paymentError)
    await releaseHold('Ödeme kaydı oluşturulamadı.')
    return jsonError('Ödeme başlatılamadı. Lütfen tekrar dene.', 500)
  }

  const checkout = await initSessionCheckout({
    paymentId: payment.id,
    bookingId: booking.id,
    amount,
    client,
    expertName: expert.name,
    ip,
  })

  if (!checkout.ok) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
    await releaseHold('Ödeme sayfası açılamadı.')
    return jsonError(checkout.error, 502)
  }

  await supabase
    .from('payments')
    .update({
      iyzico_token: checkout.token,
      iyzico_conversation_id: checkout.conversationId,
      payment_page_url: checkout.paymentPageUrl,
    })
    .eq('id', payment.id)

  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    paymentPageUrl: checkout.paymentPageUrl,
    amount,
    startAt: slot.startAt,
  })
}
