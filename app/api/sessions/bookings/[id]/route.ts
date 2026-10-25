import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enforceAdminRequest } from '@/lib/security/admin-auth'
import { cancelBooking, getBookingForCancellation } from '@/lib/sessions/cancellation'

type BookingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'

type UpdateBookingPayload = {
  status?: BookingStatus
  cancellationReason?: string
  refund?: boolean
}

const VALID_STATUSES: BookingStatus[] = [
  'scheduled',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function isValidStatus(value: unknown): value is BookingStatus {
  return typeof value === 'string' && VALID_STATUSES.includes(value as BookingStatus)
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = enforceAdminRequest(req)

    if (unauthorized) return unauthorized

    const resolved = await params
    const bookingId = resolved.id

    if (!isValidUuid(bookingId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli booking id gerekli.' },
        { status: 400 }
      )
    }

    const body = (await req.json()) as UpdateBookingPayload

    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli status gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    if (body.status === 'cancelled') {
      // İptal her zaman ortak akıştan geçer: iade ve bildirimler orada yönetilir
      const booking = await getBookingForCancellation(bookingId)
      if (!booking) {
        return NextResponse.json({ ok: false, error: 'Randevu bulunamadı.' }, { status: 404 })
      }

      const result = await cancelBooking({
        booking,
        actor: 'admin',
        reason: typeof body.cancellationReason === 'string' ? body.cancellationReason.trim().slice(0, 500) || null : null,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        forceRefund: typeof body.refund === 'boolean' ? body.refund : undefined,
      })

      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
      }

      const { data: cancelled } = await supabase
        .from('session_bookings' as never)
        .select('*')
        .eq('id', bookingId as never)
        .maybeSingle()

      return NextResponse.json({ ok: true, booking: cancelled, outcome: result.outcome })
    }

    const { data, error } = await supabase
      .from('session_bookings' as never)
      .update({ status: body.status, updated_at: new Date().toISOString() } as never)
      .eq('id', bookingId as never)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      booking: data,
    })
  } catch (err) {
    console.error('Booking status update error:', err)

    return NextResponse.json(
      { ok: false, error: 'Randevu durumu güncellenemedi.' },
      { status: 500 }
    )
  }
}