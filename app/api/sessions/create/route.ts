import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function createRoomName(conversationId: string) {
  const randomPart = crypto.randomBytes(12).toString('hex')
  return `mindora-${conversationId.slice(0, 8)}-${randomPart}`
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

    const conversationId = toText((body as Record<string, unknown>).conversationId)
    const scheduledAtRaw = toText((body as Record<string, unknown>).scheduledAt)
    const createdByRaw = toText((body as Record<string, unknown>).createdBy) || 'admin'

    const createdBy = ['client', 'expert', 'admin', 'system'].includes(createdByRaw)
      ? createdByRaw
      : 'admin'

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation id is required.' },
        { status: 400 }
      )
    }

    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null

    if (scheduledAtRaw && Number.isNaN(scheduledAt?.getTime())) {
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
      .single()

    if (conversationError || !conversation) {
      console.error('SESSION_CREATE_CONVERSATION_NOT_FOUND', conversationError)

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

    const { data: existingSession, error: existingError } = await supabase
      .from('sessions')
      .select('id, status, room_name, scheduled_at')
      .eq('conversation_id', conversationId)
      .in('status', ['scheduled', 'waiting', 'active'])
      .maybeSingle()

    if (existingError) {
      console.error('SESSION_CREATE_EXISTING_CHECK_ERROR', existingError)

      return NextResponse.json(
        { ok: false, error: 'Could not check existing sessions.' },
        { status: 500 }
      )
    }

    if (existingSession) {
      return NextResponse.json({
        ok: true,
        reused: true,
        session: {
          id: existingSession.id,
          status: existingSession.status,
          roomName: existingSession.room_name,
          scheduledAt: existingSession.scheduled_at,
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
        status: 'scheduled',
        provider: 'livekit',
        room_name: roomName,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        created_by: createdBy,
      })
      .select('id, status, room_name, scheduled_at, conversation_id')
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