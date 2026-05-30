import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type ReminderType = '24h' | '1h' | '15m'

type ReminderWindow = {
  type: ReminderType
  label: string
  subject: string
  minMinutesUntilStart: number
  maxMinutesUntilStart: number
  sentColumn:
    | 'reminder_24h_sent_at'
    | 'reminder_1h_sent_at'
    | 'reminder_15m_sent_at'
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
  reminder_24h_sent_at?: string | null
  reminder_1h_sent_at?: string | null
  reminder_15m_sent_at?: string | null
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
  name: string | null
  email: string | null
}

type ExpertRow = {
  id: string
  name: string | null
  email: string | null
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
    label: '24 saat',
    subject: 'Mindora görüşmeniz yarın',
    minMinutesUntilStart: 23 * 60,
    maxMinutesUntilStart: 25 * 60,
    sentColumn: 'reminder_24h_sent_at',
  },
  {
    type: '1h',
    label: '1 saat',
    subject: 'Mindora görüşmeniz 1 saat sonra',
    minMinutesUntilStart: 45,
    maxMinutesUntilStart: 75,
    sentColumn: 'reminder_1h_sent_at',
  },
  {
    type: '15m',
    label: '15 dakika',
    subject: 'Mindora görüşmeniz 15 dakika sonra',
    minMinutesUntilStart: 10,
    maxMinutesUntilStart: 20,
    sentColumn: 'reminder_15m_sent_at',
  },
]

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

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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

function getTransporter() {
  const host = toText(process.env.SMTP_HOST)
  const port = Number(process.env.SMTP_PORT || 587)
  const user = toText(process.env.SMTP_USER)
  const pass = toText(process.env.SMTP_PASS)

  if (!host || !user || !pass) throw new Error('SMTP_MISSING')
  if (!Number.isFinite(port) || port <= 0) throw new Error('SMTP_PORT_INVALID')

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

function getFromAddress() {
  const from = toText(process.env.SMTP_FROM) || toText(process.env.SMTP_USER)

  if (!from) throw new Error('SMTP_FROM_MISSING')

  return from
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

function formatSessionDate(value: string, timezone = DEFAULT_TIMEZONE) {
  try {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '-'

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(date)
  } catch {
    return '-'
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

function createReminderText({
  name,
  reminder,
  startAt,
  endAt,
  timezone,
  joinUrl,
}: {
  name: string
  reminder: ReminderWindow
  startAt: string
  endAt: string
  timezone: string
  joinUrl: string
}) {
  return [
    `Merhaba ${name},`,
    '',
    `Mindora görüşmeniz ${reminder.label} sonra başlayacaktır.`,
    '',
    `Başlangıç: ${formatSessionDate(startAt, timezone)}`,
    `Bitiş: ${formatSessionDate(endAt, timezone)}`,
    '',
    `Güvenli görüşmeye katıl: ${joinUrl}`,
    '',
    'Bu link kişiye özeldir. Güvenliğin için başka kişilerle paylaşma.',
    '',
    'Mindora',
  ].join('\n')
}

function createReminderHtml({
  name,
  reminder,
  startAt,
  endAt,
  timezone,
  joinUrl,
}: {
  name: string
  reminder: ReminderWindow
  startAt: string
  endAt: string
  timezone: string
  joinUrl: string
}) {
  const safeName = escapeHtml(name)
  const safeLabel = escapeHtml(reminder.label)
  const safeJoinUrl = escapeHtml(joinUrl)
  const safeStartAt = escapeHtml(formatSessionDate(startAt, timezone))
  const safeEndAt = escapeHtml(formatSessionDate(endAt, timezone))
  const safeTimezone = escapeHtml(timezone || DEFAULT_TIMEZONE)

  return `
    <div style="font-family:Arial,sans-serif;background:#f7f3ee;padding:32px;color:#2b2118;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px;border:1px solid #e5d9cc;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8a7662;font-weight:700;">
          Mindora Reminder
        </p>

        <h1 style="margin:8px 0 12px;font-size:26px;line-height:1.25;color:#2b2118;">
          Görüşmeniz ${safeLabel} sonra
        </h1>

        <p style="font-size:15px;line-height:1.7;color:#6b5c4d;">
          Merhaba ${safeName}, Mindora görüşmeniz için hatırlatma gönderiyoruz.
        </p>

        <div style="margin:22px 0;padding:18px;border-radius:18px;background:#faf7f2;border:1px solid #eee2d4;">
          <p style="margin:0 0 8px;font-size:14px;"><b>Başlangıç:</b> ${safeStartAt}</p>
          <p style="margin:0 0 8px;font-size:14px;"><b>Bitiş:</b> ${safeEndAt}</p>
          <p style="margin:0;font-size:13px;color:#8a7662;"><b>Saat dilimi:</b> ${safeTimezone}</p>
        </div>

        <a href="${safeJoinUrl}" style="display:block;text-align:center;background:#2b2118;color:#ffffff;text-decoration:none;padding:16px 22px;border-radius:18px;font-weight:800;">
          Güvenli Görüşmeye Katıl
        </a>

        <p style="margin-top:18px;font-size:12px;line-height:1.6;color:#8a7662;word-break:break-all;">
          Link açılmazsa bu adresi tarayıcına yapıştırabilirsin:<br />
          ${safeJoinUrl}
        </p>

        <p style="margin-top:22px;font-size:12px;line-height:1.6;color:#8a7662;">
          Bu link kişiye özeldir. Güvenliğin için başka kişilerle paylaşma.
        </p>
      </div>
    </div>
  `
}

async function getReminderCandidates() {
  const now = new Date()
  const maxWindow = new Date(now)
  maxWindow.setHours(maxWindow.getHours() + 25)

  const minWindow = new Date(now)
  minWindow.setMinutes(minWindow.getMinutes() + 5)

  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
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
      reminder_1h_sent_at,
      reminder_15m_sent_at
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

  const supabase = getSupabaseAdmin()

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

  const clientApplicationId = toText(conversation.client_application_id)
  const expertId = toText(conversation.expert_id || booking.expert_id)

  let client: ClientApplicationRow | null = null
  let expert: ExpertRow | null = null

  if (clientApplicationId && isValidUuid(clientApplicationId)) {
    const { data, error } = await supabase
      .from('client_applications')
      .select('id, name, email')
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
      .select('id, name, email')
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
    clientName: toText(client?.name) || 'Danışan',
    clientEmail: toText(client?.email),
    expertName: toText(expert?.name) || 'Uzman',
    expertEmail: toText(expert?.email),
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
  const supabase = getSupabaseAdmin()

  const { error } = await (supabase as any)
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
  transporter,
  from,
}: {
  req: NextRequest
  booking: BookingRow
  reminder: ReminderWindow
  transporter: nodemailer.Transporter
  from: string
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
  const clientJoinUrl = normalizeJoinUrl(booking.client_join_url, req)
  const expertJoinUrl = normalizeJoinUrl(booking.expert_join_url, req)

  await Promise.all([
    transporter.sendMail({
      from,
      to: clientEmail,
      subject: reminder.subject,
      text: createReminderText({
        name: clientName,
        reminder,
        startAt: booking.scheduled_start_at,
        endAt: booking.scheduled_end_at,
        timezone,
        joinUrl: clientJoinUrl,
      }),
      html: createReminderHtml({
        name: clientName,
        reminder,
        startAt: booking.scheduled_start_at,
        endAt: booking.scheduled_end_at,
        timezone,
        joinUrl: clientJoinUrl,
      }),
    }),
    transporter.sendMail({
      from,
      to: expertEmail,
      subject: reminder.subject,
      text: createReminderText({
        name: expertName,
        reminder,
        startAt: booking.scheduled_start_at,
        endAt: booking.scheduled_end_at,
        timezone,
        joinUrl: expertJoinUrl,
      }),
      html: createReminderHtml({
        name: expertName,
        reminder,
        startAt: booking.scheduled_start_at,
        endAt: booking.scheduled_end_at,
        timezone,
        joinUrl: expertJoinUrl,
      }),
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
  const transporter = getTransporter()
  const from = getFromAddress()
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
        transporter,
        from,
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
        { ok: false, error: 'Unauthorized cron request.' },
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
