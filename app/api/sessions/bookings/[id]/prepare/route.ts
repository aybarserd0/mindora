import crypto from 'crypto'
import net from 'net'
import tls from 'tls'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type UserType = 'client' | 'expert' | 'admin'

type BookingStatus = 'pending' | 'scheduled' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'canceled' | 'no_show' | string

type BookingRow = {
  id: string
  conversation_id: string | null
  expert_id: string
  client_id: string | null
  scheduled_start_at: string
  scheduled_end_at: string
  status: BookingStatus
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

type PersonInfo = {
  name: string
  email: string | null
}

type PreparedLinks = {
  clientJoinUrl: string
  expertJoinUrl: string
  adminJoinUrl: string
  clientChatUrl: string
  expertChatUrl: string
  adminConversationUrl: string
}

type MailResult = {
  enabled: boolean
  clientSent: boolean
  expertSent: boolean
  errors: string[]
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

const TOKEN_TTL_HOURS = 24
const CLOSED_BOOKING_STATUSES = new Set(['cancelled', 'canceled', 'completed', 'no_show'])
const DEFAULT_BRAND_FROM = 'Mindora <noreply@mindora.live>'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function cleanText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback

  const text = String(value).trim()
  return text || fallback
}

function cleanNullableText(value: unknown) {
  const text = cleanText(value)
  return text || null
}

function getBaseUrl(req: NextRequest) {
  const configuredUrl = cleanNullableText(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL)
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  const forwardedProto = req.headers.get('x-forwarded-proto')
  const forwardedHost = req.headers.get('x-forwarded-host')

  if (forwardedHost) {
    return `${forwardedProto || 'https'}://${forwardedHost}`.replace(/\/$/, '')
  }

  const origin = req.headers.get('origin')
  if (origin) return origin.replace(/\/$/, '')

  const host = req.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'

  return host ? `${protocol}://${host}`.replace(/\/$/, '') : ''
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Belirtilmedi'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Belirtilmedi'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(date)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildLinks({
  baseUrl,
  booking,
  liveSessionId,
  clientToken,
  expertToken,
  adminToken,
}: {
  baseUrl: string
  booking: BookingRow
  liveSessionId: string
  clientToken: string
  expertToken: string
  adminToken: string
}): PreparedLinks {
  const conversationId = booking.conversation_id || ''
  const encodedConversationId = encodeURIComponent(conversationId)
  const encodedLiveSessionId = encodeURIComponent(liveSessionId)

  return {
    clientJoinUrl: `${baseUrl}/client/session/${encodedLiveSessionId}?token=${encodeURIComponent(clientToken)}`,
    expertJoinUrl: `${baseUrl}/expert/session/${encodedLiveSessionId}?token=${encodeURIComponent(expertToken)}`,
    adminJoinUrl: `${baseUrl}/admin/conversations/${encodedConversationId}?session=${encodedLiveSessionId}&token=${encodeURIComponent(adminToken)}`,
    clientChatUrl: `${baseUrl}/client/chat/${encodedConversationId}`,
    expertChatUrl: `${baseUrl}/expert/chat/${encodedConversationId}`,
    adminConversationUrl: `${baseUrl}/admin/conversations/${encodedConversationId}`,
  }
}

function getSmtpConfig(): SmtpConfig | null {
  const host = cleanNullableText(process.env.SMTP_HOST)
  const user = cleanNullableText(process.env.SMTP_USER)
  const pass = cleanNullableText(process.env.SMTP_PASS)
  const from = cleanNullableText(process.env.SMTP_FROM || process.env.MAIL_FROM) || DEFAULT_BRAND_FROM
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465

  if (!host || !user || !pass || !Number.isFinite(port)) return null

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  }
}

function createEmailBody({
  role,
  recipientName,
  otherName,
  scheduledStartAt,
  scheduledEndAt,
  chatUrl,
  sessionUrl,
}: {
  role: 'client' | 'expert'
  recipientName: string
  otherName: string
  scheduledStartAt: string
  scheduledEndAt: string
  chatUrl: string
  sessionUrl: string
}) {
  const safeRecipientName = escapeHtml(recipientName)
  const safeOtherName = escapeHtml(otherName)
  const start = escapeHtml(formatDateTime(scheduledStartAt))
  const end = escapeHtml(formatDateTime(scheduledEndAt))
  const roleText = role === 'client' ? 'danışan' : 'uzman'
  const counterpartLabel = role === 'client' ? 'Uzman' : 'Danışan'

  const text = [
    `Merhaba ${recipientName},`,
    '',
    `Mindora seansınız hazırlanmıştır.`,
    `${counterpartLabel}: ${otherName}`,
    `Başlangıç: ${formatDateTime(scheduledStartAt)}`,
    `Bitiş: ${formatDateTime(scheduledEndAt)}`,
    '',
    `Chat linki: ${chatUrl}`,
    `Görüşme linki: ${sessionUrl}`,
    '',
    'Görüşme başlamadan önce kamera ve mikrofon izinlerinizi kontrol etmenizi öneririz.',
    '',
    'Mindora',
  ].join('\n')

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <div style="padding:28px;background:linear-gradient(135deg,#eef2ff,#ffffff);border-bottom:1px solid #e2e8f0;">
            <p style="margin:0 0 8px 0;color:#4f46e5;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">Mindora</p>
            <h1 style="margin:0;font-size:24px;line-height:1.25;color:#020617;">Seansınız hazırlandı</h1>
            <p style="margin:10px 0 0 0;color:#475569;font-size:14px;line-height:1.6;">Merhaba ${safeRecipientName}, ${roleText} paneliniz için chat ve görüşme bağlantıları hazırlandı.</p>
          </div>

          <div style="padding:24px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:18px;">
              <p style="margin:0 0 8px 0;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;">Seans Bilgileri</p>
              <p style="margin:0;color:#0f172a;font-size:15px;line-height:1.7;"><strong>${counterpartLabel}:</strong> ${safeOtherName}</p>
              <p style="margin:0;color:#0f172a;font-size:15px;line-height:1.7;"><strong>Başlangıç:</strong> ${start}</p>
              <p style="margin:0;color:#0f172a;font-size:15px;line-height:1.7;"><strong>Bitiş:</strong> ${end}</p>
            </div>

            <div style="display:block;margin:20px 0;">
              <a href="${escapeHtml(sessionUrl)}" style="display:block;text-align:center;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:800;border-radius:16px;padding:14px 18px;margin-bottom:10px;">Görüşmeye Katıl</a>
              <a href="${escapeHtml(chatUrl)}" style="display:block;text-align:center;background:#ffffff;color:#334155;text-decoration:none;font-weight:800;border:1px solid #cbd5e1;border-radius:16px;padding:14px 18px;">Chat'i Aç</a>
            </div>

            <p style="margin:18px 0 0 0;color:#64748b;font-size:13px;line-height:1.6;">Görüşme başlamadan önce internet bağlantınızı, kamera ve mikrofon izinlerinizi kontrol edin. Bu bağlantıları üçüncü kişilerle paylaşmayın.</p>
          </div>
        </div>
      </div>
    </div>
  `

  return { text, html }
}

function encodeBase64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64')
}

function buildMimeMessage({
  from,
  to,
  subject,
  text,
  html,
}: {
  from: string
  to: string
  subject: string
  text: string
  html: string
}) {
  const boundary = `mindora_${crypto.randomBytes(12).toString('hex')}`
  const encodedSubject = `=?UTF-8?B?${encodeBase64(subject)}?=`

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

function smtpCommand(socket: net.Socket | tls.TLSSocket, command: string, expected: number[]) {
  return new Promise<string>((resolve, reject) => {
    let buffer = ''

    const cleanup = () => {
      socket.off('data', onData)
      socket.off('error', onError)
    }

    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r?\n/).filter(Boolean)
      const lastLine = lines[lines.length - 1]

      if (!lastLine || /^\d{3}-/.test(lastLine)) return

      const code = Number(lastLine.slice(0, 3))
      if (!Number.isFinite(code)) return

      cleanup()

      if (expected.includes(code)) {
        resolve(buffer)
      } else {
        reject(new Error(`SMTP command failed (${command || 'connect'}): ${buffer}`))
      }
    }

    socket.on('data', onData)
    socket.on('error', onError)

    if (command) socket.write(`${command}\r\n`)
  })
}

function connectSmtp(config: SmtpConfig) {
  return new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const socket = config.secure
      ? tls.connect(config.port, config.host, { servername: config.host })
      : net.connect(config.port, config.host)

    socket.once('error', reject)
    socket.once('connect', () => {
      socket.off('error', reject)
      resolve(socket)
    })
  })
}

async function sendSmtpMail({
  config,
  to,
  subject,
  text,
  html,
}: {
  config: SmtpConfig
  to: string
  subject: string
  text: string
  html: string
}) {
  let socket = await connectSmtp(config)

  try {
    await smtpCommand(socket, '', [220])
    await smtpCommand(socket, `EHLO ${config.host}`, [250])

    if (!config.secure) {
      await smtpCommand(socket, 'STARTTLS', [220])
      socket = tls.connect({ socket, servername: config.host })
      await smtpCommand(socket, `EHLO ${config.host}`, [250])
    }

    await smtpCommand(socket, 'AUTH LOGIN', [334])
    await smtpCommand(socket, encodeBase64(config.user), [334])
    await smtpCommand(socket, encodeBase64(config.pass), [235])
    await smtpCommand(socket, `MAIL FROM:<${config.user}>`, [250])
    await smtpCommand(socket, `RCPT TO:<${to}>`, [250, 251])
    await smtpCommand(socket, 'DATA', [354])

    const message = buildMimeMessage({
      from: config.from,
      to,
      subject,
      text,
      html,
    })

    await smtpCommand(socket, `${message}\r\n.`, [250])
    await smtpCommand(socket, 'QUIT', [221])
  } finally {
    socket.destroy()
  }
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
    const { data: rawExistingSession, error: existingSessionError } = await supabase
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

async function getClientInfo({
  supabase,
  clientApplicationId,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  clientApplicationId: string | null
}): Promise<PersonInfo> {
  if (!clientApplicationId || !isValidUuid(clientApplicationId)) {
    return { name: 'Danışan', email: null }
  }

  const { data, error } = await supabase
    .from('client_applications' as never)
    .select('full_name,name,email,client_email')
    .eq('id', clientApplicationId as never)
    .maybeSingle()

  if (error) {
    console.error('Client info fetch error:', error)
    return { name: 'Danışan', email: null }
  }

  const row = data as unknown as Record<string, unknown> | null

  return {
    name: cleanText(row?.full_name || row?.name, 'Danışan'),
    email: cleanNullableText(row?.email || row?.client_email),
  }
}

async function getExpertInfo({
  supabase,
  expertId,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  expertId: string | null
}): Promise<PersonInfo> {
  if (!expertId || !isValidUuid(expertId)) {
    return { name: 'Uzman', email: null }
  }

  const { data, error } = await supabase
    .from('experts' as never)
    .select('full_name,name,title,email,expert_email')
    .eq('id', expertId as never)
    .maybeSingle()

  if (error) {
    console.error('Expert info fetch error:', error)
    return { name: 'Uzman', email: null }
  }

  const row = data as unknown as Record<string, unknown> | null
  const name = cleanText(row?.full_name || row?.name || row?.title, 'Uzman')

  return {
    name,
    email: cleanNullableText(row?.email || row?.expert_email),
  }
}

async function sendBookingPreparedEmails({
  booking,
  client,
  expert,
  links,
}: {
  booking: BookingRow
  client: PersonInfo
  expert: PersonInfo
  links: PreparedLinks
}): Promise<MailResult> {
  const config = getSmtpConfig()
  const result: MailResult = {
    enabled: Boolean(config),
    clientSent: false,
    expertSent: false,
    errors: [],
  }

  if (!config) return result

  const jobs: Array<Promise<void>> = []

  if (client.email) {
    const body = createEmailBody({
      role: 'client',
      recipientName: client.name,
      otherName: expert.name,
      scheduledStartAt: booking.scheduled_start_at,
      scheduledEndAt: booking.scheduled_end_at,
      chatUrl: links.clientChatUrl,
      sessionUrl: links.clientJoinUrl,
    })

    jobs.push(
      sendSmtpMail({
        config,
        to: client.email,
        subject: 'Mindora seans bağlantınız hazır',
        ...body,
      })
        .then(() => {
          result.clientSent = true
        })
        .catch((error: unknown) => {
          console.error('Client booking email error:', error)
          result.errors.push('Danışan maili gönderilemedi.')
        })
    )
  } else {
    result.errors.push('Danışan e-posta adresi bulunamadı.')
  }

  if (expert.email) {
    const body = createEmailBody({
      role: 'expert',
      recipientName: expert.name,
      otherName: client.name,
      scheduledStartAt: booking.scheduled_start_at,
      scheduledEndAt: booking.scheduled_end_at,
      chatUrl: links.expertChatUrl,
      sessionUrl: links.expertJoinUrl,
    })

    jobs.push(
      sendSmtpMail({
        config,
        to: expert.email,
        subject: 'Mindora uzman seans bağlantınız hazır',
        ...body,
      })
        .then(() => {
          result.expertSent = true
        })
        .catch((error: unknown) => {
          console.error('Expert booking email error:', error)
          result.errors.push('Uzman maili gönderilemedi.')
        })
    )
  } else {
    result.errors.push('Uzman e-posta adresi bulunamadı.')
  }

  await Promise.all(jobs)

  return result
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

    if (CLOSED_BOOKING_STATUSES.has(String(booking.status || '').toLowerCase())) {
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

    const links = buildLinks({
      baseUrl,
      booking,
      liveSessionId: liveSession.id,
      clientToken: clientAccess.token,
      expertToken: expertAccess.token,
      adminToken: adminAccess.token,
    })

    const now = new Date().toISOString()

    const { data: rawUpdatedBooking, error: updateError } = await supabase
      .from('session_bookings' as never)
      .update({
        live_session_id: liveSession.id,
        session_ready: true,
        session_ready_at: now,
        client_join_url: links.clientJoinUrl,
        expert_join_url: links.expertJoinUrl,
        admin_join_url: links.adminJoinUrl,
        status: booking.status === 'scheduled' ? 'confirmed' : booking.status,
        updated_at: now,
      } as never)
      .eq('id', booking.id as never)
      .select('*')
      .single()

    if (updateError) throw updateError

    const [client, expert] = await Promise.all([
      getClientInfo({
        supabase,
        clientApplicationId: conversation.client_application_id || booking.client_id,
      }),
      getExpertInfo({
        supabase,
        expertId: booking.expert_id || conversation.expert_id,
      }),
    ])

    const mail = await sendBookingPreparedEmails({
      booking,
      client,
      expert,
      links,
    })

    return NextResponse.json({
      ok: true,
      booking: rawUpdatedBooking,
      liveSessionId: liveSession.id,
      roomName: liveSession.roomName,
      tokenExpiresAt: clientAccess.expiresAt,
      joinUrls: {
        client: links.clientJoinUrl,
        expert: links.expertJoinUrl,
        admin: links.adminJoinUrl,
      },
      chatUrls: {
        client: links.clientChatUrl,
        expert: links.expertChatUrl,
        admin: links.adminConversationUrl,
      },
      mail,
    })
  } catch (err) {
    console.error('Prepare booking session error:', err)

    return NextResponse.json(
      { ok: false, error: 'Randevu görüşmeye hazırlanamadı.' },
      { status: 500 }
    )
  }
}
