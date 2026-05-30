import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type BookingRow = {
  id: string
  conversation_id: string | null
  expert_id: string
  client_id: string | null
  scheduled_start_at: string
  scheduled_end_at: string
  timezone: string | null
  status: string
  session_ready: boolean | null
  client_join_url: string | null
  expert_join_url: string | null
  admin_join_url?: string | null
  live_session_id?: string | null
}

type ConversationRow = {
  id: string
  client_application_id: string | null
  expert_id: string | null
  client_applications?: {
    name?: string | null
    email?: string | null
  } | null
  experts?: {
    name?: string | null
    email?: string | null
  } | null
}

type SendLinksResponse = {
  ok: boolean
  sent?: {
    client: string
    expert: string
  }
  booking?: {
    id: string
    status: string
    sessionReady: boolean
  }
  debug?: {
    bookingId?: string
    path?: string
  }
  error?: string
}

type RouteParams = {
  id?: string
  bookingId?: string
}

type RouteContext = {
  params?: RouteParams | Promise<RouteParams>
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i

const DEFAULT_TIMEZONE = 'Europe/Istanbul'

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
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

function getTransporter() {
  const host = toText(process.env.SMTP_HOST)
  const port = Number(process.env.SMTP_PORT || 587)
  const user = toText(process.env.SMTP_USER)
  const pass = toText(process.env.SMTP_PASS)

  if (!host || !user || !pass) {
    throw new Error('SMTP environment variables are missing.')
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('SMTP_PORT is invalid.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

function getFromAddress() {
  const from = toText(process.env.SMTP_FROM) || toText(process.env.SMTP_USER)

  if (!from) {
    throw new Error('SMTP_FROM or SMTP_USER is required.')
  }

  return from
}

function createMailText({
  name,
  role,
  startAt,
  endAt,
  timezone,
  joinUrl,
}: {
  name: string
  role: 'danışan' | 'uzman'
  startAt: string
  endAt: string
  timezone: string
  joinUrl: string
}) {
  return [
    `Merhaba ${name || role},`,
    '',
    'Mindora görüşme linkin hazır.',
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

function createMailHtml({
  name,
  role,
  startAt,
  endAt,
  timezone,
  joinUrl,
}: {
  name: string
  role: 'danışan' | 'uzman'
  startAt: string
  endAt: string
  timezone: string
  joinUrl: string
}) {
  const safeName = escapeHtml(name || role)
  const safeJoinUrl = escapeHtml(joinUrl)
  const safeStartAt = escapeHtml(formatSessionDate(startAt, timezone))
  const safeEndAt = escapeHtml(formatSessionDate(endAt, timezone))
  const safeTimezone = escapeHtml(timezone || DEFAULT_TIMEZONE)

  return `
    <div style="font-family:Arial,sans-serif;background:#f7f3ee;padding:32px;color:#2b2118;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px;border:1px solid #e5d9cc;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8a7662;font-weight:700;">
          Mindora Secure Session
        </p>

        <h1 style="margin:8px 0 12px;font-size:26px;line-height:1.25;color:#2b2118;">
          Görüşme linkin hazır
        </h1>

        <p style="font-size:15px;line-height:1.7;color:#6b5c4d;">
          Merhaba ${safeName}, Mindora görüşmen güvenli bağlantı ile hazırlandı.
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

function getPublicBaseUrl(req: NextRequest) {
  return (
    toText(process.env.NEXT_PUBLIC_APP_URL) ||
    toText(process.env.NEXT_PUBLIC_SITE_URL) ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  ).replace(/\/$/, '')
}

function normalizeJoinUrl(url: string, req: NextRequest) {
  const cleanUrl = toText(url)

  if (!cleanUrl) return ''

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl
  }

  const baseUrl = getPublicBaseUrl(req)
  return `${baseUrl}${cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`}`
}

async function readJsonBody(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function getUuidFromPath(req: NextRequest) {
  const segments = req.nextUrl.pathname.split('/').filter(Boolean)

  for (const segment of segments) {
    const decoded = decodeURIComponent(segment)

    if (isValidUuid(decoded)) {
      return decoded
    }
  }

  return ''
}

async function getBookingIdFromRequest(req: NextRequest, context: RouteContext) {
  const resolvedParams = await Promise.resolve(context.params || {})
  const body = await readJsonBody(req)

  const candidates = [
    toText(resolvedParams.id),
    toText(resolvedParams.bookingId),
    toText(body.bookingId),
    toText(body.id),
    toText(req.nextUrl.searchParams.get('bookingId')),
    getUuidFromPath(req),
  ]

  return candidates.find((candidate) => isValidUuid(candidate)) || ''
}

async function getBooking(bookingId: string) {
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
      admin_join_url,
      live_session_id
      `
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error) {
    console.error('SEND_LINKS_BOOKING_QUERY_ERROR', error)
    throw new Error('Randevu alınamadı.')
  }

  return data as BookingRow | null
}

async function getConversation(conversationId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `
      id,
      client_application_id,
      expert_id,
      client_applications (
        name,
        email
      ),
      experts (
        name,
        email
      )
      `
    )
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    console.error('SEND_LINKS_CONVERSATION_QUERY_ERROR', error)
    throw new Error('Konuşma bilgileri alınamadı.')
  }

  return data as unknown as ConversationRow | null
}

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<SendLinksResponse>> {
  const bookingId = await getBookingIdFromRequest(req, context)

  try {
    if (!isValidUuid(bookingId)) {
      console.warn('SEND_LINKS_INVALID_BOOKING_ID', {
        bookingId,
        path: req.nextUrl.pathname,
        search: req.nextUrl.search,
      })

      return NextResponse.json(
        {
          ok: false,
          error: 'Geçerli booking id gerekli.',
          debug: {
            bookingId: bookingId || undefined,
            path: req.nextUrl.pathname,
          },
        },
        { status: 400 }
      )
    }

    const booking = await getBooking(bookingId)

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: 'Randevu bulunamadı.' },
        { status: 404 }
      )
    }

    if (!booking.conversation_id || !isValidUuid(booking.conversation_id)) {
      return NextResponse.json(
        { ok: false, error: 'Bu randevu geçerli bir konuşmaya bağlı değil.' },
        { status: 400 }
      )
    }

    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      return NextResponse.json(
        {
          ok: false,
          error: 'İptal edilmiş veya kapalı randevu için link gönderilemez.',
        },
        { status: 409 }
      )
    }

    if (
      !booking.session_ready ||
      !booking.client_join_url ||
      !booking.expert_join_url
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Görüşme linkleri hazır değil. Önce Görüşmeye Hazırla adımını çalıştır.',
        },
        { status: 409 }
      )
    }

    const conversation = await getConversation(booking.conversation_id)

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: 'Konuşma bulunamadı.' },
        { status: 404 }
      )
    }

    const clientEmail = toText(conversation.client_applications?.email)
    const expertEmail = toText(conversation.experts?.email)
    const clientName = toText(conversation.client_applications?.name) || 'Danışan'
    const expertName = toText(conversation.experts?.name) || 'Uzman'

    if (!clientEmail || !expertEmail) {
      return NextResponse.json(
        { ok: false, error: 'Danışan veya uzman e-posta adresi bulunamadı.' },
        { status: 400 }
      )
    }

    if (!isValidEmail(clientEmail) || !isValidEmail(expertEmail)) {
      return NextResponse.json(
        { ok: false, error: 'Danışan veya uzman e-posta adresi geçersiz.' },
        { status: 400 }
      )
    }

    const timezone = booking.timezone || DEFAULT_TIMEZONE
    const clientJoinUrl = normalizeJoinUrl(booking.client_join_url, req)
    const expertJoinUrl = normalizeJoinUrl(booking.expert_join_url, req)

    const transporter = getTransporter()
    const from = getFromAddress()

    await Promise.all([
      transporter.sendMail({
        from,
        to: clientEmail,
        subject: 'Mindora görüşme linkin hazır',
        text: createMailText({
          name: clientName,
          role: 'danışan',
          startAt: booking.scheduled_start_at,
          endAt: booking.scheduled_end_at,
          timezone,
          joinUrl: clientJoinUrl,
        }),
        html: createMailHtml({
          name: clientName,
          role: 'danışan',
          startAt: booking.scheduled_start_at,
          endAt: booking.scheduled_end_at,
          timezone,
          joinUrl: clientJoinUrl,
        }),
      }),
      transporter.sendMail({
        from,
        to: expertEmail,
        subject: 'Mindora uzman görüşme linkin hazır',
        text: createMailText({
          name: expertName,
          role: 'uzman',
          startAt: booking.scheduled_start_at,
          endAt: booking.scheduled_end_at,
          timezone,
          joinUrl: expertJoinUrl,
        }),
        html: createMailHtml({
          name: expertName,
          role: 'uzman',
          startAt: booking.scheduled_start_at,
          endAt: booking.scheduled_end_at,
          timezone,
          joinUrl: expertJoinUrl,
        }),
      }),
    ])

    return NextResponse.json({
      ok: true,
      sent: {
        client: clientEmail,
        expert: expertEmail,
      },
      booking: {
        id: booking.id,
        status: booking.status,
        sessionReady: Boolean(booking.session_ready),
      },
    })
  } catch (err) {
    console.error('SEND_BOOKING_LINKS_ERROR', {
      bookingId,
      error: err,
    })

    const message =
      err instanceof Error && err.message === 'SMTP environment variables are missing.'
        ? 'SMTP ayarları eksik. Vercel environment variables içinde SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve SMTP_FROM değerlerini kontrol et.'
        : err instanceof Error && err.message === 'SMTP_PORT is invalid.'
          ? 'SMTP_PORT geçersiz.'
          : err instanceof Error && err.message === 'SMTP_FROM or SMTP_USER is required.'
            ? 'SMTP gönderici adresi eksik.'
            : 'Görüşme linkleri gönderilemedi.'

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
