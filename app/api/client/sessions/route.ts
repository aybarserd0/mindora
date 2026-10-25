import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { resolveClientAccess, withToken } from '@/lib/client-access'
import { FREE_CANCELLATION_HOURS } from '@/lib/payments/policy'
import { CANCELLABLE_STATUSES } from '@/lib/sessions/cancellation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BookingRow = {
  id: string
  conversation_id: string | null
  expert_id: string
  scheduled_start_at: string
  scheduled_end_at: string
  timezone: string
  status: string
  session_ready: boolean
  live_session_id: string | null
  client_join_url: string | null
  created_at: string
  cancelled_by: string | null
  late_cancellation: boolean
}

export async function GET(req: NextRequest) {
  const limited = applyRateLimit(req, { scope: 'client-sessions', limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const token = req.nextUrl.searchParams.get('token') || ''
  const access = await resolveClientAccess(token)
  if (!access) {
    return NextResponse.json({ ok: false, error: 'Güvenli erişim bağlantısı doğrulanamadı.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any

  const { data: bookingRows, error } = await supabase
    .from('session_bookings')
    .select(
      'id, conversation_id, expert_id, scheduled_start_at, scheduled_end_at, timezone, status, session_ready, live_session_id, client_join_url, created_at, cancelled_by, late_cancellation'
    )
    .or(`conversation_id.eq.${access.conversationId},client_id.eq.${access.clientApplicationId}`)
    .order('scheduled_start_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('CLIENT_SESSIONS_ERROR', error)
    return NextResponse.json({ ok: false, error: 'Seanslar şu anda alınamadı.' }, { status: 500 })
  }

  const bookings = (bookingRows || []) as BookingRow[]
  const expertIds = Array.from(new Set(bookings.map((b) => b.expert_id).filter(Boolean)))
  const bookingIds = bookings.map((b) => b.id)

  const [{ data: experts }, { data: reviews }, { data: payments }] = await Promise.all([
    expertIds.length
      ? supabase.from('experts').select('id, name, title, photo_url').in('id', expertIds)
      : Promise.resolve({ data: [] }),
    bookingIds.length
      ? supabase.from('reviews').select('id, booking_id').in('booking_id', bookingIds)
      : Promise.resolve({ data: [] }),
    bookingIds.length
      ? supabase.from('payments').select('booking_id, status, refund_status').in('booking_id', bookingIds)
      : Promise.resolve({ data: [] }),
  ])

  const expertsById = new Map<string, { name: string | null; title: string | null; photo_url: string | null }>(
    (experts || []).map((e: { id: string; name: string | null; title: string | null; photo_url: string | null }) => [e.id, e])
  )
  const reviewByBooking = new Map<string, string>(
    (reviews || []).map((r: { id: string; booking_id: string }) => [r.booking_id, r.id])
  )
  const paymentByBooking = new Map<string, { status: string; refund_status: string | null }>(
    (payments || []).map((p: { booking_id: string; status: string; refund_status: string | null }) => [p.booking_id, p])
  )

  const now = Date.now()
  const sessions = bookings.map((b) => {
    const expert = expertsById.get(b.expert_id)
    const startsAt = new Date(b.scheduled_start_at).getTime()
    const payment = paymentByBooking.get(b.id)
    const canCancel = (CANCELLABLE_STATUSES as readonly string[]).includes(b.status) && startsAt > now

    return {
      id: b.id,
      bookingId: b.id,
      conversationId: b.conversation_id,
      expertId: b.expert_id,
      expertName: expert?.name || null,
      expertTitle: expert?.title || null,
      expertPhotoUrl: expert?.photo_url || null,
      scheduledStartAt: b.scheduled_start_at,
      scheduledEndAt: b.scheduled_end_at,
      timezone: b.timezone,
      status: b.status,
      paymentStatus: payment?.status || access.paymentStatus,
      refundStatus: payment?.refund_status || null,
      reviewId: reviewByBooking.get(b.id) || null,
      hasReview: reviewByBooking.has(b.id),
      sessionReady: b.session_ready,
      liveSessionId: b.live_session_id,
      joinHref: b.session_ready && b.client_join_url ? b.client_join_url : null,
      chatHref: withToken(`/client/chat/${access.conversationId}`, token),
      createdAt: b.created_at,
      canCancel,
      freeCancellation: canCancel && startsAt - now >= FREE_CANCELLATION_HOURS * 3_600_000,
      cancelledBy: b.cancelled_by,
      lateCancellation: b.late_cancellation,
    }
  })

  return NextResponse.json({ ok: true, sessions, freeCancellationHours: FREE_CANCELLATION_HOURS })
}
