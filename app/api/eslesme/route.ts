import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function toText(value: unknown) {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  return String(value)
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const name = toText(data.name)
    const phone = toText(data.phone)
    const age = toText(data.age)
    const topic = toText(data.topic)
    const duration = toText(data.duration)
    const previousSupport = toText(data.previousSupport)
    const startTime = toText(data.startTime)
    const preference = toText(data.preference)
    const availability = toText(data.availability)
    const note = toText(data.note) || '-'

    if (!name.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Ad soyad zorunlu.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { error: dbError } = await supabase
      .from('client_applications')
      .insert({
        name,
        phone,
        age,
        topic,
        duration,
        previous_support: previousSupport,
        start_time: startTime,
        preference,
        availability,
        note,
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

    const text = `
Mindora Danışan Başvurusu

Ad Soyad: ${name}
Telefon: ${phone}
Yaş: ${age}
Konu: ${topic}
Süre: ${duration}
Önce destek: ${previousSupport}
Başlama: ${startTime}
Tercih: ${preference}
Müsaitlik: ${availability}
Not: ${note}
`

    await transporter.sendMail({
      from: `"Mindora Danışan" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: 'Mindora Danışan Başvurusu',
      text,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('ESLESME ERROR:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}