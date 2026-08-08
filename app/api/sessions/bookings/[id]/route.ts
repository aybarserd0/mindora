import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enforceAdminRequest } from '@/lib/security/admin-auth'
import { sendMail } from '@/lib/mail/smtp'
import { bookingCancelledTemplate } from '@/lib/mail/templates'
import { createNotification } from '@/lib/notifications'

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

async function notifyBookingCancelled({
  supabase,
  booking,
  cancellationReason,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  booking: {
    client_id: string | null
    expert_id: string | null
    scheduled_start_at: string | null
  }
  cancellationReason: string | null
}) {
  const [{ data: client }, { data: expert }] = await Promise.all([
    booking.client_id
      ? supabase
          .from('client_applications' as never)
          .select('name,email')
          .eq('id', booking.client_id as never)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    booking.expert_id
      ? supabase
          .from('experts' as never)
          .select('name,email')
          .eq('id', booking.expert_id as never)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const clientInfo = client as unknown as { name?: string; email?: string } | null
  const expertInfo = expert as unknown as { name?: string; email?: string } | null
  const scheduledStartText = formatDateTime(booking.scheduled_start_at)

  const jobs: Array<Promise<unknown>> = []

  if (clientInfo?.email) {
    jobs.push(
      sendMail({
        to: clientInfo.email,
        subject: 'Mindora randevunuz iptal edildi',
        text: bookingCancelledTemplate({
          recipientName: clientInfo.name || 'Danışan',
          otherPartyName: expertInfo?.name || 'Uzman',
          scheduledStartText,
          cancellationReason: cancellationReason || undefined,
        }),
      })
    )
  }

  if (expertInfo?.email) {
    jobs.push(
      sendMail({
        to: expertInfo.email,
        subject: 'Mindora randevusu iptal edildi',
        text: bookingCancelledTemplate({
          recipientName: expertInfo.name || 'Uzman',
          otherPartyName: clientInfo?.name || 'Danışan',
          scheduledStartText,
          cancellationReason: cancellationReason || undefined,
        }),
      })
    )
  }

  if (booking.client_id) {
    jobs.push(
      createNotification({
        supabase,
        userType: 'client',
        userId: booking.client_id,
        title: 'Randevunuz iptal edildi',
        message: `${scheduledStartText} tarihine planlanan seansınız iptal edildi.`,
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
        message: `${scheduledStartText} tarihine planlanan seans iptal edildi.`,
        type: 'session',
      })
    )
  }

  const results = await Promise.allSettled(jobs)
  const failed = results.filter((result) => result.status === 'rejected')

  if (failed.length > 0) {
    console.error('Booking cancellation mail error:', failed)
  }
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

    if (body.status === 'cancelled') {
      const booking = data as unknown as {
        client_id: string | null
        expert_id: string | null
        scheduled_start_at: string | null
        cancellation_reason?: string | null
      }

      try {
        await notifyBookingCancelled({
          supabase,
          booking,
          cancellationReason: booking.cancellation_reason ?? null,
        })
      } catch (mailError) {
        console.error('Booking cancellation notify error:', mailError)
      }
    }

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