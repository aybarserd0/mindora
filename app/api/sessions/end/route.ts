import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

type SessionStatus =
  | 'scheduled'
  | 'waiting'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'

type ConversationRecord = {
  id: string
  status: string | null
  payment_status: string | null
}

type SessionRecord = {
  id: string
  conversation_id: string
  client_application_id: string | null
  expert_id: string | null
  status: SessionStatus | string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  conversations: ConversationRecord | ConversationRecord[] | null
}

type SessionAccessTokenRecord = {
  id: string
  session_id: string
  booking_id: string | null
  conversation_id: string
  user_type: string
  token: string
  expires_at: string | null
  used_at: string | null
  revoked_at: string | null
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeConversation(
  value: ConversationRecord | ConversationRecord[] | null
) {
  if (Array.isArray(value)) return value[0] || null
  return value
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return ''
  return header.slice(7).trim()
}

function getRequestAccessToken(req: NextRequest, bodyRecord: Record<string, unknown>) {
  return (
    toText(bodyRecord.token) ||
    toText(bodyRecord.accessToken) ||
    toText(req.headers.get('x-session-access-token')) ||
    getBearerToken(req)
  )
}

function normalizeRole(value: unknown) {
  const role = toText(value).toLowerCase()
  if (role === 'expert' || role === 'client' || role === 'admin') return role
  return ''
}

function canCompleteSession(status: string) {
  return status === 'scheduled' || status === 'waiting' || status === 'active'
}

function calculateDurationMinutes(startedAt: string | null, endedAt: Date) {
  if (!startedAt) return 0

  const startedDate = new Date(startedAt)

  if (Number.isNaN(startedDate.getTime())) return 0

  const diffMs = endedAt.getTime() - startedDate.getTime()

  if (diffMs <= 0) return 0

  return Math.max(1, Math.ceil(diffMs / 1000 / 60))
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false

  const expiresDate = new Date(expiresAt)

  if (Number.isNaN(expiresDate.getTime())) return true

  return expiresDate.getTime() <= Date.now()
}

async function verifySessionAccessToken({
  token,
  sessionId,
  conversationId,
}: {
  token: string
  sessionId: string
  conversationId: string
}) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
    .from('session_access_tokens')
    .select(
      `
      id,
      session_id,
      booking_id,
      conversation_id,
      user_type,
      token,
      expires_at,
      used_at,
      revoked_at
      `
    )
    .eq('token', token)
    .eq('session_id', sessionId)
    .eq('conversation_id', conversationId)
    .eq('user_type', 'expert')
    .maybeSingle()

  if (error) {
    console.error('SESSION_END_ACCESS_TOKEN_QUERY_ERROR', error)
    return { ok: false, reason: 'query_error' as const }
  }

  const access = data as SessionAccessTokenRecord | null

  if (!access) {
    return { ok: false, reason: 'not_found' as const }
  }

  if (access.revoked_at) {
    return { ok: false, reason: 'revoked' as const }
  }

  if (isExpired(access.expires_at)) {
    return { ok: false, reason: 'expired' as const }
  }

  return { ok: true, access }
}

async function markBookingCompleted({
  bookingId,
  liveSessionId,
  endedAt,
}: {
  bookingId?: string | null
  liveSessionId: string
  endedAt: string
}) {
  const supabase = getSupabaseAdmin()

  const updatePayload = {
    status: 'completed',
    completed_at: endedAt,
    updated_at: endedAt,
  }

  if (bookingId) {
    const { error } = await (supabase as any)
      .from('session_bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .in('status', ['scheduled', 'confirmed', 'active'])

    if (error) {
      console.error('SESSION_END_BOOKING_UPDATE_BY_ID_ERROR', error)
    }

    return
  }

  const { error } = await (supabase as any)
    .from('session_bookings')
    .update(updatePayload)
    .eq('live_session_id', liveSessionId)
    .in('status', ['scheduled', 'confirmed', 'active'])

  if (error) {
    console.error('SESSION_END_BOOKING_UPDATE_BY_SESSION_ERROR', error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body.' },
        { status: 400 }
      )
    }

    const bodyRecord = body as Record<string, unknown>

    const sessionId = toText(bodyRecord.sessionId)
    const accessToken = getRequestAccessToken(req, bodyRecord)
    const requestedRole =
      normalizeRole(bodyRecord.userType) ||
      normalizeRole(bodyRecord.role) ||
      normalizeRole(req.headers.get('x-user-type'))

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Session id is required.' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Access token is required.' },
        { status: 401 }
      )
    }

    if (requestedRole && requestedRole !== 'expert') {
      return NextResponse.json(
        { ok: false, error: 'Only expert can end this session.' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data, error: sessionError } = await supabase
      .from('sessions')
      .select(
        `
        id,
        conversation_id,
        client_application_id,
        expert_id,
        status,
        started_at,
        ended_at,
        duration_minutes,
        conversations (
          id,
          status,
          payment_status
        )
      `
      )
      .eq('id', sessionId)
      .maybeSingle()

    const session = data as SessionRecord | null

    if (sessionError) {
      console.error('SESSION_END_QUERY_ERROR', sessionError)

      return NextResponse.json(
        { ok: false, error: 'Session could not be checked.' },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Session not found.' },
        { status: 404 }
      )
    }

    const conversation = normalizeConversation(session.conversations)

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: 'Conversation not found for this session.' },
        { status: 404 }
      )
    }

    const sessionTokenVerification = await verifySessionAccessToken({
      token: accessToken,
      sessionId: session.id,
      conversationId: session.conversation_id,
    })

    let verifiedBy: 'session_access_tokens' | 'conversation_access_tokens' | null =
      null
    let bookingId: string | null = null

    if (
      sessionTokenVerification.ok === true &&
      sessionTokenVerification.access
      ) {
    verifiedBy = 'session_access_tokens'
    bookingId = sessionTokenVerification.access.booking_id
    } else {
      const legacyVerification = await verifyConversationAccessToken({
        token: accessToken,
        conversationId: session.conversation_id,
        role: 'expert',
      })

      if (legacyVerification.ok) {
        verifiedBy = 'conversation_access_tokens'
      }
    }

    if (!verifiedBy) {
      console.warn('SESSION_END_UNAUTHORIZED_EXPERT', {
        sessionId: session.id,
        conversationId: session.conversation_id,
        sessionTokenReason: sessionTokenVerification.reason,
      })

      return NextResponse.json(
        {
          ok: false,
          error: 'Only authorized expert can end this session.',
        },
        { status: 401 }
      )
    }

    if (session.status === 'completed') {
      if (bookingId) {
        await markBookingCompleted({
          bookingId,
          liveSessionId: session.id,
          endedAt: session.ended_at || new Date().toISOString(),
        })
      }

      return NextResponse.json({
        ok: true,
        alreadyCompleted: true,
        verifiedBy,
        session: {
          id: session.id,
          status: session.status,
          startedAt: session.started_at,
          endedAt: session.ended_at,
          durationMinutes: session.duration_minutes,
        },
      })
    }

    if (!canCompleteSession(session.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Session cannot be completed from current status: ${session.status}`,
        },
        { status: 409 }
      )
    }

    const endedAt = new Date()
    const endedAtIso = endedAt.toISOString()
    const startedAt = session.started_at || endedAtIso
    const durationMinutes = calculateDurationMinutes(startedAt, endedAt)

    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        started_at: startedAt,
        ended_at: endedAtIso,
        duration_minutes: durationMinutes,
      })
      .eq('id', session.id)
      .in('status', ['scheduled', 'waiting', 'active'])
      .select('id, status, started_at, ended_at, duration_minutes')
      .single()

    if (updateError || !updatedSession) {
      console.error('SESSION_END_UPDATE_ERROR', updateError)

      return NextResponse.json(
        { ok: false, error: 'Session could not be completed.' },
        { status: 500 }
      )
    }

    await markBookingCompleted({
      bookingId,
      liveSessionId: session.id,
      endedAt: endedAtIso,
    })

    return NextResponse.json({
      ok: true,
      alreadyCompleted: false,
      verifiedBy,
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        startedAt: updatedSession.started_at,
        endedAt: updatedSession.ended_at,
        durationMinutes: updatedSession.duration_minutes,
      },
    })
  } catch (error) {
    console.error('SESSION_END_ERROR', error)

    return NextResponse.json(
      { ok: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
