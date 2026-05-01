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
    const body = await req.json()

    const name = toText(body.name)
    const phone = toText(body.phone)
    const email = toText(body.email)
    const title = toText(body.title)
    const areas = toText(body.areas)
    const experience = toText(body.experience)
    const online = toText(body.online)
    const price = toText(body.price)
    const availability = toText(body.availability)
    const expectation = toText(body.expectation)
    const note = toText(body.note)

    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin.from('experts').insert([
      {
        name,
        phone,
        email,
        title,
        areas,
        experience,
        online,
        price,
        availability,
        expectation,
        note,
        status: 'pending',
      },
    ])

    if (error) {
      console.error('DB ERROR:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
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

    await transporter.sendMail({
      from: `"Mindora" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: 'Yeni Uzman Başvurusu',
      html: `
        <h2>Yeni Uzman Başvurusu</h2>
        <p><b>Ad:</b> ${name}</p>
        <p><b>Telefon:</b> ${phone}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Ünvan:</b> ${title}</p>
        <p><b>Alanlar:</b> ${areas}</p>
        <p><b>Deneyim:</b> ${experience}</p>
        <p><b>Online:</b> ${online}</p>
        <p><b>Ücret:</b> ${price}</p>
        <p><b>Müsaitlik:</b> ${availability}</p>
        <p><b>Beklenti:</b> ${expectation}</p>
        <p><b>Not:</b> ${note}</p>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('UZMAN BASVURU ERROR:', err)
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    )
  }
}