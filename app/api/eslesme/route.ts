import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

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