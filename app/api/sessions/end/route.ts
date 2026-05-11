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
  status: string
  payment_status: string | null
}

type SessionRecord = {
  id: string
  conversation_id: string
  status: SessionStatus | string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  conversations: ConversationRecord | ConversationRecord[] | null
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
    const accessToken = toText(bodyRecord.token)

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

    const supabase = getSupabaseAdmin()

    const { data, error: sessionError } = await supabase
      .from('sessions')
      .select(
        `
        id,
        conversation_id,
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

    if (conversation.status !== 'active') {
      return NextResponse.json(
        { ok: false, error: 'Conversation is not active.' },
        { status: 403 }
      )
    }

    const verified = await verifyConversationAccessToken({
      token: accessToken,
      conversationId: session.conversation_id,
      role: 'expert',
    })

    if (!verified.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Only authorized expert can end this session.',
        },
        { status: 401 }
      )
    }

    if (session.status === 'completed') {
      return NextResponse.json({
        ok: true,
        alreadyCompleted: true,
        session: {
          id: session.id,
          status: session.status,
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
    const startedAt = session.started_at || endedAt.toISOString()
    const durationMinutes = calculateDurationMinutes(startedAt, endedAt)

    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        started_at: startedAt,
        ended_at: endedAt.toISOString(),
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

    return NextResponse.json({
      ok: true,
      alreadyCompleted: false,
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