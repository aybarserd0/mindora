import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mail/smtp'
import { bookingCancelledTemplate } from '@/lib/mail/templates'
import { createNotification } from '@/lib/notifications'
import { evaluateCancellation, type CancellationActor } from '@/lib/payments/policy'
import { refundPayment, type RefundResult } from '@/lib/payments/refund'

// Tablo tipleri yeni sütunları içeriyor; dinamik sorgular için gevşek istemci
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export const CANCELLABLE_STATUSES = ['scheduled', 'confirmed'] as const

export type BookingForCancellation = {
  id: string
  client_id: string | null
  expert_id: string | null
  conversation_id: string | null
  scheduled_start_at: string
  status: string
  cancellation_reason?: string | null
}

export type CancellationOutcome = {
  late: boolean
  refund: 'refunded' | 'failed' | 'not_applicable' | 'kept_for_expert'
  refundError?: string
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Belirtilmedi'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Belirtilmedi'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(date)
}

export async function getBookingForCancellation(bookingId: string) {
  const supabase = getSupabaseAdmin() as LooseClient
  const { data } = await supabase
    .from('session_bookings')
    .select('id, client_id, expert_id, conversation_id, scheduled_start_at, status, cancellation_reason')
    .eq('id', bookingId)
    .maybeSingle()
  return (data as BookingForCancellation | null) || null
}

/**
 * Randevuya karşılık gelen ödeme: önce doğrudan bağlı olan, yoksa (eski kayıtlar)
 * aynı danışan ve uzman için henüz bir randevuya bağlanmamış son başarılı ödeme.
 */
export async function findPaymentForBooking(booking: Pick<BookingForCancellation, 'id' | 'client_id' | 'expert_id'>) {
  const supabase = getSupabaseAdmin() as LooseClient

  const { data: linked } = await supabase
    .from('payments')
    .select('id, status, refund_status, booking_id')
    .eq('booking_id', booking.id)
    .maybeSingle()
  if (linked) return linked as { id: string; status: string; refund_status: string | null; booking_id: string | null }

  if (!booking.client_id || !booking.expert_id) return null

  const { data: legacy } = await supabase
    .from('payments')
    .select('id, status, refund_status, booking_id')
    .eq('client_id', booking.client_id)
    .eq('expert_id', booking.expert_id)
    .eq('status', 'paid')
    .is('booking_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (legacy as { id: string; status: string; refund_status: string | null; booking_id: string | null } | null) || null
}

/** Yeni oluşturulan randevuyu danışanın bağlanmamış ödemesine bağlar. */
export async function linkPaymentToBooking(booking: Pick<BookingForCancellation, 'id' | 'client_id' | 'expert_id'>) {
  if (!booking.client_id || !booking.expert_id) return
  const supabase = getSupabaseAdmin() as LooseClient
  const payment = await findPaymentForBooking(booking)
  if (!payment || payment.booking_id) return
  const { error } = await supabase
    .from('payments')
    .update({ booking_id: booking.id })
    .eq('id', payment.id)
    .is('booking_id', null)
  if (error) console.error('LINK_PAYMENT_TO_BOOKING_ERROR', error)
}

export async function notifyBookingCancelled({
  booking,
  cancellationReason,
  outcome,
}: {
  booking: Pick<BookingForCancellation, 'client_id' | 'expert_id' | 'scheduled_start_at'>
  cancellationReason: string | null
  outcome?: CancellationOutcome
}) {
  const supabase = getSupabaseAdmin() as LooseClient

  const [{ data: client }, { data: expert }] = await Promise.all([
    booking.client_id
      ? supabase.from('client_applications').select('name,email').eq('id', booking.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    booking.expert_id
      ? supabase.from('experts').select('name,email').eq('id', booking.expert_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const clientInfo = client as { name?: string; email?: string } | null
  const expertInfo = expert as { name?: string; email?: string } | null
  const when = formatDateTime(booking.scheduled_start_at)

  const clientMoneyNote =
    outcome?.refund === 'refunded'
      ? ' Ödemen kartına iade edildi; bankana göre hesabına yansıması birkaç iş günü sürebilir.'
      : outcome?.refund === 'failed'
        ? ' İaden işleme alındı; ekibimiz en kısa sürede tamamlayacak.'
        : outcome?.refund === 'kept_for_expert'
          ? ' Seansa 24 saatten az kaldığı için iptal kuralı gereği ücret iade edilmedi.'
          : ''
  const expertMoneyNote =
    outcome?.refund === 'kept_for_expert' ? ' Geç iptal olduğu için seans ücreti hakedişine eklendi.' : ''

  const jobs: Array<Promise<unknown>> = []

  if (clientInfo?.email) {
    jobs.push(
      sendMail({
        to: clientInfo.email,
        subject: 'Mindora randevun iptal edildi',
        text:
          bookingCancelledTemplate({
            recipientName: clientInfo.name || 'Danışan',
            otherPartyName: expertInfo?.name || 'Uzman',
            scheduledStartText: when,
            cancellationReason: cancellationReason || undefined,
          }) + (clientMoneyNote ? `\n\n${clientMoneyNote.trim()}` : ''),
      })
    )
  }

  if (expertInfo?.email) {
    jobs.push(
      sendMail({
        to: expertInfo.email,
        subject: 'Mindora randevusu iptal edildi',
        text:
          bookingCancelledTemplate({
            recipientName: expertInfo.name || 'Uzman',
            otherPartyName: clientInfo?.name || 'Danışan',
            scheduledStartText: when,
            cancellationReason: cancellationReason || undefined,
          }) + (expertMoneyNote ? `\n\n${expertMoneyNote.trim()}` : ''),
      })
    )
  }

  if (booking.client_id) {
    jobs.push(
      createNotification({
        supabase,
        userType: 'client',
        userId: booking.client_id,
        title: 'Randevun iptal edildi',
        message: `${when} tarihindeki seansın iptal edildi.${clientMoneyNote}`,
        type: 'session',
      })
    )
  }

  if (booking.expert_id) {
    jobs.push(
      createNotification({
        supabase,
        userType: 'expert',
        userId: booking.expert_id,
        title: 'Randevu iptal edildi',
        message: `${when} tarihindeki seans iptal edildi.${expertMoneyNote}`,
        type: 'session',
      })
    )
  }

  const results = await Promise.allSettled(jobs)
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) console.error('Booking cancellation notify error:', failed)
}

/**
 * Randevuyu iptal eder ve 24 saat kuralına göre ödemeyi iade eder ya da
 * uzmanın hakedişi olarak bırakır. Yetki kontrolü çağıran rotadadır.
 */
export async function cancelBooking({
  booking,
  actor,
  reason,
  ip,
  forceRefund,
}: {
  booking: BookingForCancellation
  actor: CancellationActor
  reason: string | null
  ip?: string | null
  /** Yalnızca admin: kuralın sonucunu ezmek için (true: iade et, false: iade etme) */
  forceRefund?: boolean
}): Promise<{ ok: true; outcome: CancellationOutcome } | { ok: false; error: string; status: number }> {
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) {
    return { ok: false, error: 'Bu randevu artık iptal edilemez.', status: 409 }
  }

  if (new Date(booking.scheduled_start_at).getTime() <= Date.now()) {
    return { ok: false, error: 'Başlamış ya da geçmiş bir seans iptal edilemez.', status: 409 }
  }

  const rule = evaluateCancellation(actor, booking.scheduled_start_at)
  const shouldRefund = actor === 'admin' && typeof forceRefund === 'boolean' ? forceRefund : rule.refund
  const late = !shouldRefund && actor === 'client' ? rule.late : false

  const supabase = getSupabaseAdmin() as LooseClient
  const now = new Date().toISOString()

  const { data: updated, error } = await supabase
    .from('session_bookings')
    .update({
      status: 'cancelled',
      cancelled_by: actor,
      cancelled_at: now,
      late_cancellation: late,
      cancellation_reason: reason,
      updated_at: now,
    })
    .eq('id', booking.id)
    .in('status', CANCELLABLE_STATUSES as unknown as string[])
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('CANCEL_BOOKING_UPDATE_ERROR', error)
    return { ok: false, error: 'Randevu iptal edilemedi.', status: 500 }
  }
  if (!updated) return { ok: false, error: 'Randevu bu sırada güncellendi, sayfayı yenileyip tekrar dene.', status: 409 }

  const payment = await findPaymentForBooking(booking)
  let outcome: CancellationOutcome = { late, refund: 'not_applicable' }

  if (payment && payment.status === 'paid') {
    if (!payment.booking_id) {
      await supabase.from('payments').update({ booking_id: booking.id }).eq('id', payment.id).is('booking_id', null)
    }

    if (shouldRefund) {
      const result: RefundResult = await refundPayment(payment.id, { ip })
      outcome = result.ok
        ? { late, refund: 'refunded' }
        : { late, refund: 'failed', refundError: result.error }
    } else {
      outcome = { late, refund: 'kept_for_expert' }
    }
  }

  try {
    await notifyBookingCancelled({ booking, cancellationReason: reason, outcome })
  } catch (notifyError) {
    console.error('Booking cancellation notify error:', notifyError)
  }

  return { ok: true, outcome }
}
