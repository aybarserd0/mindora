import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type BookingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'pending'
  | string

type BookingRow = {
  id: string
  expert_id: string | null
  client_id: string | null
  conversation_id: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  status: BookingStatus | null
  session_ready?: boolean | null
  live_session_id?: string | null
  created_at?: string | null
  client_applications?: {
    id?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
  } | null
  conversations?: {
    id?: string | null
    status?: string | null
    payment_status?: string | null
  } | null
}

type NormalizedSession = {
  id: string
  expertId: string | null
  clientId: string | null
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  conversationId: string | null
  conversationStatus: string | null
  paymentStatus: string | null
  scheduledStartAt: string | null
  scheduledEndAt: string | null
  status: BookingStatus
  sessionReady: boolean
  liveSessionId: string | null
  joinHref: string | null
  chatHref: string | null
  createdAt: string | null
}

type SessionsResponse = {
  ok: true
  expertId: string | null
  sessions: NormalizedSession[]
  summary: {
    total: number
    upcoming: number
    completed: number
    cancelled: number
    active: number
  }
}

const VALID_STATUSES = [
  'scheduled',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'no_show',
  'pending',
] as const

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) return 100
  if (parsed > 300) return 300

  return parsed
}

function normalizeStatus(value: string | null) {
  if (!value || value === 'all') return null

  return VALID_STATUSES.includes(value as (typeof VALID_STATUSES)[number])
    ? value
    : null
}

function isUpcomingSession(session: NormalizedSession) {
  if (!session.scheduledStartAt) return false

  const start = new Date(session.scheduledStartAt).getTime()

  return (
    Number.isFinite(start) &&
    start >= Date.now() &&
    ['scheduled', 'confirmed', 'active', 'pending'].includes(session.status)
  )
}

function normalizeSession(row: BookingRow): NormalizedSession {
  const conversationId = row.conversation_id || row.conversations?.id || null
  const sessionReady = Boolean(row.session_ready || row.live_session_id)

  return {
    id: row.id,
    expertId: row.expert_id || null,
    clientId: row.client_id || row.client_applications?.id || null,
    clientName: row.client_applications?.name?.trim() || 'Danışan',
    clientEmail: row.client_applications?.email || null,
    clientPhone: row.client_applications?.phone || null,
    conversationId,
    conversationStatus: row.conversations?.status || null,
    paymentStatus: row.conversations?.payment_status || null,
    scheduledStartAt: row.scheduled_start_at || null,
    scheduledEndAt: row.scheduled_end_at || null,
    status: row.status || 'scheduled',
    sessionReady,
    liveSessionId: row.live_session_id || null,
    joinHref: sessionReady ? `/expert/session/${row.id}` : null,
    chatHref: conversationId ? `/expert/chat/${conversationId}` : null,
    createdAt: row.created_at || null,
  }
}

function buildSummary(sessions: NormalizedSession[]): SessionsResponse['summary'] {
  return {
    total: sessions.length,
    upcoming: sessions.filter(isUpcomingSession).length,
    completed: sessions.filter((session) => session.status === 'completed').length,
    cancelled: sessions.filter((session) =>
      ['cancelled', 'no_show'].includes(session.status)
    ).length,
    active: sessions.filter((session) => session.status === 'active').length,
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const requestedExpertId = req.nextUrl.searchParams.get('expertId')
    const envExpertId = process.env.MINDORA_DEV_EXPERT_ID || null
    const expertId = requestedExpertId || envExpertId
    const status = normalizeStatus(req.nextUrl.searchParams.get('status'))
    const limit = normalizeLimit(req.nextUrl.searchParams.get('limit'))

    if (requestedExpertId && !isValidUuid(requestedExpertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    if (envExpertId && !isValidUuid(envExpertId)) {
      return NextResponse.json(
        { ok: false, error: 'MINDORA_DEV_EXPERT_ID geçerli UUID olmalı.' },
        { status: 500 }
      )
    }

    let query = supabase
      .from('bookings' as never)
      .select(
        `
          id,
          expert_id,
          client_id,
          conversation_id,
          scheduled_start_at,
          scheduled_end_at,
          status,
          session_ready,
          live_session_id,
          created_at,
          client_applications(id, name, email, phone),
          conversations(id, status, payment_status)
        `
      )
      .order('scheduled_start_at', { ascending: true, nullsFirst: false })
      .limit(limit)

    if (expertId) {
      query = query.eq('expert_id', expertId as never)
    }

    if (status) {
      query = query.eq('status', status as never)
    } else {
      query = query.in('status', VALID_STATUSES as unknown as never[])
    }

    const { data, error } = await query

    if (error) {
      console.error('Expert sessions query error:', error)

      return NextResponse.json(
        { ok: false, error: 'Seans bilgileri alınamadı.' },
        { status: 500 }
      )
    }

    const sessions = ((data || []) as unknown as BookingRow[]).map(normalizeSession)

    return NextResponse.json({
      ok: true,
      expertId: expertId || null,
      sessions,
      summary: buildSummary(sessions),
    } satisfies SessionsResponse)
  } catch (err) {
    console.error('Expert sessions GET error:', err)

    return NextResponse.json(
      { ok: false, error: 'Seanslar alınırken beklenmeyen bir hata oluştu.' },
      { status: 500 }
    )
  }
}
