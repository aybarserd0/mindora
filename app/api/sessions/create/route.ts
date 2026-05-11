import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type CreatedBy = 'client' | 'expert' | 'admin' | 'system'

const VALID_CREATED_BY: CreatedBy[] = ['client', 'expert', 'admin', 'system']

const REUSABLE_SESSION_STATUSES = ['scheduled', 'waiting', 'active']

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidCreatedBy(value: string): value is CreatedBy {
  return VALID_CREATED_BY.includes(value as CreatedBy)
}

function createRoomName(conversationId: string) {
  const safeConversationPart = conversationId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const randomPart = crypto.randomBytes(16).toString('hex')

  return `mindora-${safeConversationPart || 'session'}-${randomPart}`
}

function parseScheduledAt(value: string) {
  if (!value) return null

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid scheduledAt value.')
  }

  return parsed
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

    const conversationId = toText(bodyRecord.conversationId)
    const scheduledAtRaw = toText(bodyRecord.scheduledAt)
    const createdByRaw = toText(bodyRecord.createdBy) || 'system'
    const createdBy: CreatedBy = isValidCreatedBy(createdByRaw)
      ? createdByRaw
      : 'system'

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation id is required.' },
        { status: 400 }
      )
    }

    let scheduledAt: Date | null = null

    try {
      scheduledAt = parseScheduledAt(scheduledAtRaw)
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid scheduledAt value.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, client_application_id, expert_id, status, payment_status')
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError) {
      console.error('SESSION_CREATE_CONVERSATION_QUERY_ERROR', conversationError)

      return NextResponse.json(
        { ok: false, error: 'Conversation could not be checked.' },
        { status: 500 }
      )
    }

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: 'Conversation not found.' },
        { status: 404 }
      )
    }

    if (conversation.status !== 'active') {
      return NextResponse.json(
        { ok: false, error: 'Conversation is not active.' },
        { status: 403 }
      )
    }

    if (conversation.payment_status !== 'paid') {
      return NextResponse.json(
        { ok: false, error: 'Payment is required before creating a session.' },
        { status: 402 }
      )
    }

    if (!conversation.client_application_id || !conversation.expert_id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Conversation is missing required client or expert data.',
        },
        { status: 409 }
      )
    }

    const { data: existingSessions, error: existingError } = await supabase
      .from('sessions')
      .select('id, status, room_name, scheduled_at, conversation_id, started_at')
      .eq('conversation_id', conversation.id)
      .in('status', REUSABLE_SESSION_STATUSES)
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingError) {
      console.error('SESSION_CREATE_EXISTING_CHECK_ERROR', existingError)

      return NextResponse.json(
        { ok: false, error: 'Could not check existing sessions.' },
        { status: 500 }
      )
    }

    const existingSession = existingSessions?.[0]

    if (existingSession) {
      return NextResponse.json({
        ok: true,
        reused: true,
        session: {
          id: existingSession.id,
          conversationId: existingSession.conversation_id,
          status: existingSession.status,
          roomName: existingSession.room_name,
          scheduledAt: existingSession.scheduled_at,
          startedAt: existingSession.started_at,
        },
      })
    }

    const roomName = createRoomName(conversation.id)

    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({
        conversation_id: conversation.id,
        client_application_id: conversation.client_application_id,
        expert_id: conversation.expert_id,
        status: scheduledAt ? 'scheduled' : 'waiting',
        provider: 'livekit',
        room_name: roomName,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        created_by: createdBy,
      })
      .select(
        'id, status, room_name, scheduled_at, conversation_id, started_at, created_at'
      )
      .single()

    if (insertError || !session) {
      console.error('SESSION_CREATE_INSERT_ERROR', insertError)

      return NextResponse.json(
        { ok: false, error: 'Session could not be created.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      reused: false,
      session: {
        id: session.id,
        conversationId: session.conversation_id,
        status: session.status,
        roomName: session.room_name,
        scheduledAt: session.scheduled_at,
        startedAt: session.started_at,
        createdAt: session.created_at,
      },
    })
  } catch (error) {
    console.error('SESSION_CREATE_ERROR', error)

    return NextResponse.json(
      { ok: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}