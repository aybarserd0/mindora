import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const updatePayload: Record<string, unknown> = {
      status: body.status,
      updated_at: new Date().toISOString(),
    }

    if (body.status === 'cancelled') {
      updatePayload.cancellation_reason =
        typeof body.cancellationReason === 'string'
          ? body.cancellationReason.trim()
          : null
    }

    const { data, error } = await supabase
      .from('session_bookings' as never)
      .update(updatePayload as never)
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