import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { getSiteUrl } from '@/lib/site-url'
import { createConversationAccessToken } from '@/lib/chat-access-tokens'

export const runtime = 'nodejs'

type Conversation = {
  id: string
  status: string
  payment_status: string
}

type MailResult = {
  ok: boolean
  skipped: boolean
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })
}

async function safeSendMail({
  transporter,
  to,
  subject,
  text,
  html,
  logName,
}: {
  transporter: nodemailer.Transporter | null
  to: string | null | undefined
  subject: string
  text: string
  html?: string
  logName: string
}): Promise<MailResult> {
  const receiver = toText(to)

  if (!transporter || !receiver) {
    console.log(`${logName} EMAIL SKIPPED`)
    return { ok: false, skipped: true }
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Mindora" <${process.env.SMTP_USER}>`,
      to: receiver,
      subject,
      text,
      html,
    })

    return { ok: true, skipped: false }
  } catch (err) {
    console.error(`${logName} MAIL ERROR:`, err)
    return { ok: false, skipped: false }
  }
}

function clientPaymentEmailHtml({
  clientName,
  expertName,
  paymentUrl,
}: {
  clientName: string
  expertName: string
  paymentUrl: string
}) {
  return `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;background:#f7f2eb;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);">
    <div style="background:#111111;color:#ffffff;padding:24px 28px;">
      <div style="font-size:20px;font-weight:900;">Mindora</div>
      <div style="margin-top:4px;font-size:13px;color:rgba(255,255,255,0.68);">Online psikolojik destek platformu</div>
    </div>
    <div style="padding:32px 28px;text-align:center;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#111111;">Eşleşmeniz hazır!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#333333;">
        Merhaba ${clientName}, <strong>${expertName}</strong> ile eşleştirildiniz.
        Terapistinizle görüşmeye başlamak için ödemenizi tamamlayın.
      </p>
      <a href="${paymentUrl}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:18px 32px;border-radius:999px;font-weight:900;font-size:16px;">
        Ödemeyi Yap ve Görüşmeyi Başlat
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#777777;">
        Ödemeniz onaylandığı an sohbet ve görüşme alanınız otomatik olarak açılır.
      </p>
    </div>
    <div style="padding:16px 28px;background:#fafafa;color:#777777;font-size:12px;">
      Bu e-posta Mindora eşleştirme süreci kapsamında gönderilmiştir. Güvenliğiniz için ödeme ve iletişim adımlarını yalnızca Mindora üzerinden yürütün.
    </div>
  </div>
</div>
`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const clientId = toText(body?.clientId)
    const expertId = toText(body?.expertId)

    if (!clientId || !expertId) {
      return NextResponse.json(
        { ok: false, error: 'Danışan ve uzman seçimi zorunlu.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin() as any
    const baseUrl = getSiteUrl()

    const { data: client, error: clientError } = await supabase
      .from('client_applications')
      .select(
        `
        id,
        name,
        phone,
        email,
        age,
        topic,
        duration,
        previous_support,
        start_time,
        preference,
        availability,
        note
      `
      )
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('MATCH CLIENT ERROR:', clientError)

      return NextResponse.json(
        { ok: false, error: 'Danışan bulunamadı.' },
        { status: 404 }
      )
    }

    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select(
        `
        id,
        name,
        email,
        phone,
        title,
        areas,
        experience,
        online,
        availability,
        status
      `
      )
      .eq('id', expertId)
      .eq('status', 'approved')
      .single()

    if (expertError || !expert) {
      console.error('MATCH EXPERT ERROR:', expertError)

      return NextResponse.json(
        { ok: false, error: 'Onaylı uzman bulunamadı.' },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabase
      .from('client_applications')
      .update({
        matched_expert_id: expertId,
        status: 'matched',
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('MATCH UPDATE ERROR:', updateError)

      return NextResponse.json(
        { ok: false, error: 'Eşleştirme kaydedilemedi.' },
        { status: 500 }
      )
    }

    const { data: existingConversation, error: existingConversationError } =
      await supabase
        .from('conversations')
        .select('id, status, payment_status')
        .eq('client_application_id', clientId)
        .maybeSingle()

    if (existingConversationError) {
      console.error(
        'MATCH EXISTING CONVERSATION ERROR:',
        existingConversationError
      )

      return NextResponse.json(
        { ok: false, error: 'Mevcut konuşma kontrol edilemedi.' },
        { status: 500 }
      )
    }

    let conversation: Conversation | null = null

    if (existingConversation) {
      const currentPaymentStatus = toText(existingConversation.payment_status)
      const nextConversationStatus =
        currentPaymentStatus === 'paid' ? 'active' : 'locked'

      const { data: updatedConversation, error: conversationUpdateError } =
        await supabase
          .from('conversations')
          .update({
            expert_id: expertId,
            status: nextConversationStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConversation.id)
          .select('id, status, payment_status')
          .single()

      if (conversationUpdateError || !updatedConversation) {
        console.error(
          'MATCH CONVERSATION UPDATE ERROR:',
          conversationUpdateError
        )

        return NextResponse.json(
          { ok: false, error: 'Konuşma güncellenemedi.' },
          { status: 500 }
        )
      }

      conversation = updatedConversation as Conversation
    } else {
      const { data: createdConversation, error: conversationError } =
        await supabase
          .from('conversations')
          .insert({
            client_application_id: clientId,
            expert_id: expertId,
            status: 'locked',
            payment_status: 'pending',
          })
          .select('id, status, payment_status')
          .single()

      if (conversationError || !createdConversation) {
        console.error('MATCH CONVERSATION CREATE ERROR:', conversationError)

        return NextResponse.json(
          { ok: false, error: 'Konuşma oluşturulamadı.' },
          { status: 500 }
        )
      }

      conversation = createdConversation as Conversation
    }

    let clientDashboardLink = `${baseUrl}/client/dashboard`

    try {
      const clientAccess = await createConversationAccessToken({
        conversationId: conversation.id,
        role: 'client',
        expiresInHours: 24 * 30,
      })

      clientDashboardLink = `${baseUrl}/client/dashboard?token=${clientAccess.token}`
    } catch (tokenError) {
      console.error('MATCH CLIENT ACCESS TOKEN ERROR:', tokenError)
    }

    const clientChatLink = `${baseUrl}/client/chat/${conversation.id}`
    const expertChatLink = `${baseUrl}/expert/dashboard`
    const adminConversationLink = `${baseUrl}/admin/conversations/${conversation.id}`

    const transporter = createTransporter()

    const adminText = `
Mindora Eşleştirme Bildirimi

Danışan:
Ad Soyad: ${toText(client.name)}
Telefon: ${toText(client.phone)}
E-posta: ${toText(client.email)}
Yaş: ${toText(client.age)}
Konu: ${toText(client.topic)}
Süre: ${toText(client.duration)}
Daha Önce Destek: ${toText(client.previous_support)}
Başlama: ${toText(client.start_time)}
Tercih: ${toText(client.preference)}
Müsaitlik: ${toText(client.availability)}
Not: ${toText(client.note) || '-'}

Eşleşen Uzman:
Ad Soyad: ${toText(expert.name)}
E-posta: ${toText(expert.email)}
Telefon: ${toText(expert.phone)}
Ünvan: ${toText(expert.title)}
Alanlar: ${toText(expert.areas)}
Deneyim: ${toText(expert.experience)}
Online: ${toText(expert.online)}
Müsaitlik: ${toText(expert.availability)}

Konuşma:
Conversation ID: ${toText(conversation.id)}
Durum: ${toText(conversation.status)}
Ödeme Durumu: ${toText(conversation.payment_status)}
Admin Link: ${adminConversationLink}

Not:
Danışan ve uzman tarafına gönderilen mailler no-leak formatındadır.
Tarafların telefon/e-posta bilgileri birbirleriyle paylaşılmamıştır.
Konuşma ödeme tamamlanana kadar kilitli kalacaktır.
`

    const expertText = `
Merhaba ${toText(expert.name)},

Mindora üzerinden size yeni bir danışan eşleştirildi.

Danışan:
${toText(client.name)}

Başvuru Özeti:
Konu: ${toText(client.topic)}
Süre: ${toText(client.duration)}
Daha Önce Destek: ${toText(client.previous_support)}
Başlama Tercihi: ${toText(client.start_time)}
Görüşme Tercihi: ${toText(client.preference)}
Müsaitlik: ${toText(client.availability)}
Not: ${toText(client.note) || '-'}

Güvenli Uzman Chat Linki:
${expertChatLink}

Gizlilik ve güvenlik politikamız gereği danışanın telefon ve e-posta bilgileri paylaşılmamaktadır.

Danışanla iletişim yalnızca Mindora platformu üzerinden yürütülecektir.

Ödeme tamamlandıktan sonra konuşma alanı aktif hale gelecektir.

Platform dışı iletişim; ödeme, güvenlik ve takip süreçlerini etkileyebilir.

Mindora Ekibi
`

    const clientText = `
Merhaba ${toText(client.name)},

Eşleşmeniz hazır! Terapistinizle görüşmeye başlamak için ödemenizi tamamlayın.

Eşleşen Uzman:
${toText(expert.name)}

Ödemeyi Yap ve Görüşmeyi Başlat:
${clientDashboardLink}

Ödemeniz onaylandığı an sohbet ve görüşme alanınız otomatik olarak açılır.

Güvenliğiniz için iletişim ve ödeme adımlarını yalnızca Mindora üzerinden yürütün.

Mindora Ekibi
`

    const adminMail = await safeSendMail({
      transporter,
      to: process.env.CONTACT_TO || process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: 'Mindora Yeni Eşleştirme',
      text: adminText,
      logName: 'ADMIN MATCH',
    })

    const expertMail = await safeSendMail({
      transporter,
      to: expert.email,
      subject: 'Mindora Yeni Danışan Eşleştirmesi',
      text: expertText,
      logName: 'EXPERT MATCH',
    })

    const clientMail = await safeSendMail({
      transporter,
      to: client.email,
      subject: 'Eşleşmeniz hazır — ödemenizi tamamlayın',
      text: clientText,
      html: clientPaymentEmailHtml({
        clientName: toText(client.name) || 'Danışan',
        expertName: toText(expert.name) || 'Mindora Uzmanı',
        paymentUrl: clientDashboardLink,
      }),
      logName: 'CLIENT MATCH',
    })

    await Promise.all([
      createNotification({
        supabase,
        userType: 'client',
        userId: clientId,
        title: 'Uzmanla eşleştiniz',
        message: `${toText(expert.name)} ile eşleştirildiniz. Sonraki adım için panelinizi kontrol edin.`,
        type: 'system',
        link: `/client/chat/${conversation.id}`,
      }),
      createNotification({
        supabase,
        userType: 'expert',
        userId: expertId,
        title: 'Yeni danışan eşleştirmesi',
        message: `${toText(client.name)} size eşleştirildi.`,
        type: 'system',
        link: `/expert/chat/${conversation.id}`,
      }),
    ])

    return NextResponse.json({
      ok: true,
      message: 'Eşleştirme başarıyla yapıldı.',
      conversation,
      links: {
        client: clientChatLink,
        expert: expertChatLink,
        admin: adminConversationLink,
      },
      mail: {
        admin: adminMail,
        expert: expertMail,
        client: clientMail,
      },
    })
  } catch (err) {
    console.error('MATCH SERVER ERROR:', err)

    return NextResponse.json(
      { ok: false, error: 'Sunucu hatası oluştu.' },
      { status: 500 }
    )
  }
}