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
  id?: string | null
  expert_id?: string | null
  client_id?: string | null
  client_application_id?: string | null
  conversation_id?: string | null
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
  timezone?: string | null
  status?: BookingStatus | null
  session_ready?: boolean | null
  live_session_id?: string | null
  expert_join_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type ConversationRow = {
  id?: string | null
  client_application_id?: string | null
  expert_id?: string | null
  status?: string | null
  payment_status?: string | null
}

type ClientRow = {
  id?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
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
  timezone: string
  status: BookingStatus
  statusLabel: string
  sessionReady: boolean
  liveSessionId: string | null
  joinHref: string | null
  chatHref: string | null
  createdAt: string | null
}

type SessionsSummary = {
  total: number
  upcoming: number
  completed: number
  cancelled: number
  active: number
  today: number
}

const BOOKING_TABLE_CANDIDATES = ['session_bookings', 'bookings'] as const

const VALID_STATUSES = [
  'scheduled',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'no_show',
  'pending',
] as const

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status })
}

function toText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function toNullableText(value: unknown) {
  const text = toText(value)
  return text || null
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
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
  const status = toText(value).toLowerCase()

  if (!status || status === 'all' || status === 'tum' || status === 'tümü') {
    return null
  }

  return VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
    ? status
    : null
}

function getTime(value: string | null | undefined) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function isToday(value: string | null | undefined) {
  const time = getTime(value)
  if (!time) return false

  const date = new Date(time)
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isUpcomingSession(session: NormalizedSession) {
  const start = getTime(session.scheduledStartAt)

  return (
    start >= Date.now() &&
    ['scheduled', 'confirmed', 'active', 'pending'].includes(
      toText(session.status).toLowerCase()
    )
  )
}

function getStatusLabel(status: string | null | undefined) {
  switch (toText(status).toLowerCase()) {
    case 'pending':
      return 'Beklemede'
    case 'scheduled':
      return 'Planlandı'
    case 'confirmed':
      return 'Onaylandı'
    case 'active':
      return 'Aktif'
    case 'completed':
      return 'Tamamlandı'
    case 'cancelled':
      return 'İptal edildi'
    case 'no_show':
      return 'Katılmadı'
    default:
      return 'Planlandı'
  }
}

function getBookingClientId(booking: BookingRow, conversation?: ConversationRow | null) {
  return (
    toNullableText(booking.client_application_id) ||
    toNullableText(booking.client_id) ||
    toNullableText(conversation?.client_application_id)
  )
}

function normalizeSession({
  booking,
  conversation,
  client,
}: {
  booking: BookingRow
  conversation?: ConversationRow | null
  client?: ClientRow | null
}): NormalizedSession {
  const id = toText(booking.id)
  const conversationId = toNullableText(booking.conversation_id || conversation?.id)
  const clientId = getBookingClientId(booking, conversation)
  const liveSessionId = toNullableText(booking.live_session_id)
  const sessionReady = Boolean(booking.session_ready || liveSessionId)
  const expertJoinUrl = toNullableText(booking.expert_join_url)

  return {
    id,
    expertId: toNullableText(booking.expert_id || conversation?.expert_id),
    clientId,
    clientName: toText(client?.name, 'Danışan'),
    clientEmail: toNullableText(client?.email),
    clientPhone: toNullableText(client?.phone),
    conversationId,
    conversationStatus: toNullableText(conversation?.status),
    paymentStatus: toNullableText(conversation?.payment_status),
    scheduledStartAt: toNullableText(booking.scheduled_start_at),
    scheduledEndAt: toNullableText(booking.scheduled_end_at),
    timezone: toText(booking.timezone, 'Europe/Istanbul'),
    status: toText(booking.status, 'scheduled'),
    statusLabel: getStatusLabel(booking.status),
    sessionReady,
    liveSessionId,
    joinHref:
      expertJoinUrl || (sessionReady && id ? `/expert/session/${id}` : null),
    chatHref: conversationId ? `/expert/chat/${conversationId}` : null,
    createdAt: toNullableText(booking.created_at || booking.updated_at),
  }
}

function buildSummary(sessions: NormalizedSession[]): SessionsSummary {
  return {
    total: sessions.length,
    upcoming: sessions.filter(isUpcomingSession).length,
    completed: sessions.filter(
      (session) => toText(session.status).toLowerCase() === 'completed'
    ).length,
    cancelled: sessions.filter((session) =>
      ['cancelled', 'no_show'].includes(toText(session.status).toLowerCase())
    ).length,
    active: sessions.filter(
      (session) => toText(session.status).toLowerCase() === 'active'
    ).length,
    today: sessions.filter((session) => isToday(session.scheduledStartAt)).length,
  }
}

function sortSessions(a: NormalizedSession, b: NormalizedSession) {
  const aTime = getTime(a.scheduledStartAt)
  const bTime = getTime(b.scheduledStartAt)

  if (aTime && bTime) return aTime - bTime
  if (aTime) return -1
  if (bTime) return 1

  return getTime(b.createdAt) - getTime(a.createdAt)
}

async function fetchBookings({
  expertId,
  status,
  limit,
}: {
  expertId: string | null
  status: string | null
  limit: number
}) {
  const supabase = getSupabaseAdmin() as any
  let lastError: unknown = null

  for (const tableName of BOOKING_TABLE_CANDIDATES) {
    let query = supabase
      .from(tableName)
      .select('*')
      .order('scheduled_start_at', { ascending: true, nullsFirst: false })
      .limit(limit)

    if (expertId) {
      query = query.eq('expert_id', expertId)
    }

    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.in('status', VALID_STATUSES)
    }

    const { data, error } = await query

    if (!error) {
      return {
        tableName,
        bookings: (data || []) as BookingRow[],
      }
    }

    lastError = error
    console.error(`EXPERT_SESSIONS_${tableName.toUpperCase()}_QUERY_ERROR`, error)
  }

  throw lastError instanceof Error ? lastError : new Error('BOOKINGS_QUERY_FAILED')
}

async function fetchConversationsByIds(conversationIds: string[]) {
  const ids = Array.from(new Set(conversationIds.filter(isValidUuid)))
  const map = new Map<string, ConversationRow>()

  if (ids.length === 0) return map

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('conversations')
    .select('id, client_application_id, expert_id, status, payment_status')
    .in('id', ids)

  if (error) {
    console.error('EXPERT_SESSIONS_CONVERSATIONS_QUERY_ERROR', error)
    return map
  }

  for (const row of (data || []) as ConversationRow[]) {
    const id = toText(row.id)
    if (id) map.set(id, row)
  }

  return map
}

async function fetchClientsByIds(clientIds: string[]) {
  const ids = Array.from(new Set(clientIds.filter(isValidUuid)))
  const map = new Map<string, ClientRow>()

  if (ids.length === 0) return map

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('client_applications')
    .select('id, name, email, phone')
    .in('id', ids)

  if (error) {
    console.error('EXPERT_SESSIONS_CLIENTS_QUERY_ERROR', error)
    return map
  }

  for (const row of (data || []) as ClientRow[]) {
    const id = toText(row.id)
    if (id) map.set(id, row)
  }

  return map
}

export async function GET(req: NextRequest) {
  try {
    const requestedExpertId = toText(req.nextUrl.searchParams.get('expertId'))
    const envExpertId = toText(process.env.MINDORA_DEV_EXPERT_ID)
    const expertId = requestedExpertId || envExpertId || null
    const status = normalizeStatus(req.nextUrl.searchParams.get('status'))
    const limit = normalizeLimit(req.nextUrl.searchParams.get('limit'))

    if (requestedExpertId && !isValidUuid(requestedExpertId)) {
      return jsonError('Geçerli uzman kimliği gerekli.', 400)
    }

    if (envExpertId && !isValidUuid(envExpertId)) {
      return jsonError('Geliştirme uzman kimliği geçerli UUID olmalı.', 500)
    }

    const { tableName, bookings } = await fetchBookings({ expertId, status, limit })

    const conversationIds = bookings
      .map((booking) => toText(booking.conversation_id))
      .filter(Boolean)

    const conversationsById = await fetchConversationsByIds(conversationIds)

    const clientIds = bookings
      .map((booking) => {
        const conversationId = toText(booking.conversation_id)
        return getBookingClientId(booking, conversationsById.get(conversationId))
      })
      .filter((id): id is string => Boolean(id))

    const clientsById = await fetchClientsByIds(clientIds)

    const sessions = bookings
      .map((booking) => {
        const conversationId = toText(booking.conversation_id)
        const conversation = conversationId
          ? conversationsById.get(conversationId) || null
          : null
        const clientId = getBookingClientId(booking, conversation)
        const client = clientId ? clientsById.get(clientId) || null : null

        return normalizeSession({ booking, conversation, client })
      })
      .filter((session) => Boolean(session.id))
      .sort(sortSessions)

    return NextResponse.json({
      ok: true,
      expertId,
      source: tableName,
      sessions,
      summary: buildSummary(sessions),
    })
  } catch (error) {
    console.error('EXPERT_SESSIONS_API_ERROR', error)

    return jsonError('Görüşme bilgileri şu anda alınamadı.', 500)
  }
}
