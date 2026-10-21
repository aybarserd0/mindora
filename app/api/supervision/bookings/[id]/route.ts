import { NextRequest, NextResponse } from 'next/server'
import {
  db,
  generateVerificationCode,
  getBookingRole,
  jsonError,
  requireExpert,
  toText,
} from '@/lib/supervision/server'
import { CASE_RETENTION_DAYS } from '@/lib/supervision/constants'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

type Action = 'accept' | 'decline' | 'cancel' | 'complete' | 'no_show'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-booking-update')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const action = toText(body?.action, 20) as Action
  if (!['accept', 'decline', 'cancel', 'complete', 'no_show'].includes(action)) {
    return jsonError('Geçersiz işlem.', 400)
  }

  const found = await getBookingRole(id, auth.expertId)
  if (!found) return jsonError('Randevu bulunamadı.', 404)

  const { role, booking } = found
  const supabase = db()
  const now = new Date()
  const startMs = new Date(booking.requested_start).getTime()
  const otherExpertId = role === 'supervisor' ? booking.supervisee_expert_id : booking.supervisor_profiles.expert_id
  const otherLink = role === 'supervisor' ? '/expert/dashboard/supervizyon' : '/expert/dashboard/supervizor'

  let update: Record<string, unknown> = {}
  let notice: { title: string; message: string } | null = null

  switch (action) {
    case 'accept': {
      if (role !== 'supervisor' || booking.status !== 'requested') return jsonError('Bu talep kabul edilemez.', 409)
      const free = Number(booking.price) === 0
      update = free
        ? { status: 'confirmed', room_name: `sup_${booking.id}` }
        : { status: 'accepted' }
      notice = free
        ? { title: 'Görüşme onaylandı', message: 'Tanışma görüşmen onaylandı. Saatinde Süpervizyon sayfasından katılabilirsin.' }
        : { title: 'Süpervizyon talebin kabul edildi', message: 'Seansı kesinleştirmek için ödemeyi tamamla.' }
      break
    }
    case 'decline': {
      if (role !== 'supervisor' || booking.status !== 'requested') return jsonError('Bu talep reddedilemez.', 409)
      update = { status: 'declined', decline_reason: toText(body?.reason, 500) || null }
      notice = { title: 'Süpervizyon talebin yanıtlandı', message: 'Süpervizör bu talebi kabul edemedi. Başka bir saat ya da süpervizör deneyebilirsin.' }
      break
    }
    case 'cancel': {
      if (!['requested', 'accepted', 'confirmed'].includes(booking.status)) return jsonError('Bu randevu iptal edilemez.', 409)
      update = { status: 'cancelled', cancelled_by: role }
      notice = { title: 'Süpervizyon randevusu iptal edildi', message: 'Bir süpervizyon randevun karşı tarafça iptal edildi.' }
      // Ödenmiş seans iptalinde iade şimdilik admin tarafından elle yapılır
      if (booking.paid_at) {
        await createNotification({
          supabase,
          userType: 'admin',
          userId: null,
          title: 'Ödenmiş süpervizyon iptal edildi',
          message: `Randevu ${booking.id} ${role === 'supervisor' ? 'süpervizör' : 'süpervizyon alan'} tarafından iptal edildi. İade kontrol edilmeli.`,
          type: 'payment',
          link: '/admin/supervizorler',
        })
      }
      break
    }
    case 'complete':
    case 'no_show': {
      if (booking.status !== 'confirmed') return jsonError('Yalnızca onaylı randevular tamamlanabilir.', 409)
      if (now.getTime() < startMs) return jsonError('Seans saati gelmeden tamamlandı olarak işaretlenemez.', 409)
      if (action === 'no_show') {
        update = { status: 'no_show', completed_at: now.toISOString() }
        break
      }
      update = { status: 'completed', completed_at: now.toISOString() }
      break
    }
  }

  const { error } = await supabase.from('supervision_bookings').update(update).eq('id', booking.id)
  if (error) {
    console.error('SUPERVISION_BOOKING_UPDATE_ERROR', error)
    return jsonError('Randevu güncellenemedi.', 500)
  }

  if (action === 'complete') {
    // Vaka kartlarını kapat ve silinme tarihini işaretle
    const { data: shares } = await supabase
      .from('supervision_case_shares')
      .select('case_id')
      .eq('booking_id', booking.id)
    const caseIds = ((shares || []) as { case_id: string }[]).map((s) => s.case_id)
    if (caseIds.length > 0) {
      const deleteAfter = new Date(now.getTime() + CASE_RETENTION_DAYS * 86_400_000).toISOString()
      await supabase
        .from('supervision_cases')
        .update({ status: 'closed', closed_at: now.toISOString(), delete_after: deleteAfter })
        .in('id', caseIds)
    }

    if (booking.kind === 'individual') {
      const { error: logError } = await supabase.from('supervision_log_entries').insert({
        booking_id: booking.id,
        supervisee_expert_id: booking.supervisee_expert_id,
        supervisor_profile_id: booking.supervisor_profile_id,
        session_date: booking.requested_start,
        duration_minutes: booking.duration_minutes,
        format: 'bireysel',
        approach: booking.supervisor_profiles.approaches?.[0] || null,
        status: role === 'supervisor' ? 'confirmed' : 'pending',
        confirmed_at: role === 'supervisor' ? now.toISOString() : null,
        verification_code: generateVerificationCode(),
      })
      if (logError && logError.code !== '23505') console.error('SUPERVISION_LOG_INSERT_ERROR', logError)
    }

    notice =
      role === 'supervisee' && booking.kind === 'individual'
        ? { title: 'Saat defteri onayı bekliyor', message: 'Tamamlanan bir süpervizyon seansı onayını bekliyor.' }
        : { title: 'Süpervizyon seansı tamamlandı', message: 'Seans tamamlandı olarak işaretlendi.' }
  }

  if (notice) {
    await createNotification({
      supabase,
      userType: 'expert',
      userId: otherExpertId,
      title: notice.title,
      message: notice.message,
      type: 'session',
      link: otherLink,
    })
  }

  return NextResponse.json({ ok: true })
}
