import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PROFESSION_CONFIG, toProfession } from '@/lib/professions'

function toText(value: unknown) {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const name = toText(data.name)
    const phone = toText(data.phone)
    const email = toText(data.email)
    const age = toText(data.age)
    const topic = toText(data.topic)
    const duration = toText(data.duration)
    const previousSupport = toText(data.previousSupport)
    const startTime = toText(data.startTime)
    const preference = toText(data.preference)
    const availability = toText(data.availability)
    const note = toText(data.note) || '-'
    const profession = toProfession(data.profession)
    const config = PROFESSION_CONFIG[profession]
    // Sağlık ön sorusu yalnızca diyetisyen / antrenör için ve yalnızca bu üç yanıttan biri
    const healthScreen = config.client.healthQuestion && ['Hayır', 'Evet', 'Emin değilim'].includes(toText(data.healthScreen))
      ? toText(data.healthScreen)
      : null

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Ad soyad zorunlu.' },
        { status: 400 }
      )
    }

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: 'Telefon zorunlu.' },
        { status: 400 }
      )
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli bir e-posta adresi gir.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { error: dbError } = await supabase.from('client_applications').insert({
      name,
      phone,
      email,
      age,
      topic,
      duration,
      previous_support: previousSupport,
      start_time: startTime,
      preference,
      availability,
      note,
      profession,
      health_screen: healthScreen,
    })

    if (dbError) {
      console.error('ESLESME DB ERROR:', dbError)

      return NextResponse.json(
        { ok: false, error: 'Danışan başvurusu kaydedilemedi.' },
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
Mindora Danışan Başvurusu (${config.label})

Ad Soyad: ${name}
Telefon: ${phone}
E-posta: ${email}
Yaş: ${age}
Konu: ${topic}
Süre: ${duration}
Önce destek: ${previousSupport}
Başlama: ${startTime}
Tercih: ${preference}
Müsaitlik: ${availability}
Sağlık ön sorusu: ${healthScreen ?? '-'}
Not: ${note}
`

    const clientText = `
Merhaba ${name},

Mindora başvurun bize ulaştı.

Başvurunu inceleyip sana uygun ${config.label.toLocaleLowerCase('tr-TR')} eşleşmesi için en kısa sürede seninle iletişime geçeceğiz.

Başvuru Özeti:
Konu: ${topic || '-'}
Başlama: ${startTime || '-'}
Müsaitlik: ${availability || '-'}

Mindora
`

    await transporter.sendMail({
      from: `"Mindora Danışan" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: `Mindora Danışan Başvurusu: ${config.label}`,
      text: adminText,
    })

    await transporter.sendMail({
      from: `"Mindora" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Mindora Başvurun Alındı',
      text: clientText,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('ESLESME ERROR:', err)

    return NextResponse.json(
      { ok: false, error: 'Sunucu hatası oluştu.' },
      { status: 500 }
    )
  }
}