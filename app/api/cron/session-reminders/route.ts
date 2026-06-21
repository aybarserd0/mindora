import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mail/smtp'
import {
  sessionReminderClientTemplate,
  sessionReminderExpertTemplate,
} from '@/lib/mail/templates'

type ReminderType = '24h' | '1h'

type ReminderWindow = {
  type: ReminderType
  label: string
  subject: string
  minMinutesUntilStart: number
  maxMinutesUntilStart: number
  sentColumn: 'reminder_24h_sent_at' | 'reminder_1h_sent_at'
}

type BookingRow = {
  id: string
  conversation_id: string | null
  expert_id: string | null
  client_id: string | null
  scheduled_start_at: string
  scheduled_end_at: string
  timezone: string | null
  status: string
  session_ready: boolean | null
  client_join_url: string | null
  expert_join_url: string | null
  client_chat_url?: string | null
  expert_chat_url?: string | null
  reminder_24h_sent_at?: string | null
  reminder_1h_sent_at?: string | null
}

type ConversationContact = {
  clientName: string
  clientEmail: string
  expertName: string
  expertEmail: string
}

type ConversationRow = {
  id: string
  client_application_id: string | null
  expert_id: string | null
}

type ClientApplicationRow = {
  id: string
  name?: string | null
  full_name?: string | null
  email?: string | null
  client_email?: string | null
}

type ExpertRow = {
  id: string
  name?: string | null
  full_name?: string | null
  title?: string | null
  email?: string | null
  expert_email?: string | null
}

type ReminderResult = {
  bookingId: string
  reminderType: ReminderType
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
  clientEmail?: string
  expertEmail?: string
}

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const MAX_BOOKINGS_PER_RUN = 50
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const REMINDER_WINDOWS: ReminderWindow[] = [
  {
    type: '24h',
    label: '24 saat içinde',
    subject: 'Mindora seansınız yarın',
    minMinutesUntilStart: 23 * 60,
    maxMinutesUntilStart: 25 * 60,
    sentColumn: 'reminder_24h_sent_at',
  },
  {
    type: '1h',
    label: '1 saat içinde',
    subject: 'Mindora seansınız 1 saat sonra',
    minMinutesUntilStart: 45,
    maxMinutesUntilStart: 75,
    sentColumn: 'reminder_1h_sent_at',
  },
]

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value)
}

function isAuthorizedCronRequest(req: NextRequest) {
  const secret = toText(process.env.CRON_SECRET)

  if (!secret) return true

  const authHeader = toText(req.headers.get('authorization'))
  const cronHeader = toText(req.headers.get('x-cron-secret'))
  const querySecret = toText(req.nextUrl.searchParams.get('secret'))

  return (
    authHeader === `Bearer ${secret}` ||
    cronHeader === secret ||
    querySecret === secret
  )
}

function getPublicBaseUrl(req: NextRequest) {
  return (
    toText(process.env.NEXT_PUBLIC_APP_URL) ||
    toText(process.env.NEXT_PUBLIC_SITE_URL) ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  ).replace(/\/$/, '')
}

function normalizeJoinUrl(url: string, req: NextRequest) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const baseUrl = getPublicBaseUrl(req)
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
}

function buildChatUrl({
  req,
  type,
  conversationId,
}: {
  req: NextRequest
  type: 'client' | 'expert'
  conversationId: string | null
}) {
  if (!conversationId) return ''

  const baseUrl = getPublicBaseUrl(req)
  return `${baseUrl}/${type}/chat/${encodeURIComponent(conversationId)}`
}

function formatSessionDate(value: string, timezone = DEFAULT_TIMEZONE) {
  try {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return 'Belirtilmedi'

    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || DEFAULT_TIMEZONE,
    }).format(date)
  } catch {
    return 'Belirtilmedi'
  }
}

function minutesUntil(dateValue: string, now = new Date()) {
  const target = new Date(dateValue)

  if (Number.isNaN(target.getTime())) return null

  return Math.floor((target.getTime() - now.getTime()) / 1000 / 60)
}

function getReminderForBooking(booking: BookingRow, now = new Date()) {
  const minutes = minutesUntil(booking.scheduled_start_at, now)

  if (minutes === null) return null

  return (
    REMINDER_WINDOWS.find((window) => {
      const alreadySent = Boolean(booking[window.sentColumn])

      return (
        !alreadySent &&
        minutes >= window.minMinutesUntilStart &&
        minutes <= window.maxMinutesUntilStart
      )
    }) || null
  )
}

async function getReminderCandidates() {
  const now = new Date()

  const maxWindow = new Date(now)
  maxWindow.setHours(maxWindow.getHours() + 25)

  const minWindow = new Date(now)
  minWindow.setMinutes(minWindow.getMinutes() + 30)

  const supabase = getSupabaseAdmin() as any

  const { data, error } = await supabase
    .from('session_bookings')
    .select(
      `
      id,
      conversation_id,
      expert_id,
      client_id,
      scheduled_start_at,
      scheduled_end_at,
      timezone,
      status,
      session_ready,
      client_join_url,
      expert_join_url,
      reminder_24h_sent_at,
      reminder_1h_sent_at
      `
    )
    .in('status', ['scheduled', 'confirmed'])
    .eq('session_ready', true)
    .not('client_join_url', 'is', null)
    .not('expert_join_url', 'is', null)
    .gte('scheduled_start_at', minWindow.toISOString())
    .lte('scheduled_start_at', maxWindow.toISOString())
    .order('scheduled_start_at', { ascending: true })
    .limit(MAX_BOOKINGS_PER_RUN)

  if (error) {
    console.error('SESSION_REMINDERS_BOOKINGS_QUERY_ERROR', error)
    throw new Error('REMINDER_QUERY_FAILED')
  }

  return (data || []) as BookingRow[]
}

async function getConversationContact(booking: BookingRow): Promise<ConversationContact | null> {
  if (!booking.conversation_id || !isValidUuid(booking.conversation_id)) {
    return null
  }

  const supabase = getSupabaseAdmin() as any

  const { data: conversationData, error: conversationError } = await supabase
    .from('conversations')
    .select('id, client_application_id, expert_id')
    .eq('id', booking.conversation_id)
    .maybeSingle()

  if (conversationError) {
    console.error('SESSION_REMINDERS_CONVERSATION_QUERY_ERROR', {
      bookingId: booking.id,
      conversationId: booking.conversation_id,
      error: conversationError,
    })

    throw new Error('CONVERSATION_QUERY_FAILED')
  }

  const conversation = conversationData as ConversationRow | null

  if (!conversation) return null

  const clientApplicationId = toText(conversation.client_application_id || booking.client_id)
  const expertId = toText(conversation.expert_id || booking.expert_id)

  let client: ClientApplicationRow | null = null
  let expert: ExpertRow | null = null

  if (clientApplicationId && isValidUuid(clientApplicationId)) {
    const { data, error } = await supabase
      .from('client_applications')
      .select('id, name, full_name, email, client_email')
      .eq('id', clientApplicationId)
      .maybeSingle()

    if (error) {
      console.error('SESSION_REMINDERS_CLIENT_QUERY_ERROR', {
        bookingId: booking.id,
        clientApplicationId,
        error,
      })
    } else {
      client = data as ClientApplicationRow | null
    }
  }

  if (expertId && isValidUuid(expertId)) {
    const { data, error } = await supabase
      .from('experts')
      .select('id, name, full_name, title, email, expert_email')
      .eq('id', expertId)
      .maybeSingle()

    if (error) {
      console.error('SESSION_REMINDERS_EXPERT_QUERY_ERROR', {
        bookingId: booking.id,
        expertId,
        error,
      })
    } else {
      expert = data as ExpertRow | null
    }
  }

  return {
    clientName: toText(client?.full_name || client?.name) || 'Danışan',
    clientEmail: toText(client?.email || client?.client_email),
    expertName: toText(expert?.full_name || expert?.name || expert?.title) || 'Uzman',
    expertEmail: toText(expert?.email || expert?.expert_email),
  }
}

async function markReminderSent({
  bookingId,
  reminder,
  sentAt,
}: {
  bookingId: string
  reminder: ReminderWindow
  sentAt: string
}) {
  const supabase = getSupabaseAdmin() as any

  const { error } = await supabase
    .from('session_bookings')
    .update({
      [reminder.sentColumn]: sentAt,
      updated_at: sentAt,
    })
    .eq('id', bookingId)
    .is(reminder.sentColumn, null)

  if (error) {
    console.error('SESSION_REMINDER_MARK_SENT_ERROR', {
      bookingId,
      reminderType: reminder.type,
      error,
    })

    throw new Error('REMINDER_MARK_FAILED')
  }
}

async function sendReminderForBooking({
  req,
  booking,
  reminder,
}: {
  req: NextRequest
  booking: BookingRow
  reminder: ReminderWindow
}): Promise<ReminderResult> {
  const contact = await getConversationContact(booking)

  if (!contact) {
    return {
      bookingId: booking.id,
      reminderType: reminder.type,
      status: 'skipped',
      reason: 'missing_conversation_contact',
    }
  }

  const { clientName, clientEmail, expertName, expertEmail } = contact

  if (!clientEmail || !expertEmail) {
    return {
      bookingId: booking.id,
      reminderType: reminder.type,
      status: 'skipped',
      reason: 'missing_email',
      clientEmail,
      expertEmail,
    }
  }

  if (!isValidEmail(clientEmail) || !isValidEmail(expertEmail)) {
    return {
      bookingId: booking.id,
      reminderType: reminder.type,
      status: 'skipped',
      reason: 'invalid_email',
      clientEmail,
      expertEmail,
    }
  }

  if (!booking.client_join_url || !booking.expert_join_url) {
    return {
      bookingId: booking.id,
      reminderType: reminder.type,
      status: 'skipped',
      reason: 'missing_join_url',
      clientEmail,
      expertEmail,
    }
  }

  const timezone = booking.timezone || DEFAULT_TIMEZONE
  const scheduledStartText = formatSessionDate(booking.scheduled_start_at, timezone)
  const clientJoinUrl = normalizeJoinUrl(booking.client_join_url, req)
  const expertJoinUrl = normalizeJoinUrl(booking.expert_join_url, req)
  const clientChatUrl = buildChatUrl({
    req,
    type: 'client',
    conversationId: booking.conversation_id,
  })
  const expertChatUrl = buildChatUrl({
    req,
    type: 'expert',
    conversationId: booking.conversation_id,
  })

  const clientText = sessionReminderClientTemplate({
    recipientName: clientName,
    otherPartyName: expertName,
    scheduledStartText,
    sessionUrl: clientJoinUrl,
    chatUrl: clientChatUrl,
    reminderLabel: reminder.label,
  })

  const expertText = sessionReminderExpertTemplate({
    recipientName: expertName,
    otherPartyName: clientName,
    scheduledStartText,
    sessionUrl: expertJoinUrl,
    chatUrl: expertChatUrl,
    reminderLabel: reminder.label,
  })

  await Promise.all([
    sendMail({
      to: clientEmail,
      subject: reminder.subject,
      text: clientText,
    }),
    sendMail({
      to: expertEmail,
      subject: reminder.subject,
      text: expertText,
    }),
  ])

  const sentAt = new Date().toISOString()

  await markReminderSent({
    bookingId: booking.id,
    reminder,
    sentAt,
  })

  return {
    bookingId: booking.id,
    reminderType: reminder.type,
    status: 'sent',
    clientEmail,
    expertEmail,
  }
}

async function runSessionReminders(req: NextRequest) {
  const bookings = await getReminderCandidates()
  const now = new Date()

  const results: ReminderResult[] = []

  for (const booking of bookings) {
    const reminder = getReminderForBooking(booking, now)

    if (!reminder) {
      results.push({
        bookingId: booking.id,
        reminderType: '24h',
        status: 'skipped',
        reason: 'outside_reminder_window_or_already_sent',
      })
      continue
    }

    try {
      const result = await sendReminderForBooking({
        req,
        booking,
        reminder,
      })

      results.push(result)
    } catch (error) {
      console.error('SESSION_REMINDER_SEND_ERROR', {
        bookingId: booking.id,
        reminderType: reminder.type,
        error,
      })

      results.push({
        bookingId: booking.id,
        reminderType: reminder.type,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'unknown_send_error',
      })
    }
  }

  return {
    checked: bookings.length,
    sent: results.filter((item) => item.status === 'sent').length,
    skipped: results.filter((item) => item.status === 'skipped').length,
    failed: results.filter((item) => item.status === 'failed').length,
    results,
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Yetkisiz cron isteği.' },
        { status: 401 }
      )
    }

    const result = await runSessionReminders(req)

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    console.error('SESSION_REMINDERS_CRON_ERROR', error)

    const message =
      error instanceof Error && error.message === 'SMTP_MISSING'
        ? 'SMTP ayarları eksik.'
        : error instanceof Error && error.message === 'SMTP_PORT_INVALID'
          ? 'SMTP_PORT geçersiz.'
          : error instanceof Error && error.message === 'SMTP_FROM_MISSING'
            ? 'SMTP gönderici adresi eksik.'
            : error instanceof Error && error.message === 'REMINDER_QUERY_FAILED'
              ? 'Reminder adayları alınamadı.'
              : 'Session reminder cron çalıştırılamadı.'

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
