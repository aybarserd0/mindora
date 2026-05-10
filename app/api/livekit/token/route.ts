import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

type UserType = 'client' | 'expert'

type SessionStatus =
  | 'scheduled'
  | 'waiting'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUserType(value: string): value is UserType {
  return value === 'client' || value === 'expert'
}

function isJoinableSessionStatus(status: SessionStatus | string) {
  return status === 'scheduled' || status === 'waiting' || status === 'active'
}

function createSafeIdentity(userType: UserType, participantName: string, sessionId: string) {
  const safeName =
    participantName
      .toLowerCase()
      .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'user'

  return `${userType}-${safeName}-${sessionId.slice(0, 8)}`
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

    const sessionId = toText((body as Record<string, unknown>).sessionId)
    const participantName = toText((body as Record<string, unknown>).participantName)
    const userTypeRaw = toText((body as Record<string, unknown>).userType)
    const accessToken = toText((body as Record<string, unknown>).token)

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Session id is required.' },
        { status: 400 }
      )
    }

    if (!participantName) {
      return NextResponse.json(
        { ok: false, error: 'Participant name is required.' },
        { status: 400 }
      )
    }

    if (!isValidUserType(userTypeRaw)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid user type.' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Access token is required.' },
        { status: 401 }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const livekitUrl = process.env.LIVEKIT_URL

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LIVEKIT_ENV_MISSING', {
        hasApiKey: Boolean(apiKey),
        hasApiSecret: Boolean(apiSecret),
        hasUrl: Boolean(livekitUrl),
      })

      return NextResponse.json(
        { ok: false, error: 'LiveKit environment variables are missing.' },
        { status: 500 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(
        `
        id,
        conversation_id,
        client_application_id,
        expert_id,
        status,
        room_name,
        scheduled_at,
        conversations (
          id,
          client_application_id,
          expert_id,
          status,
          payment_status
        )
      `
      )
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('LIVEKIT_SESSION_NOT_FOUND', sessionError)

      return NextResponse.json(
        { ok: false, error: 'Session not found.' },
        { status: 404 }
      )
    }

    if (!isJoinableSessionStatus(session.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Session is not joinable. Current status: ${session.status}`,
        },
        { status: 403 }
      )
    }

    const conversation = Array.isArray(session.conversations)
      ? session.conversations[0]
      : session.conversations

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

    if (conversation.payment_status !== 'paid') {
      return NextResponse.json(
        { ok: false, error: 'Payment is required before joining session.' },
        { status: 402 }
      )
    }

    const verified = await verifyConversationAccessToken({
      token: accessToken,
      conversationId: session.conversation_id,
      role: userTypeRaw,
    })

    if (!verified.ok) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired access token.' },
        { status: 401 }
      )
    }

    if (!session.room_name) {
      return NextResponse.json(
        { ok: false, error: 'Session room is not configured.' },
        { status: 500 }
      )
    }

    if (session.status === 'scheduled') {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'waiting',
        })
        .eq('id', session.id)
        .eq('status', 'scheduled')

      if (updateError) {
        console.error('LIVEKIT_SESSION_WAITING_UPDATE_ERROR', updateError)
      }
    }

    const identity = createSafeIdentity(userTypeRaw, participantName, session.id)

    const livekitToken = new AccessToken(apiKey, apiSecret, {
      identity,
      name: participantName,
      ttl: '2h',
      metadata: JSON.stringify({
        sessionId: session.id,
        conversationId: session.conversation_id,
        userType: userTypeRaw,
      }),
    })

    livekitToken.addGrant({
      roomJoin: true,
      room: session.room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await livekitToken.toJwt()

    return NextResponse.json({
      ok: true,
      token: jwt,
      url: livekitUrl,
      roomName: session.room_name,
      identity,
      session: {
        id: session.id,
        status: session.status,
        scheduledAt: session.scheduled_at,
      },
    })
  } catch (error) {
    console.error('LIVEKIT_TOKEN_ERROR', error)

    return NextResponse.json(
      { ok: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}