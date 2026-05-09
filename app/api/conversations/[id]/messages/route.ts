import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

export const runtime = 'nodejs'

type SenderType = 'client' | 'expert' | 'admin'
type RecipientType = 'client' | 'expert' | 'admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

type NotificationThrottleRow = {
  last_sent_at?: string | null
}

const NOTIFICATION_THROTTLE_MINUTES = 5

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function detectContactLeak(message: string) {
  const text = message.toLowerCase()

  const rules = [
    { key: 'email', pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
    {
      key: 'phone_tr',
      pattern:
        /(\+90|0090|0)?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/,
    },
    { key: 'whatsapp', pattern: /(whatsapp|watsap|wp|wa\.me)/i },
    { key: 'instagram', pattern: /(instagram|insta|ig|@[\w.]{3,})/i },
    { key: 'telegram', pattern: /(telegram|t\.me)/i },
    {
      key: 'iban',
      pattern:
        /tr\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/i,
    },
    {
      key: 'external_payment',
      pattern: /(iban|havale|eft|papara|payfix|elden ödeme|nakit)/i,
    },
  ]

  const matched = rules.filter((rule) => rule.pattern.test(text))

  return {
    isFlagged: matched.length > 0,
    reason: matched.map((item) => item.key).join(', '),
  }
}

function isValidSenderType(value: unknown): value is SenderType {
  return value === 'client' || value === 'expert' || value === 'admin'
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  )
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

function getConversationEmail(conversation: any, recipientType: RecipientType) {
  if (recipientType === 'client') {
    return (
      conversation.client_email ||
      conversation.danisan_email ||
      conversation.customer_email ||
      conversation.email ||
      ''
    )
  }

  if (recipientType === 'expert') {
    return (
      conversation.expert_email ||
      conversation.uzman_email ||
      conversation.psychologist_email ||
      conversation.therapist_email ||
      ''
    )
  }

  return process.env.ADMIN_NOTIFICATION_EMAIL || ''
}

function getRecipientTypes(senderType: SenderType): RecipientType[] {
  if (senderType === 'client') return ['expert']
  if (senderType === 'expert') return ['client']
  return ['client', 'expert']
}

function getChatLink(conversationId: string, recipientType: RecipientType) {
  const baseUrl = getBaseUrl()

  if (recipientType === 'client') return `${baseUrl}/client/chat/${conversationId}`
  if (recipientType === 'expert') return `${baseUrl}/expert/chat/${conversationId}`

  return `${baseUrl}/admin/conversations/${conversationId}`
}

function getMailSubject(senderType: SenderType) {
  if (senderType === 'client') return 'Mindora | Danışandan yeni mesaj var'
  if (senderType === 'expert') return 'Mindora | Uzmandan yeni mesaj var'
  return 'Mindora | Yeni Mindora mesajı var'
}

function getMailHtml({
  recipientType,
  senderType,
  chatLink,
}: {
  recipientType: RecipientType
  senderType: SenderType
  chatLink: string
}) {
  const senderLabel =
    senderType === 'client'
      ? 'danışanınızdan'
      : senderType === 'expert'
        ? 'uzmanınızdan'
        : 'Mindora ekibinden'

  const recipientLabel =
    recipientType === 'client'
      ? 'Danışan'
      : recipientType === 'expert'
        ? 'Uzman'
        : 'Admin'

  return `
    <div style="font-family:Arial,sans-serif;background:#f7f3ee;padding:32px">
      <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:24px;padding:28px;border:1px solid #e5d9cc">
        <div style="font-size:12px;font-weight:800;letter-spacing:3px;color:#8a7662;margin-bottom:12px">
          MINDORA
        </div>

        <h1 style="margin:0;color:#2b2118;font-size:24px">
          Yeni mesajınız var
        </h1>

        <p style="color:#6b5c4d;font-size:15px;line-height:1.6">
          Merhaba ${recipientLabel}, ${senderLabel} yeni bir mesaj aldınız.
          Güvenli görüşmeyi Mindora üzerinden devam ettirebilirsiniz.
        </p>

        <a href="${chatLink}" style="display:inline-block;margin-top:16px;background:#000;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800">
          Görüşmeyi Aç
        </a>

        <p style="margin-top:22px;color:#8a7662;font-size:12px;line-height:1.6">
          Güvenliğiniz için telefon, e-posta, sosyal medya, IBAN veya platform dışı ödeme bilgisi paylaşmayınız.
        </p>
      </div>
    </div>
  `
}

function getAccessTokenFromRequest(req: NextRequest, body?: any) {
  return (
    toText(req.nextUrl.searchParams.get('token')) ||
    toText(req.headers.get('x-chat-access-token')) ||
    toText(body?.token)
  )
}

function getAccessRoleFromRequest(req: NextRequest, body?: any) {
  return (
    toText(req.nextUrl.searchParams.get('role')) ||
    toText(req.headers.get('x-chat-access-role')) ||
    toText(body?.role)
  )
}

async function verifyChatApiAccess({
  req,
  conversationId,
  role,
  body,
}: {
  req: NextRequest
  conversationId: string
  role?: SenderType
  body?: any
}) {
  if (role === 'admin') return { ok: true }

  const accessRole = role || getAccessRoleFromRequest(req, body)
  const token = getAccessTokenFromRequest(req, body)

  if (accessRole !== 'client' && accessRole !== 'expert') {
    return {
      ok: false,
      error: 'Erişim tipi geçersiz.',
    }
  }

  const result = await verifyConversationAccessToken({
    conversationId,
    role: accessRole,
    token,
  })

  if (!result.ok) {
    return {
      ok: false,
      error: 'Bu konuşmaya erişim yetkiniz yok veya güvenli link süresi dolmuş.',
    }
  }

  return { ok: true }
}

async function shouldSendEmailNotification({
  supabase,
  conversationId,
  recipientType,
}: {
  supabase: any
  conversationId: string
  recipientType: RecipientType
}) {
  const { data, error } = await supabase
    .from('conversation_email_notifications')
    .select('last_sent_at')
    .eq('conversation_id', conversationId)
    .eq('recipient_type', recipientType)
    .maybeSingle()

  if (error) return false

  const notificationData = data as NotificationThrottleRow | null

  if (!notificationData?.last_sent_at) return true

  const lastSent = new Date(notificationData.last_sent_at).getTime()
  const now = Date.now()
  const diffMinutes = (now - lastSent) / 1000 / 60

  return diffMinutes >= NOTIFICATION_THROTTLE_MINUTES
}

async function markEmailNotificationSent({
  supabase,
  conversationId,
  recipientType,
}: {
  supabase: any
  conversationId: string
  recipientType: RecipientType
}) {
  await supabase.from('conversation_email_notifications').upsert(
    {
      conversation_id: conversationId,
      recipient_type: recipientType,
      last_sent_at: new Date().toISOString(),
    },
    {
      onConflict: 'conversation_id,recipient_type',
    }
  )
}

async function sendSmartEmailNotifications({
  supabase,
  conversation,
  conversationId,
  senderType,
}: {
  supabase: any
  conversation: any
  conversationId: string
  senderType: SenderType
}) {
  const transporter = getSmtpTransporter()
  if (!transporter) return

  const recipients = getRecipientTypes(senderType)

  await Promise.all(
    recipients.map(async (recipientType) => {
      try {
        const to = getConversationEmail(conversation, recipientType)
        if (!to) return

        const canSend = await shouldSendEmailNotification({
          supabase,
          conversationId,
          recipientType,
        })

        if (!canSend) return

        const chatLink = getChatLink(conversationId, recipientType)

        await transporter.sendMail({
          from:
            process.env.SMTP_FROM ||
            process.env.SMTP_USER ||
            'Mindora <no-reply@mindora.app>',
          to,
          subject: getMailSubject(senderType),
          html: getMailHtml({
            recipientType,
            senderType,
            chatLink,
          }),
        })

        await markEmailNotificationSent({
          supabase,
          conversationId,
          recipientType,
        })
      } catch (err) {
        console.error('SMART EMAIL NOTIFICATION ERROR:', err)
      }
    })
  )
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const conversationId = toText(id)

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation ID zorunlu.' },
        { status: 400 }
      )
    }

    const access = await verifyChatApiAccess({
      req,
      conversationId,
    })

    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin() as any

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError || !conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Konuşma bulunamadı.',
          detail: conversationError?.message || null,
        },
        { status: 404 }
      )
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(
        `
        id,
        conversation_id,
        sender_type,
        sender_name,
        message,
        is_flagged,
        flag_reason,
        created_at
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Mesajlar alınamadı.',
          detail: messagesError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        conversation,
        messages: messages || [],
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Mesajlar alınırken sunucu hatası oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const conversationId = toText(id)
    const body = await req.json().catch(() => null)

    const senderType = body?.senderType
    const senderName = toText(body?.senderName)
    const message = toText(body?.message)

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation ID zorunlu.' },
        { status: 400 }
      )
    }

    if (!isValidSenderType(senderType)) {
      return NextResponse.json(
        { ok: false, error: 'Gönderici tipi geçersiz.' },
        { status: 400 }
      )
    }

    const access = await verifyChatApiAccess({
      req,
      conversationId,
      role: senderType,
      body,
    })

    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: 403 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { ok: false, error: 'Mesaj boş olamaz.' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { ok: false, error: 'Mesaj en fazla 2000 karakter olabilir.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin() as any

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError || !conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Konuşma bulunamadı.',
          detail: conversationError?.message || null,
        },
        { status: 404 }
      )
    }

    if (
      senderType !== 'admin' &&
      (conversation.status !== 'active' || conversation.payment_status !== 'paid')
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödeme tamamlanmadan platform içi mesajlaşma başlatılamaz.',
        },
        { status: 403 }
      )
    }

    const leak = detectContactLeak(message)

    if (senderType !== 'admin' && leak.isFlagged) {
      const { data: flaggedMessage, error: flaggedError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_name: senderName || senderType,
          message,
          is_flagged: true,
          flag_reason: leak.reason || 'contact_leak',
        })
        .select('*')
        .single()

      if (flaggedError) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Flagged mesaj kaydedilemedi.',
            detail: flaggedError.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error:
            'Mesajda platform dışı iletişim veya ödeme bilgisi tespit edildi. Lütfen telefon, e-posta, sosyal medya, IBAN veya WhatsApp bilgisi paylaşmadan tekrar deneyin.',
          message: flaggedMessage,
        },
        { status: 400 }
      )
    }

    const { data: createdMessage, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_name: senderName || senderType,
        message,
        is_flagged: false,
        flag_reason: null,
      })
      .select('*')
      .single()

    if (createError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Mesaj kaydedilemedi.',
          detail: createError.message,
        },
        { status: 500 }
      )
    }

    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    sendSmartEmailNotifications({
      supabase,
      conversation,
      conversationId,
      senderType,
    }).catch((err) => {
      console.error('SMART EMAIL BACKGROUND ERROR:', err)
    })

    return NextResponse.json({
      ok: true,
      message: createdMessage,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Mesaj gönderilirken sunucu hatası oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}