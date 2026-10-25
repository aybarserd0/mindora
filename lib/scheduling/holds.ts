import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PAYMENT_HOLD_MINUTES } from './slots'

/**
 * Ödemesi tamamlanmamış randevuların tuttuğu saatleri serbest bırakır.
 * Saat seçme ve randevu oluşturma isteklerinde, ayrıca günlük cron'da çağrılır.
 */
export async function expireStalePaymentHolds(expertId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any
  const cutoff = new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60_000).toISOString()
  const now = new Date().toISOString()

  let query = supabase
    .from('session_bookings')
    .update({
      status: 'cancelled',
      cancellation_reason: 'Ödeme süresi içinde tamamlanmadı.',
      cancelled_at: now,
      updated_at: now,
    })
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)

  if (expertId) query = query.eq('expert_id', expertId)

  const { data, error } = await query.select('id')
  if (error) {
    console.error('EXPIRE_PAYMENT_HOLDS_ERROR', error)
    return 0
  }

  const ids = ((data || []) as { id: string }[]).map((row) => row.id)
  if (ids.length) {
    await supabase.from('payments').update({ status: 'cancelled' }).in('booking_id', ids).eq('status', 'pending')
  }
  return ids.length
}
