import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function toText(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUrl(value: string) {
  if (!value) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const name = toText(body.name)
    const phone = toText(body.phone)
    const email = toText(body.email)
    const photo_url = toText(body.photo_url)
    const title = toText(body.title)
    const areas = toText(body.areas)
    const experience = toText(body.experience)
    const online = toText(body.online)
    const price = toText(body.price)
    const availability = toText(body.availability)
    const expectation = toText(body.expectation)
    const note = toText(body.note)

    if (!name || !phone || !email || !title) {
      return NextResponse.json(
        { ok: false, error: 'Zorunlu alanlar eksik.' },
        { status: 400 }
      )
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli bir e-posta adresi girilmelidir.' },
        { status: 400 }
      )
    }

    if (!isValidUrl(photo_url)) {
      return NextResponse.json(
        { ok: false, error: 'Profil fotoğrafı linki geçerli değil.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin.from('experts').insert([
      {
        name,
        phone,
        email,
        photo_url: photo_url || null,
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
      console.error('UZMAN BASVURU DB ERROR:', error)

      return NextResponse.json(
        { ok: false, error: 'Başvuru veritabanına kaydedilemedi.' },
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
      from: `"Mindora Uzman Başvurusu" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: 'Yeni Uzman Başvurusu',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Yeni Uzman Başvurusu</h2>

          <p><b>Ad Soyad:</b> ${name}</p>
          <p><b>Telefon:</b> ${phone}</p>
          <p><b>E-posta:</b> ${email}</p>
          <p><b>Profil Fotoğrafı:</b> ${photo_url || '-'}</p>
          <p><b>Ünvan:</b> ${title}</p>
          <p><b>Uzmanlık Alanları:</b> ${areas || '-'}</p>
          <p><b>Deneyim:</b> ${experience || '-'}</p>
          <p><b>Online Görüşme:</b> ${online || '-'}</p>
          <p><b>Seans Ücreti:</b> ${price || '-'}</p>
          <p><b>Müsaitlik:</b> ${availability || '-'}</p>
          <p><b>Mindora’dan Beklenti:</b> ${expectation || '-'}</p>
          <p><b>Ek Not:</b> ${note || '-'}</p>

          <hr />
          <p style="font-size: 13px; color: #666;">
            Bu başvuru Supabase experts tablosuna pending durumuyla kaydedildi.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('UZMAN BASVURU API ERROR:', err)

    return NextResponse.json(
      { ok: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}