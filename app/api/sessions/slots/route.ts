import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type AvailabilityRow = {
  id: string
  expert_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  timezone: string | null
  is_active: boolean
}

type BookingRow = {
  id: string
  expert_id: string
  scheduled_start_at: string
  scheduled_end_at: string
  status: string
}

type Slot = {
  expertId: string
  startAt: string
  endAt: string
  timezone: string
  slotDurationMinutes: number
  bufferMinutes: number
}

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const BOOKED_STATUSES = ['scheduled', 'confirmed', 'active'] as const
const MAX_RANGE_DAYS = 60

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false

  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function toStartOfDay(value: string) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

function diffDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime()
  return Math.ceil(ms / 86_400_000)
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    const expertId = req.nextUrl.searchParams.get('expertId')?.trim() || ''
    const startDate = req.nextUrl.searchParams.get('startDate')?.trim() || ''
    const endDate = req.nextUrl.searchParams.get('endDate')?.trim() || ''

    if (!isValidUuid(expertId)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Geçerli expertId gerekli.',
          debug: { expertId },
        },
        { status: 400 }
      )
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli startDate ve endDate gerekli.' },
        { status: 400 }
      )
    }

    const start = toStartOfDay(startDate)
    const end = toStartOfDay(endDate)

    if (start > end) {
      return NextResponse.json(
        { ok: false, error: 'startDate endDate değerinden sonra olamaz.' },
        { status: 400 }
      )
    }

    if (diffDays(start, end) > MAX_RANGE_DAYS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Tarih aralığı en fazla ${MAX_RANGE_DAYS} gün olabilir.`,
        },
        { status: 400 }
      )
    }

    const { data: rawAvailabilityRows, error: availabilityError } =
      await supabase
        .from('expert_availability' as never)
        .select('*')
        .eq('expert_id', expertId as never)
        .eq('is_active', true as never)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

    if (availabilityError) throw availabilityError

    const availabilityRows =
      (rawAvailabilityRows || []) as unknown as AvailabilityRow[]

    if (availabilityRows.length === 0) {
      return NextResponse.json({
        ok: true,
        slots: [],
        message: 'Bu uzman için aktif müsaitlik bulunamadı.',
      })
    }

    const { data: rawBookingRows, error: bookingError } = await supabase
      .from('session_bookings' as never)
      .select('id,expert_id,scheduled_start_at,scheduled_end_at,status')
      .eq('expert_id', expertId as never)
      .in('status' as never, BOOKED_STATUSES as unknown as never)

    if (bookingError) throw bookingError

    const bookingRows = (rawBookingRows || []) as unknown as BookingRow[]
    const slots: Slot[] = []

    const current = new Date(start)

    while (current <= end) {
      const currentDay = current.getDay()
      const dateString = formatDate(current)

      const matchingAvailability = availabilityRows.filter(
        (row) => row.day_of_week === currentDay
      )

      for (const availability of matchingAvailability) {
        const slotDuration = Number(availability.slot_duration_minutes)
        const buffer = Number(availability.buffer_minutes || 0)

        if (!Number.isFinite(slotDuration) || slotDuration <= 0) continue
        if (!Number.isFinite(buffer) || buffer < 0) continue

        let slotStart = new Date(
          `${dateString}T${normalizeTime(availability.start_time)}`
        )

        const availabilityEnd = new Date(
          `${dateString}T${normalizeTime(availability.end_time)}`
        )

        while (slotStart < availabilityEnd) {
          const slotEnd = addMinutes(slotStart, slotDuration)

          if (slotEnd > availabilityEnd) break

          const hasConflict = bookingRows.some((booking) => {
            const bookingStart = new Date(booking.scheduled_start_at)
            const bookingEnd = new Date(booking.scheduled_end_at)

            return slotStart < bookingEnd && slotEnd > bookingStart
          })

          if (!hasConflict && slotStart.getTime() > Date.now() - 60_000) {
            slots.push({
              expertId,
              startAt: slotStart.toISOString(),
              endAt: slotEnd.toISOString(),
              timezone: availability.timezone || DEFAULT_TIMEZONE,
              slotDurationMinutes: slotDuration,
              bufferMinutes: buffer,
            })
          }

          slotStart = addMinutes(slotStart, slotDuration + buffer)
        }
      }

      current.setDate(current.getDate() + 1)
    }

    return NextResponse.json({
      ok: true,
      slots,
    })
  } catch (err) {
    console.error('Session slots GET error:', err)

    return NextResponse.json(
      { ok: false, error: 'Slotlar oluşturulamadı.' },
      { status: 500 }
    )
  }
}