import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getExpertIdFromRequest } from '@/lib/security/expert-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ConversationStatus = 'locked' | 'active' | 'closed' | 'matched' | 'open' | string

type BookingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | string

type ConversationRow = {
  id: string
  expert_id: string | null
  client_application_id: string | null
  status: ConversationStatus | null
  payment_status: string | null
  created_at: string | null
  updated_at: string | null
}

type BookingRow = {
  id: string
  expert_id: string | null
  conversation_id: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  status: BookingStatus | null
  created_at: string | null
}

type ClientApplicationRow = {
  id: string
  name: string | null
  email: string | null
}

type ClientItem = {
  id: string
  conversationId: string
  clientApplicationId: string | null
  name: string
  email: string | null
  phone: string | null
  topic: string
  status: 'active' | 'scheduled' | 'completed' | 'paused'
  conversationStatus: string | null
  paymentStatus: string | null
  lastSessionAt: string | null
  nextSessionAt: string | null
  totalSessions: number
  completedSessions: number
  createdAt: string | null
  updatedAt: string | null
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function getDateTime(value: string | null | undefined) {
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function normalizeClientStatus(
  conversation: ConversationRow,
  bookings: BookingRow[]
): ClientItem['status'] {
  const conversationStatus = toText(conversation.status).toLowerCase()
  const now = Date.now()

  if (conversationStatus === 'closed' || conversationStatus === 'completed') {
    return 'completed'
  }

  if (conversationStatus === 'locked' || conversationStatus === 'paused') {
    return 'paused'
  }

  const hasUpcoming = bookings.some((booking) => {
    const status = toText(booking.status).toLowerCase()
    const start = getDateTime(booking.scheduled_start_at)

    return ['scheduled', 'confirmed', 'active'].includes(status) && start >= now
  })

  if (hasUpcoming) return 'scheduled'

  return 'active'
}

function buildClientItem(
  conversation: ConversationRow,
  allBookings: BookingRow[],
  clientsById: Map<string, ClientApplicationRow>
): ClientItem {
  const clientApplicationId = toText(conversation.client_application_id) || null
  const client = clientApplicationId ? clientsById.get(clientApplicationId) || null : null

  const relatedBookings = allBookings.filter(
    (booking) => booking.conversation_id === conversation.id
  )

  const now = Date.now()

  const pastBookings = relatedBookings
    .filter((booking) => getDateTime(booking.scheduled_start_at) < now)
    .sort(
      (a, b) =>
        getDateTime(b.scheduled_start_at) - getDateTime(a.scheduled_start_at)
    )

  const upcomingBookings = relatedBookings
    .filter((booking) => {
      const status = toText(booking.status).toLowerCase()
      return (
        ['scheduled', 'confirmed', 'active'].includes(status) &&
        getDateTime(booking.scheduled_start_at) >= now
      )
    })
    .sort(
      (a, b) =>
        getDateTime(a.scheduled_start_at) - getDateTime(b.scheduled_start_at)
    )

  const completedSessions = relatedBookings.filter(
    (booking) => toText(booking.status).toLowerCase() === 'completed'
  ).length

  return {
    id: clientApplicationId || conversation.id,
    conversationId: conversation.id,
    clientApplicationId,
    name: toText(client?.name) || 'Danışan',
    email: toText(client?.email) || null,
    phone: null,
    topic: '-',
    status: normalizeClientStatus(conversation, relatedBookings),
    conversationStatus: conversation.status || null,
    paymentStatus: conversation.payment_status || null,
    lastSessionAt: pastBookings[0]?.scheduled_start_at || null,
    nextSessionAt: upcomingBookings[0]?.scheduled_start_at || null,
    totalSessions: relatedBookings.length,
    completedSessions,
    createdAt: conversation.created_at || null,
    updatedAt: conversation.updated_at || null,
  }
}

function summarizeClients(clients: ClientItem[]) {
  return {
    total: clients.length,
    active: clients.filter((client) => client.status === 'active').length,
    scheduled: clients.filter((client) => client.status === 'scheduled').length,
    completed: clients.filter((client) => client.status === 'completed').length,
    paused: clients.filter((client) => client.status === 'paused').length,
    totalSessions: clients.reduce((sum, client) => sum + client.totalSessions, 0),
    completedSessions: clients.reduce(
      (sum, client) => sum + client.completedSessions,
      0
    ),
  }
}

async function fetchClientsByIds(clientIds: string[]) {
  const uniqueIds = Array.from(new Set(clientIds.filter(isValidUuid)))

  if (uniqueIds.length === 0) {
    return new Map<string, ClientApplicationRow>()
  }

  const supabase = getSupabaseAdmin() as any

  const { data, error } = await supabase
    .from('client_applications')
    .select('id, name, email')
    .in('id', uniqueIds)

  if (error) {
    console.error('EXPERT_CLIENTS_CLIENT_APPLICATIONS_QUERY_ERROR', error)
    return new Map<string, ClientApplicationRow>()
  }

  const rows = (data || []) as ClientApplicationRow[]
  return new Map(rows.map((client) => [client.id, client]))
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin() as any
    const expertId = await getExpertIdFromRequest(req)

    if (!expertId) {
      return NextResponse.json(
        { ok: false, error: 'Uzman oturumu bulunamadı.' },
        { status: 401 }
      )
    }

    let conversationsQuery = supabase
      .from('conversations')
      .select(
        'id, expert_id, client_application_id, status, payment_status, created_at, updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(250)

    let bookingsQuery = supabase
      .from('session_bookings')
      .select(
        'id, expert_id, conversation_id, scheduled_start_at, scheduled_end_at, status, created_at'
      )
      .order('scheduled_start_at', { ascending: false })
      .limit(500)

    if (expertId) {
      conversationsQuery = conversationsQuery.eq('expert_id', expertId)
      bookingsQuery = bookingsQuery.eq('expert_id', expertId)
    }

    const [conversationsResult, bookingsResult] = await Promise.all([
      conversationsQuery,
      bookingsQuery,
    ])

    const firstError = conversationsResult.error || bookingsResult.error || null

    if (firstError) {
      console.error('EXPERT_CLIENTS_QUERY_ERROR', firstError)

      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan verileri şu an alınamadı.',
        },
        { status: 500 }
      )
    }

    const conversations = (conversationsResult.data || []) as ConversationRow[]
    const bookings = (bookingsResult.data || []) as BookingRow[]

    const clientIds = conversations
      .map((conversation) => conversation.client_application_id)
      .filter((id): id is string => isValidUuid(id))

    const clientsById = await fetchClientsByIds(clientIds)

    const clients = conversations
      .map((conversation) => buildClientItem(conversation, bookings, clientsById))
      .sort((a, b) => {
        const aNext = getDateTime(a.nextSessionAt)
        const bNext = getDateTime(b.nextSessionAt)

        if (aNext && bNext) return aNext - bNext
        if (aNext) return -1
        if (bNext) return 1

        return getDateTime(b.updatedAt || b.createdAt) - getDateTime(a.updatedAt || a.createdAt)
      })

    return NextResponse.json({
      ok: true,
      expertId: expertId || null,
      mode: expertId ? 'expert-scoped' : 'development-all-experts',
      clients,
      summary: summarizeClients(clients),
    })
  } catch (error) {
    console.error('EXPERT_CLIENTS_ERROR', error)

    return NextResponse.json(
      { ok: false, error: 'Danışan bilgileri alınamadı.' },
      { status: 500 }
    )
  }
}
