import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

type AccessSource = 'conversation_access_tokens' | 'session_access_tokens'

type ConversationRow = {
  id: string
  client_application_id: string | null
  expert_id: string | null
  status: 'locked' | 'active' | 'closed' | string
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | string
  created_at: string
  updated_at: string
}

type ClientApplicationRow = {
  id: string
  name: string | null
  email: string | null
}

type ExpertRow = {
  id: string
  name: string | null
  email: string | null
  title?: string | null
}

type MessageRow = {
  id: string
  conversation_id: string
  sender_type: 'client' | 'expert' | 'admin' | string
  sender_name: string | null
  message: string
  created_at: string
}

type BookingRow = {
  id: string
  conversation_id: string | null
  expert_id: string | null
  scheduled_start_at: string
  scheduled_end_at: string
  timezone: string | null
  status: string
  live_session_id?: string | null
  session_ready?: boolean | null
  client_join_url?: string | null
  created_at?: string | null
}

type ConversationAccessTokenRow = {
  conversation_id: string | null
  role?: string | null
  user_type?: string | null
  token?: string | null
  revoked?: boolean | null
  expires_at?: string | null
}

type SessionAccessTokenRow = {
  id?: string | null
  booking_id?: string | null
  session_booking_id?: string | null
  live_session_id?: string | null
  session_id?: string | null
  role?: string | null
  user_type?: string | null
  participant_type?: string | null
  token?: string | null
  access_token?: string | null
  revoked?: boolean | null
  expires_at?: string | null
}

type ResolvedDashboardAccess = {
  conversationId: string
  bookingId: string | null
  source: AccessSource
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function getBaseUrl(req: NextRequest) {
  return (
    toText(process.env.NEXT_PUBLIC_APP_URL) ||
    toText(process.env.NEXT_PUBLIC_SITE_URL) ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  ).replace(/\/$/, '')
}

function normalizeRole(row: {
  role?: string | null
  user_type?: string | null
  participant_type?: string | null
}) {
  const role = toText(row.role || row.user_type || row.participant_type).toLowerCase()

  if (role === 'client' || role === 'danisan' || role === 'danışan') {
    return 'client'
  }

  if (role === 'expert' || role === 'uzman') {
    return 'expert'
  }

  return role
}

function isTokenUsable(row: { revoked?: boolean | null; expires_at?: string | null }) {
  if (row.revoked === true) return false
  if (!row.expires_at) return true

  const expiresAt = new Date(row.expires_at).getTime()

  if (Number.isNaN(expiresAt)) return true

  return expiresAt > Date.now()
}

function getSafeDateValue(value?: string | null) {
  if (!value) return 0

  const time = new Date(value).getTime()

  return Number.isNaN(time) ? 0 : time
}

function normalizeUrl(url: string | null | undefined, req: NextRequest) {
  const clean = toText(url)
  if (!clean) return null
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean

  const baseUrl = getBaseUrl(req)
  return `${baseUrl}${clean.startsWith('/') ? clean : `/${clean}`}`
}

async function resolveFromConversationAccessToken(
  token: string
): Promise<ResolvedDashboardAccess | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
    .from('conversation_access_tokens')
    .select('*')
    .eq('token', token)
    .limit(10)

  if (error) {
    console.error('CLIENT_DASHBOARD_CONVERSATION_TOKEN_LOOKUP_ERROR', error)
    throw new Error('TOKEN_LOOKUP_FAILED')
  }

  const rows = (data || []) as ConversationAccessTokenRow[]

  const match = rows.find((row) => {
    const role = normalizeRole(row)

    return row.conversation_id && role === 'client' && isTokenUsable(row)
  })

  if (!match?.conversation_id) return null

  const verified = await verifyConversationAccessToken({
    conversationId: match.conversation_id,
    role: 'client',
    token,
  })

  if (!verified.ok) return null

  return {
    conversationId: match.conversation_id,
    bookingId: null,
    source: 'conversation_access_tokens',
  }
}

async function getBookingById(bookingId: string) {
  if (!isValidUuid(bookingId)) return null

  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
    .from('session_bookings')
    .select(
      `
      id,
      conversation_id,
      expert_id,
      scheduled_start_at,
      scheduled_end_at,
      timezone,
      status,
      live_session_id,
      session_ready,
      client_join_url,
      created_at
      `
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error) {
    console.error('CLIENT_DASHBOARD_BOOKING_BY_ID_ERROR', error)
    return null
  }

  return data as BookingRow | null
}

async function resolveFromSessionAccessToken(
  token: string
): Promise<ResolvedDashboardAccess | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
    .from('session_access_tokens')
    .select('*')
    .or(`token.eq.${token},access_token.eq.${token}`)
    .limit(10)

  if (error) {
    console.error('CLIENT_DASHBOARD_SESSION_TOKEN_LOOKUP_ERROR', error)
    return null
  }

  const rows = (data || []) as SessionAccessTokenRow[]

  const match = rows.find((row) => {
    const role = normalizeRole(row)

    return role === 'client' && isTokenUsable(row)
  })

  const bookingId = toText(match?.booking_id || match?.session_booking_id)

  if (!bookingId || !isValidUuid(bookingId)) return null

  const booking = await getBookingById(bookingId)

  if (!booking?.conversation_id || !isValidUuid(booking.conversation_id)) {
    return null
  }

  return {
    conversationId: booking.conversation_id,
    bookingId,
    source: 'session_access_tokens',
  }
}

async function resolveDashboardAccess(token: string): Promise<ResolvedDashboardAccess | null> {
  const conversationAccess = await resolveFromConversationAccessToken(token)

  if (conversationAccess) return conversationAccess

  const sessionAccess = await resolveFromSessionAccessToken(token)

  if (sessionAccess) return sessionAccess

  return null
}

async function getConversation(conversationId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('conversations')
    .select(
      'id, client_application_id, expert_id, status, payment_status, created_at, updated_at'
    )
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    console.error('CLIENT_DASHBOARD_CONVERSATION_QUERY_ERROR', error)
    throw new Error('CONVERSATION_QUERY_FAILED')
  }

  return data as ConversationRow | null
}

async function getClient(clientApplicationId?: string | null) {
  if (!clientApplicationId || !isValidUuid(clientApplicationId)) return null

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('client_applications')
    .select('id, name, email')
    .eq('id', clientApplicationId)
    .maybeSingle()

  if (error) {
    console.error('CLIENT_DASHBOARD_CLIENT_QUERY_ERROR', error)
    return null
  }

  return data as ClientApplicationRow | null
}

async function getExpert(expertId?: string | null) {
  if (!expertId || !isValidUuid(expertId)) return null

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('experts')
    .select('id, name, email')
    .eq('id', expertId)
    .maybeSingle()

  if (error) {
    console.error('CLIENT_DASHBOARD_EXPERT_QUERY_ERROR', error)
    return null
  }

  return data as ExpertRow | null
}

async function getLastMessages(conversationId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, sender_name, message, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('CLIENT_DASHBOARD_MESSAGES_QUERY_ERROR', error)
    return []
  }

  return (data || []) as MessageRow[]
}

async function getBookings(conversationId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
    .from('session_bookings')
    .select(
      `
      id,
      conversation_id,
      expert_id,
      scheduled_start_at,
      scheduled_end_at,
      timezone,
      status,
      live_session_id,
      session_ready,
      client_join_url,
      created_at
      `
    )
    .eq('conversation_id', conversationId)
    .order('scheduled_start_at', { ascending: true })

  if (error) {
    console.error('CLIENT_DASHBOARD_BOOKINGS_QUERY_ERROR', error)
    return []
  }

  return (data || []) as BookingRow[]
}

function getUpcomingBookings(bookings: BookingRow[]) {
  const now = Date.now()

  return bookings
    .filter((booking) => {
      const end = getSafeDateValue(booking.scheduled_end_at)

      return (
        ['scheduled', 'confirmed', 'active'].includes(booking.status) &&
        end >= now - 15 * 60 * 1000
      )
    })
    .sort(
      (a, b) =>
        getSafeDateValue(a.scheduled_start_at) -
        getSafeDateValue(b.scheduled_start_at)
    )
}

function getCompletedBookings(bookings: BookingRow[]) {
  return bookings
    .filter((booking) => booking.status === 'completed')
    .sort(
      (a, b) =>
        getSafeDateValue(b.scheduled_start_at) -
        getSafeDateValue(a.scheduled_start_at)
    )
}

export async function GET(req: NextRequest) {
  try {
    const token = toText(req.nextUrl.searchParams.get('token'))

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Güvenli dashboard token gerekli.' },
        { status: 401 }
      )
    }

    const access = await resolveDashboardAccess(token)

    if (!access?.conversationId || !isValidUuid(access.conversationId)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Dashboard erişimi için geçerli client veya session token bulunamadı.',
        },
        { status: 403 }
      )
    }

    const conversation = await getConversation(access.conversationId)

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: 'Konuşma bulunamadı.' },
        { status: 404 }
      )
    }

    const [client, expert, messages, bookings] = await Promise.all([
      getClient(conversation.client_application_id),
      getExpert(conversation.expert_id),
      getLastMessages(access.conversationId),
      getBookings(access.conversationId),
    ])

    const upcomingSessions = getUpcomingBookings(bookings)
    const completedSessions = getCompletedBookings(bookings)
    const nextSession =
      bookings.find((booking) => booking.id === access.bookingId) ||
      upcomingSessions[0] ||
      null

    const baseUrl = getBaseUrl(req)
    const chatUrl = `${baseUrl}/client/chat/${conversation.id}?token=${encodeURIComponent(
      token
    )}`

    const sessionUrl =
      nextSession?.client_join_url
        ? normalizeUrl(nextSession.client_join_url, req)
        : null

    return NextResponse.json({
      ok: true,
      dashboard: {
        access: {
          source: access.source,
          bookingId: access.bookingId,
        },
        client: {
          id: client?.id || conversation.client_application_id,
          name: client?.name || 'Danışan',
          email: client?.email || null,
        },
        expert: {
          id: expert?.id || conversation.expert_id,
          name: expert?.name || 'Uzman',
          email: expert?.email || null,
        },
        conversation: {
          id: conversation.id,
          status: conversation.status,
          paymentStatus: conversation.payment_status,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          chatUrl,
        },
        nextSession,
        sessionUrl,
        upcomingSessions,
        completedSessions: completedSessions.slice(0, 5),
        recentMessages: messages,
        stats: {
          upcomingCount: upcomingSessions.length,
          completedCount: completedSessions.length,
          totalSessions: bookings.length,
          recentMessageCount: messages.length,
        },
      },
    })
  } catch (error) {
    console.error('CLIENT_DASHBOARD_ERROR', error)

    const message =
      error instanceof Error && error.message === 'TOKEN_LOOKUP_FAILED'
        ? 'Dashboard erişim tokenı kontrol edilemedi.'
        : error instanceof Error && error.message === 'CONVERSATION_QUERY_FAILED'
          ? 'Konuşma bilgileri alınamadı.'
          : 'Dashboard bilgileri alınamadı.'

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
