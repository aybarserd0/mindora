import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'

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

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
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
  logName,
}: {
  transporter: nodemailer.Transporter | null
  to: string | null | undefined
  subject: string
  text: string
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
    })

    return { ok: true, skipped: false }
  } catch (err) {
    console.error(`${logName} MAIL ERROR:`, err)
    return { ok: false, skipped: false }
  }
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
    const baseUrl = getBaseUrl()

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

    const clientChatLink = `${baseUrl}/client/chat/${conversation.id}`
    const expertChatLink = `${baseUrl}/expert/chat/${conversation.id}`
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

Mindora başvurunuz incelendi ve size uygun bir uzmanla eşleştirildiniz.

Eşleşen Uzman:
${toText(expert.name)}

Uzmanlık Bilgileri:
Ünvan: ${toText(expert.title)}
Alanlar: ${toText(expert.areas)}
Deneyim: ${toText(expert.experience)}

Güvenli Danışan Chat Linkiniz:
${clientChatLink}

Güvenliğiniz ve sürecin sağlıklı ilerlemesi için iletişim Mindora platformu üzerinden yürütülecektir.

Uzmanınızın telefon ve e-posta bilgileri gizlilik politikamız gereği paylaşılmamaktadır.

Ödeme tamamlandıktan sonra platform içi iletişim alanınız aktif hale gelecektir.

Lütfen platform dışı iletişim kurmayınız.

Görüşme ve ödeme adımları Mindora güvencesiyle ilerleyecektir.

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
      subject: 'Mindora Eşleşmeniz Yapıldı',
      text: clientText,
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