import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PROFESSION_CONFIG, toProfession } from '@/lib/professions'
import { autoMatchApplication, type AutoMatchOutcome } from '@/lib/matching/auto-match'

export const runtime = 'nodejs'

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
    const setting = config.client.settingQuestion?.options.includes(toText(data.setting)) ? toText(data.setting) : null

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

    const { data: inserted, error: dbError } = await supabase.from('client_applications').insert({
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
      setting,
    }).select('id').single()

    if (dbError || !inserted) {
      console.error('ESLESME DB ERROR:', dbError)

      return NextResponse.json(
        { ok: false, error: 'Danışan başvurusu kaydedilemedi.' },
        { status: 500 }
      )
    }

    // Uygun uzman varsa danışan hemen eşleşir ve saat seçme e-postası gider.
    // Eşleşme başarısız olsa bile başvuru kayıtlıdır; günlük görev yeniden dener.
    let outcome: AutoMatchOutcome = { matched: false, reason: 'match_failed' }
    try {
      outcome = await autoMatchApplication(supabase, inserted.id)
    } catch (matchError) {
      console.error('ESLESME AUTO MATCH ERROR:', matchError)
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
Antrenman yeri: ${setting ?? '-'}
Sağlık ön sorusu: ${healthScreen ?? '-'}
Not: ${note}

Otomatik eşleşme: ${outcome.matched ? 'yapıldı, danışana saat seçme e-postası gönderildi' : `yapılamadı (${outcome.reason === 'no_candidate' ? 'uygun uzman yok: ücret, takvim, cinsiyet tercihi ya da kapasite' : outcome.reason}). Elle eşleştir: /admin/danisan-basvurulari`}
`

    const clientText = `
Merhaba ${name},

Mindora başvurun bize ulaştı.

Sana uygun ${config.accusative} arıyoruz. Bulduğumuzda saat seçebileceğin bağlantıyı bu adrese e-postayla göndereceğiz.

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

    // Eşleştiyse danışan zaten "uzmanınla eşleştin" e-postasını aldı
    if (!outcome.matched) {
      await transporter.sendMail({
        from: `"Mindora" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Mindora Başvurun Alındı',
        text: clientText,
      })
    }

    return NextResponse.json({ ok: true, matched: outcome.matched })
  } catch (err) {
    console.error('ESLESME ERROR:', err)

    return NextResponse.json(
      { ok: false, error: 'Sunucu hatası oluştu.' },
      { status: 500 }
    )
  }
}