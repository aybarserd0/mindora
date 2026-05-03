import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
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

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const adminText = `
Mindora Eşleştirme Bildirimi

Danışan:
Ad Soyad: ${toText(client.name)}
Telefon: ${toText(client.phone)}
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
`

    const expertText = `
Merhaba ${toText(expert.name)},

Mindora üzerinden sana yeni bir danışan eşleştirildi.

Danışan Bilgileri:
Ad Soyad: ${toText(client.name)}
Telefon: ${toText(client.phone)}
Yaş: ${toText(client.age)}
Konu: ${toText(client.topic)}
Süre: ${toText(client.duration)}
Daha Önce Destek: ${toText(client.previous_support)}
Başlama: ${toText(client.start_time)}
Tercih: ${toText(client.preference)}
Müsaitlik: ${toText(client.availability)}
Not: ${toText(client.note) || '-'}

Lütfen danışanla en kısa sürede iletişime geç.

Mindora
`

    await transporter.sendMail({
      from: `"Mindora" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: 'Mindora Yeni Eşleştirme',
      text: adminText,
    })

    if (expert.email) {
      await transporter.sendMail({
        from: `"Mindora" <${process.env.SMTP_USER}>`,
        to: expert.email,
        subject: 'Mindora Yeni Danışan Eşleştirmesi',
        text: expertText,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('MATCH SERVER ERROR:', err)
    return NextResponse.json(
      { ok: false, error: 'Sunucu hatası oluştu.' },
      { status: 500 }
    )
  }
}