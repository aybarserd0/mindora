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

type BookingQueryMode = 'admin' | 'upcoming' | 'reminder'

const ALL_BOOKING_STATUSES: BookingStatus[] = [
  'scheduled',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]

const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  'scheduled',
  'confirmed',
  'active',
]

const REMINDER_ELIGIBLE_STATUSES: BookingStatus[] = [
  'scheduled',
  'confirmed',
]

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function toPositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) return fallback

  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

function parseMode(value: string | null): BookingQueryMode {
  if (value === 'upcoming') return 'upcoming'
  if (value === 'reminder') return 'reminder'
  return 'admin'
}

function parseDateParam(value: string | null) {
  const clean = toText(value)

  if (!clean) return null

  const date = new Date(clean)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function getStatusesForMode(mode: BookingQueryMode) {
  if (mode === 'upcoming') return OPEN_BOOKING_STATUSES
  if (mode === 'reminder') return REMINDER_ELIGIBLE_STATUSES
  return ALL_BOOKING_STATUSES
}

function getDateWindow(mode: BookingQueryMode, req: NextRequest) {
  const fromParam = parseDateParam(req.nextUrl.searchParams.get('from'))
  const toParam = parseDateParam(req.nextUrl.searchParams.get('to'))

  if (fromParam || toParam) {
    return {
      from: fromParam,
      to: toParam,
    }
  }

  if (mode === 'upcoming') {
    const now = new Date()
    const next30Days = new Date(now)
    next30Days.setDate(next30Days.getDate() + 30)

    return {
      from: now.toISOString(),
      to: next30Days.toISOString(),
    }
  }

  if (mode === 'reminder') {
    const now = new Date()
    const next25Hours = new Date(now)
    next25Hours.setHours(next25Hours.getHours() + 25)

    return {
      from: now.toISOString(),
      to: next25Hours.toISOString(),
    }
  }

  return {
    from: null,
    to: null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    const conversationId = toText(req.nextUrl.searchParams.get('conversationId'))
    const expertId = toText(req.nextUrl.searchParams.get('expertId'))
    const bookingId = toText(req.nextUrl.searchParams.get('bookingId'))
    const mode = parseMode(req.nextUrl.searchParams.get('mode'))
    const limit = toPositiveInt(req.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT)
    const includeClosed = req.nextUrl.searchParams.get('includeClosed') === 'true'
    const statuses = includeClosed ? ALL_BOOKING_STATUSES : getStatusesForMode(mode)
    const dateWindow = getDateWindow(mode, req)

    if (!conversationId && !expertId && !bookingId && mode === 'admin') {
      return NextResponse.json(
        {
          ok: false,
          error: 'conversationId, expertId veya bookingId gerekli.',
        },
        { status: 400 }
      )
    }

    if (conversationId && !isValidUuid(conversationId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli conversationId gerekli.' },
        { status: 400 }
      )
    }

    if (expertId && !isValidUuid(expertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    if (bookingId && !isValidUuid(bookingId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli bookingId gerekli.' },
        { status: 400 }
      )
    }

    let query = (supabase as any)
      .from('session_bookings')
      .select('*')
      .in('status', statuses)
      .order('scheduled_start_at', { ascending: true })
      .limit(limit)

    if (bookingId) {
      query = query.eq('id', bookingId)
    }

    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    }

    if (expertId) {
      query = query.eq('expert_id', expertId)
    }

    if (dateWindow.from) {
      query = query.gte('scheduled_start_at', dateWindow.from)
    }

    if (dateWindow.to) {
      query = query.lte('scheduled_start_at', dateWindow.to)
    }

    const { data, error } = await query

    if (error) {
      console.error('SESSION_BOOKINGS_GET_QUERY_ERROR', error)

      return NextResponse.json(
        { ok: false, error: 'Randevular alınamadı.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      mode,
      filters: {
        conversationId: conversationId || null,
        expertId: expertId || null,
        bookingId: bookingId || null,
        statuses,
        from: dateWindow.from,
        to: dateWindow.to,
        limit,
      },
      bookings: data || [],
    })
  } catch (err) {
    console.error('SESSION_BOOKINGS_GET_ERROR', err)

    return NextResponse.json(
      { ok: false, error: 'Randevular alınamadı.' },
      { status: 500 }
    )
  }
}
