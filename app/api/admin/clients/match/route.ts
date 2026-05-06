import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
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
  transporter: nodemailer.Transporter
  to: string | null | undefined
  subject: string
  text: string
  logName: string
}) {
  const receiver = toText(to)

  if (!receiver) {
    console.log(`${logName} EMAIL EMPTY`)
    return { ok: false, skipped: true }
  }

  try {
    console.log(`${logName} EMAIL:`, receiver)

    await transporter.sendMail({
      from: `"Mindora" <${process.env.SMTP_USER}>`,
      to: receiver,
      subject,
      text,
    })

    console.log(`${logName} MAIL SENT`)
    return { ok: true, skipped: false }
  } catch (err) {
    console.error(`${logName} MAIL ERROR:`, err)
    return { ok: false, skipped: false }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, expertId } = await req.json()

    if (!clientId || !expertId) {
      return NextResponse.json(
        { ok: false, error: 'Danışan ve uzman seçimi zorunlu.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

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

    let conversation = existingConversation

    if (!conversation) {
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

      conversation = createdConversation
    } else {
      const { data: updatedConversation, error: conversationUpdateError } =
        await supabase
          .from('conversations')
          .update({
            expert_id: expertId,
            status:
              existingConversation.payment_status === 'paid'
                ? 'active'
                : 'locked',
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

      conversation = updatedConversation
    }

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
Conversation ID: ${toText(conversation?.id)}
Durum: ${toText(conversation?.status)}
Ödeme Durumu: ${toText(conversation?.payment_status)}

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

Güvenliğiniz ve sürecin sağlıklı ilerlemesi için iletişim Mindora platformu üzerinden yürütülecektir.

Uzmanınızın telefon ve e-posta bilgileri gizlilik politikamız gereği paylaşılmamaktadır.

Ödeme tamamlandıktan sonra platform içi iletişim alanınız aktif hale gelecektir.

Lütfen platform dışı iletişim kurmayınız.

Görüşme ve ödeme adımları Mindora güvencesiyle ilerleyecektir.

Mindora Ekibi
`

    const adminMail = await safeSendMail({
      transporter,
      to: process.env.CONTACT_TO,
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

    return NextResponse.json({
      ok: true,
      message: 'Eşleştirme başarıyla yapıldı.',
      conversation,
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