import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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
  client_id?: string | null
  client_application_id?: string | null
  status: ConversationStatus | null
  payment_status?: string | null
  created_at?: string | null
  updated_at?: string | null
  client_applications?: {
    id?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
    support_topic?: string | null
    topic?: string | null
  } | null
}

type BookingRow = {
  id: string
  expert_id: string | null
  client_id?: string | null
  conversation_id?: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  status: BookingStatus | null
  created_at?: string | null
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

function getClientApplicationId(conversation: ConversationRow) {
  return (
    toText(conversation.client_application_id) ||
    toText(conversation.client_id) ||
    toText(conversation.client_applications?.id) ||
    null
  )
}

function buildClientItem(conversation: ConversationRow, allBookings: BookingRow[]): ClientItem {
  const clientApplicationId = getClientApplicationId(conversation)
  const relatedBookings = allBookings.filter((booking) => {
    if (booking.conversation_id && booking.conversation_id === conversation.id) return true
    if (clientApplicationId && booking.client_id === clientApplicationId) return true
    return false
  })

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
    name: toText(conversation.client_applications?.name) || 'Danışan',
    email: toText(conversation.client_applications?.email) || null,
    phone: toText(conversation.client_applications?.phone) || null,
    topic:
      toText(conversation.client_applications?.support_topic) ||
      toText(conversation.client_applications?.topic) ||
      '-',
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

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const requestedExpertId = req.nextUrl.searchParams.get('expertId')
    const envExpertId = process.env.MINDORA_DEV_EXPERT_ID || null
    const expertId = requestedExpertId || envExpertId

    if (expertId && !isValidUuid(expertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    let conversationsQuery = supabase
      .from('conversations' as never)
      .select(
        `
        id,
        expert_id,
        client_id,
        client_application_id,
        status,
        payment_status,
        created_at,
        updated_at,
        client_applications(id, name, email, phone, support_topic, topic)
        `
      )
      .order('updated_at', { ascending: false })
      .limit(250)

    let bookingsQuery = supabase
      .from('bookings' as never)
      .select(
        'id, expert_id, client_id, conversation_id, scheduled_start_at, scheduled_end_at, status, created_at'
      )
      .order('scheduled_start_at', { ascending: false })
      .limit(500)

    if (expertId) {
      conversationsQuery = conversationsQuery.eq('expert_id', expertId as never)
      bookingsQuery = bookingsQuery.eq('expert_id', expertId as never)
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
          error: firstError.message || 'Danışan verileri alınamadı.',
        },
        { status: 500 }
      )
    }

    const conversations = (conversationsResult.data || []) as ConversationRow[]
    const bookings = (bookingsResult.data || []) as BookingRow[]

    const clients = conversations
      .map((conversation) => buildClientItem(conversation, bookings))
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
