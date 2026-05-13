import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type UserType = 'client' | 'expert' | 'admin'

type BookingRow = {
  id: string
  conversation_id: string | null
  expert_id: string
  client_id: string | null
  scheduled_start_at: string
  scheduled_end_at: string
  status: string
  live_session_id?: string | null
}

type ConversationRow = {
  id: string
  client_application_id: string | null
  expert_id: string | null
  status: string
  payment_status: string | null
}

type SessionRow = {
  id: string
  room_name?: string | null
}

const TOKEN_TTL_HOURS = 24

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function getBaseUrl(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin) return origin

  const host = req.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'

  return host ? `${protocol}://${host}` : ''
}

function createSecureToken() {
  return crypto.randomBytes(32).toString('hex')
}

function createRoomName(sessionId: string) {
  return `mindora-session-${sessionId}`
}

function getTokenExpiry() {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + TOKEN_TTL_HOURS)
  return expiresAt.toISOString()
}

async function createSessionAccessToken({
  supabase,
  sessionId,
  bookingId,
  conversationId,
  userType,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  sessionId: string
  bookingId: string
  conversationId: string
  userType: UserType
}) {
  const token = createSecureToken()
  const expiresAt = getTokenExpiry()

  const { data, error } = await supabase
    .from('session_access_tokens' as never)
    .insert({
      session_id: sessionId,
      booking_id: bookingId,
      conversation_id: conversationId,
      user_type: userType,
      token,
      expires_at: expiresAt,
    } as never)
    .select('token,expires_at')
    .single()

  if (error) throw error

  const row = data as unknown as {
    token?: string
    expires_at?: string
  } | null

  if (!row?.token || !row?.expires_at) {
    throw new Error('Session access token oluşturulamadı.')
  }

  return {
    token: row.token,
    expiresAt: row.expires_at,
  }
}

async function ensureLiveSession({
  supabase,
  booking,
  conversation,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  booking: BookingRow
  conversation: ConversationRow
}) {
  if (booking.live_session_id) {
    const { data: rawExistingSession, error: existingSessionError } =
      await supabase
        .from('sessions' as never)
        .select('id,room_name')
        .eq('id', booking.live_session_id as never)
        .maybeSingle()

    if (existingSessionError) throw existingSessionError

    const existingSession = rawExistingSession as unknown as SessionRow | null

    if (existingSession?.id) {
      if (existingSession.room_name) {
        return {
          id: existingSession.id,
          roomName: existingSession.room_name,
        }
      }

      const roomName = createRoomName(existingSession.id)

      const { error: roomUpdateError } = await supabase
        .from('sessions' as never)
        .update({ room_name: roomName } as never)
        .eq('id', existingSession.id as never)

      if (roomUpdateError) throw roomUpdateError

      return {
        id: existingSession.id,
        roomName,
      }
    }
  }

  const insertPayload = {
    conversation_id: booking.conversation_id,
    client_application_id: conversation.client_application_id,
    expert_id: booking.expert_id || conversation.expert_id,
    status: 'scheduled',
    scheduled_at: booking.scheduled_start_at,
    room_name: `pending-${booking.id}`,
  }

  const { data: rawSession, error: sessionError } = await supabase
    .from('sessions' as never)
    .insert(insertPayload as never)
    .select('id,room_name')
    .single()

  if (sessionError) throw sessionError

  const session = rawSession as unknown as SessionRow | null

  if (!session?.id) {
    throw new Error('Live session oluşturulamadı.')
  }

  const finalRoomName = createRoomName(session.id)

  const { error: roomUpdateError } = await supabase
    .from('sessions' as never)
    .update({ room_name: finalRoomName } as never)
    .eq('id', session.id as never)

  if (roomUpdateError) throw roomUpdateError

  return {
    id: session.id,
    roomName: finalRoomName,
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await params
    const bookingId = resolved.id?.trim()

    if (!isValidUuid(bookingId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli booking id gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: rawBooking, error: bookingError } = await supabase
      .from('session_bookings' as never)
      .select('*')
      .eq('id', bookingId as never)
      .single()

    if (bookingError) throw bookingError

    const booking = rawBooking as unknown as BookingRow | null

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: 'Randevu bulunamadı.' },
        { status: 404 }
      )
    }

    if (!booking.conversation_id || !isValidUuid(booking.conversation_id)) {
      return NextResponse.json(
        { ok: false, error: 'Randevuya bağlı geçerli conversation bulunamadı.' },
        { status: 400 }
      )
    }

    if (!isValidUuid(booking.expert_id)) {
      return NextResponse.json(
        { ok: false, error: 'Randevuya bağlı geçerli expert bulunamadı.' },
        { status: 400 }
      )
    }

    if (['cancelled', 'completed', 'no_show'].includes(booking.status)) {
      return NextResponse.json(
        { ok: false, error: 'Kapalı durumdaki randevu görüşmeye hazırlanamaz.' },
        { status: 409 }
      )
    }

    const { data: rawConversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id,client_application_id,expert_id,status,payment_status')
      .eq('id', booking.conversation_id)
      .single()

    if (conversationError) throw conversationError

    const conversation = rawConversation as ConversationRow | null

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: 'Conversation bulunamadı.' },
        { status: 404 }
      )
    }

    if (conversation.status !== 'active') {
      return NextResponse.json(
        { ok: false, error: 'Conversation aktif değil.' },
        { status: 403 }
      )
    }

    if (conversation.payment_status !== 'paid') {
      return NextResponse.json(
        { ok: false, error: 'Görüşme hazırlamak için ödeme paid olmalı.' },
        { status: 402 }
      )
    }

    const liveSession = await ensureLiveSession({
      supabase,
      booking,
      conversation,
    })

    const [clientAccess, expertAccess, adminAccess] = await Promise.all([
      createSessionAccessToken({
        supabase,
        sessionId: liveSession.id,
        bookingId: booking.id,
        conversationId: booking.conversation_id,
        userType: 'client',
      }),
      createSessionAccessToken({
        supabase,
        sessionId: liveSession.id,
        bookingId: booking.id,
        conversationId: booking.conversation_id,
        userType: 'expert',
      }),
      createSessionAccessToken({
        supabase,
        sessionId: liveSession.id,
        bookingId: booking.id,
        conversationId: booking.conversation_id,
        userType: 'admin',
      }),
    ])

    const baseUrl = getBaseUrl(req)

    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, error: 'Base URL üretilemedi.' },
        { status: 500 }
      )
    }

    const clientJoinUrl = `${baseUrl}/client/session/${liveSession.id}?token=${clientAccess.token}`
    const expertJoinUrl = `${baseUrl}/expert/session/${liveSession.id}?token=${expertAccess.token}`
    const adminJoinUrl = `${baseUrl}/admin/conversations/${booking.conversation_id}?session=${liveSession.id}&token=${adminAccess.token}`

    const { data: rawUpdatedBooking, error: updateError } = await supabase
      .from('session_bookings' as never)
      .update({
        live_session_id: liveSession.id,
        session_ready: true,
        session_ready_at: new Date().toISOString(),
        client_join_url: clientJoinUrl,
        expert_join_url: expertJoinUrl,
        admin_join_url: adminJoinUrl,
        status: booking.status === 'scheduled' ? 'confirmed' : booking.status,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', booking.id as never)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      booking: rawUpdatedBooking,
      liveSessionId: liveSession.id,
      roomName: liveSession.roomName,
      tokenExpiresAt: clientAccess.expiresAt,
      joinUrls: {
        client: clientJoinUrl,
        expert: expertJoinUrl,
        admin: adminJoinUrl,
      },
    })
  } catch (err) {
    console.error('Prepare booking session error:', err)

    return NextResponse.json(
      { ok: false, error: 'Randevu görüşmeye hazırlanamadı.' },
      { status: 500 }
    )
  }
}