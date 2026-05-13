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

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('SMTP environment variables are missing.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || ''
}

function createMailHtml({
  name,
  role,
  startAt,
  endAt,
  joinUrl,
}: {
  name: string
  role: 'danışan' | 'uzman'
  startAt: string
  endAt: string
  joinUrl: string
}) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f7f3ee;padding:32px;color:#2b2118;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px;border:1px solid #e5d9cc;">
        <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8a7662;font-weight:700;">
          Mindora Secure Session
        </p>

        <h1 style="margin:8px 0 12px;font-size:26px;">
          Görüşme linkin hazır
        </h1>

        <p style="font-size:15px;line-height:1.7;color:#6b5c4d;">
          Merhaba ${name || role}, Mindora görüşmen güvenli bağlantı ile hazırlandı.
        </p>

        <div style="margin:22px 0;padding:18px;border-radius:18px;background:#faf7f2;border:1px solid #eee2d4;">
          <p style="margin:0 0 8px;font-size:14px;"><b>Başlangıç:</b> ${formatSessionDate(startAt)}</p>
          <p style="margin:0;font-size:14px;"><b>Bitiş:</b> ${formatSessionDate(endAt)}</p>
        </div>

        <a href="${joinUrl}" style="display:block;text-align:center;background:#2b2118;color:#ffffff;text-decoration:none;padding:16px 22px;border-radius:18px;font-weight:800;">
          Güvenli Görüşmeye Katıl
        </a>

        <p style="margin-top:22px;font-size:12px;line-height:1.6;color:#8a7662;">
          Bu link kişiye özeldir. Güvenliğin için başka kişilerle paylaşma.
        </p>
      </div>
    </div>
  `
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
        { ok: false, error: 'Conversation bulunamadı.' },
        { status: 400 }
      )
    }

    if (!booking.session_ready || !booking.client_join_url || !booking.expert_join_url) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Görüşme linkleri hazır değil. Önce Görüşmeye Hazırla adımını çalıştır.',
        },
        { status: 409 }
      )
    }

    const { data: rawConversation, error: conversationError } = await supabase
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
      .eq('id', booking.conversation_id)
      .single()

    if (conversationError) throw conversationError

    const conversation = rawConversation as unknown as ConversationRow | null

    const clientEmail = conversation?.client_applications?.email || ''
    const expertEmail = conversation?.experts?.email || ''
    const clientName = conversation?.client_applications?.name || 'Danışan'
    const expertName = conversation?.experts?.name || 'Uzman'

    if (!clientEmail || !expertEmail) {
      return NextResponse.json(
        { ok: false, error: 'Danışan veya uzman e-posta adresi bulunamadı.' },
        { status: 400 }
      )
    }

    const transporter = getTransporter()
    const from = getFromAddress()

    await Promise.all([
      transporter.sendMail({
        from,
        to: clientEmail,
        subject: 'Mindora görüşme linkin hazır',
        html: createMailHtml({
          name: clientName,
          role: 'danışan',
          startAt: booking.scheduled_start_at,
          endAt: booking.scheduled_end_at,
          joinUrl: booking.client_join_url,
        }),
      }),
      transporter.sendMail({
        from,
        to: expertEmail,
        subject: 'Mindora uzman görüşme linkin hazır',
        html: createMailHtml({
          name: expertName,
          role: 'uzman',
          startAt: booking.scheduled_start_at,
          endAt: booking.scheduled_end_at,
          joinUrl: booking.expert_join_url,
        }),
      }),
    ])

    return NextResponse.json({
      ok: true,
      sent: {
        client: clientEmail,
        expert: expertEmail,
      },
    })
  } catch (err) {
    console.error('Send booking links error:', err)

    return NextResponse.json(
      { ok: false, error: 'Görüşme linkleri gönderilemedi.' },
      { status: 500 }
    )
  }
}