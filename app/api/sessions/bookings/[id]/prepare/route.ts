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
  session_ready?: boolean | null
}

type SessionRow = {
  id: string
}

const TOKEN_TTL_HOURS = 24

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
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

  return {
    token: (data as any)?.token as string,
    expiresAt: (data as any)?.expires_at as string,
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await params
    const bookingId = resolved.id

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

    if (!booking.conversation_id) {
      return NextResponse.json(
        { ok: false, error: 'Randevuya bağlı conversation bulunamadı.' },
        { status: 400 }
      )
    }

    if (['cancelled', 'completed', 'no_show'].includes(booking.status)) {
      return NextResponse.json(
        { ok: false, error: 'Kapalı durumdaki randevu görüşmeye hazırlanamaz.' },
        { status: 409 }
      )
    }

    let liveSessionId = booking.live_session_id || ''

    if (!liveSessionId) {
      const { data: rawSession, error: sessionError } = await supabase
        .from('sessions' as never)
        .insert({
          conversation_id: booking.conversation_id,
          expert_id: booking.expert_id,
          client_id: booking.client_id,
          status: 'scheduled',
          scheduled_start_at: booking.scheduled_start_at,
          scheduled_end_at: booking.scheduled_end_at,
        } as never)
        .select('id')
        .single()

      if (sessionError) throw sessionError

      const session = rawSession as unknown as SessionRow | null
      liveSessionId = session?.id || ''

      if (!liveSessionId) {
        return NextResponse.json(
          { ok: false, error: 'Live session oluşturulamadı.' },
          { status: 500 }
        )
      }
    }

    const [clientAccess, expertAccess, adminAccess] = await Promise.all([
      createSessionAccessToken({
        supabase,
        sessionId: liveSessionId,
        bookingId: booking.id,
        conversationId: booking.conversation_id,
        userType: 'client',
      }),
      createSessionAccessToken({
        supabase,
        sessionId: liveSessionId,
        bookingId: booking.id,
        conversationId: booking.conversation_id,
        userType: 'expert',
      }),
      createSessionAccessToken({
        supabase,
        sessionId: liveSessionId,
        bookingId: booking.id,
        conversationId: booking.conversation_id,
        userType: 'admin',
      }),
    ])

    const baseUrl = getBaseUrl(req)

    const clientJoinUrl = `${baseUrl}/client/session/${liveSessionId}?token=${clientAccess.token}`
    const expertJoinUrl = `${baseUrl}/expert/session/${liveSessionId}?token=${expertAccess.token}`
    const adminJoinUrl = `${baseUrl}/admin/conversations/${booking.conversation_id}?session=${liveSessionId}&token=${adminAccess.token}`

    const { data: rawUpdatedBooking, error: updateError } = await supabase
      .from('session_bookings' as never)
      .update({
        live_session_id: liveSessionId,
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
      liveSessionId,
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