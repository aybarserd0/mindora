import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMail } from '@/lib/mail/smtp'
import { reviewRequestClientTemplate } from '@/lib/mail/templates'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SupabaseAdminClient = ReturnType<typeof createClient<any>>

type BookingRow = {
  id: string
  conversation_id: string | null
  expert_id: string | null
  client_id: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  timezone: string | null
  status: string | null
  review_email_sent_at: string | null
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

type ReviewReminderResult = {
  bookingId: string
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
  clientEmail?: string
  expertName?: string
}

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const MAX_BOOKINGS_PER_RUN = 50
const MIN_HOURS_AFTER_SESSION_END = 2
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value)
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function normalizeStatus(value: unknown) {
  return toText(value).toLowerCase()
}

function isCompletedBookingStatus(value: unknown) {
  return ['completed', 'done', 'finished'].includes(normalizeStatus(value))
}

function getSupabaseAdmin(): SupabaseAdminClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_CONFIG_MISSING')
  }

  return createClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getPublicBaseUrl(req: NextRequest) {
  return (
    toText(process.env.NEXT_PUBLIC_APP_URL) ||
    toText(process.env.NEXT_PUBLIC_SITE_URL) ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  ).replace(/\/$/, '')
}

function buildReviewUrl({
  req,
  bookingId,
}: {
  req: NextRequest
  bookingId: string
}) {
  const baseUrl = getPublicBaseUrl(req)
  return `${baseUrl}/review/${encodeURIComponent(bookingId)}`
}

function formatSessionDate(value: string | null, timezone = DEFAULT_TIMEZONE) {
  if (!value) return 'Belirtilmedi'

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

async function getReviewReminderCandidates(supabase: SupabaseAdminClient) {
  const endedBefore = new Date()
  endedBefore.setHours(endedBefore.getHours() - MIN_HOURS_AFTER_SESSION_END)

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
      review_email_sent_at
      `
    )
    .in('status', ['completed', 'done', 'finished'])
    .is('review_email_sent_at', null)
    .not('scheduled_end_at', 'is', null)
    .lte('scheduled_end_at', endedBefore.toISOString())
    .order('scheduled_end_at', { ascending: true })
    .limit(MAX_BOOKINGS_PER_RUN)

  if (error) {
    console.error('REVIEW_REMINDERS_BOOKINGS_QUERY_ERROR', error)
    throw new Error('REVIEW_REMINDER_QUERY_FAILED')
  }

  return (data || []) as BookingRow[]
}

async function hasExistingReview({
  supabase,
  booking,
}: {
  supabase: SupabaseAdminClient
  booking: BookingRow
}) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', booking.id)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('REVIEW_REMINDERS_EXISTING_REVIEW_QUERY_ERROR', {
      bookingId: booking.id,
      error,
    })

    throw new Error('EXISTING_REVIEW_QUERY_FAILED')
  }

  return Boolean((data as { id?: string } | null)?.id)
}

async function claimBookingForReviewEmail({
  supabase,
  bookingId,
  claimedAt,
}: {
  supabase: SupabaseAdminClient
  bookingId: string
  claimedAt: string
}) {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({
      review_email_sent_at: claimedAt,
      updated_at: claimedAt,
    })
    .eq('id', bookingId)
    .is('review_email_sent_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('REVIEW_REMINDER_CLAIM_ERROR', {
      bookingId,
      error,
    })

    throw new Error('REVIEW_REMINDER_CLAIM_FAILED')
  }

  return Boolean((data as { id?: string } | null)?.id)
}

async function rollbackReviewEmailClaim({
  supabase,
  bookingId,
}: {
  supabase: SupabaseAdminClient
  bookingId: string
}) {
  const rollbackAt = new Date().toISOString()

  const { error } = await supabase
    .from('session_bookings')
    .update({
      review_email_sent_at: null,
      updated_at: rollbackAt,
    })
    .eq('id', bookingId)

  if (error) {
    console.error('REVIEW_REMINDER_ROLLBACK_ERROR', {
      bookingId,
      error,
    })
  }
}

async function getConversationContact({
  supabase,
  booking,
}: {
  supabase: SupabaseAdminClient
  booking: BookingRow
}) {
  if (!booking.conversation_id || !isValidUuid(booking.conversation_id)) {
    return null
  }

  const { data: conversationData, error: conversationError } = await supabase
    .from('conversations')
    .select('id, client_application_id, expert_id')
    .eq('id', booking.conversation_id)
    .maybeSingle()

  if (conversationError) {
    console.error('REVIEW_REMINDERS_CONVERSATION_QUERY_ERROR', {
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
      console.error('REVIEW_REMINDERS_CLIENT_QUERY_ERROR', {
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
      console.error('REVIEW_REMINDERS_EXPERT_QUERY_ERROR', {
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
    expertName: toText(expert?.full_name || expert?.name || expert?.title) || 'Mindora uzmanı',
    expertEmail: toText(expert?.email || expert?.expert_email),
  }
}

async function sendReviewReminderForBooking({
  req,
  supabase,
  booking,
}: {
  req: NextRequest
  supabase: SupabaseAdminClient
  booking: BookingRow
}): Promise<ReviewReminderResult> {
  if (!isCompletedBookingStatus(booking.status)) {
    return {
      bookingId: booking.id,
      status: 'skipped',
      reason: 'booking_not_completed',
    }
  }

  if (!booking.scheduled_end_at) {
    return {
      bookingId: booking.id,
      status: 'skipped',
      reason: 'missing_scheduled_end_at',
    }
  }

  const reviewExists = await hasExistingReview({ supabase, booking })

  if (reviewExists) {
    return {
      bookingId: booking.id,
      status: 'skipped',
      reason: 'review_already_exists',
    }
  }

  const contact = await getConversationContact({ supabase, booking })

  if (!contact) {
    return {
      bookingId: booking.id,
      status: 'skipped',
      reason: 'missing_conversation_contact',
    }
  }

  const { clientName, clientEmail, expertName } = contact

  if (!clientEmail) {
    return {
      bookingId: booking.id,
      status: 'skipped',
      reason: 'missing_client_email',
      expertName,
    }
  }

  if (!isValidEmail(clientEmail)) {
    return {
      bookingId: booking.id,
      status: 'skipped',
      reason: 'invalid_client_email',
      clientEmail,
      expertName,
    }
  }

  const claimedAt = new Date().toISOString()
  const claimed = await claimBookingForReviewEmail({
    supabase,
    bookingId: booking.id,
    claimedAt,
  })

  if (!claimed) {
    return {
      bookingId: booking.id,
      status: 'skipped',
      reason: 'already_claimed_or_sent',
      clientEmail,
      expertName,
    }
  }

  try {
    const reviewUrl = buildReviewUrl({
      req,
      bookingId: booking.id,
    })

    const sessionDateText = formatSessionDate(
      booking.scheduled_start_at || booking.scheduled_end_at,
      booking.timezone || DEFAULT_TIMEZONE
    )

    const text = `${reviewRequestClientTemplate({
      clientName,
      expertName,
      reviewUrl,
    })}

Seans tarihi:
${sessionDateText}
`

    await sendMail({
      to: clientEmail,
      subject: 'Mindora seansınızı değerlendirir misiniz?',
      text,
    })

    return {
      bookingId: booking.id,
      status: 'sent',
      clientEmail,
      expertName,
    }
  } catch (error) {
    await rollbackReviewEmailClaim({
      supabase,
      bookingId: booking.id,
    })

    throw error
  }
}

async function runReviewReminders(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const bookings = await getReviewReminderCandidates(supabase)

  const results: ReviewReminderResult[] = []

  for (const booking of bookings) {
    try {
      const result = await sendReviewReminderForBooking({
        req,
        supabase,
        booking,
      })

      results.push(result)
    } catch (error) {
      console.error('REVIEW_REMINDER_SEND_ERROR', {
        bookingId: booking.id,
        error,
      })

      results.push({
        bookingId: booking.id,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'unknown_review_reminder_error',
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

    const result = await runReviewReminders(req)

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    console.error('REVIEW_REMINDERS_CRON_ERROR', error)

    const message =
      error instanceof Error && error.message === 'SUPABASE_CONFIG_MISSING'
        ? 'Supabase sunucu ayarları eksik.'
        : error instanceof Error && error.message === 'REVIEW_REMINDER_QUERY_FAILED'
          ? 'Review reminder adayları alınamadı.'
          : 'Review reminder cron çalıştırılamadı.'

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
