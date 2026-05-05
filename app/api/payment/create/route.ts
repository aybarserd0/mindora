import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function createAuthHeader(
  apiKey: string,
  secretKey: string,
  randomKey: string,
  uri: string,
  body: string
) {
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(randomKey + uri + body)
    .digest('hex')

  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`

  return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`
}

function cleanUrl(url?: string) {
  return (url || '').replace(/\/+$/, '')
}

async function getTokenFromRequest(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null)
    return body?.token || null
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await req.formData().catch(() => null)
    return formData?.get('token')?.toString() || null
  }

  const text = await req.text().catch(() => '')
  const params = new URLSearchParams(text)

  return params.get('token')
}

function formatMoney(value?: number | null) {
  if (!value || !Number.isFinite(Number(value))) return '0 TL'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

async function sendPaymentEmails({
  client,
  expert,
  payment,
}: {
  client: any
  expert: any
  payment: any
}) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user
  const adminMail = process.env.ADMIN_EMAIL || user

  if (!host || !user || !pass || !from) {
    console.warn('SMTP env eksik. Mail gönderimi atlandı.')
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })

  const clientName =
    client?.full_name ||
    client?.name ||
    client?.client_name ||
    client?.fullName ||
    'Danışan'

  const expertName = expert?.name || 'Uzman Psikolog'
  const amount = formatMoney(payment?.amount)
  const commissionAmount = formatMoney(payment?.commission_amount)
  const expertAmount = formatMoney(payment?.expert_amount)

  const tasks: Promise<any>[] = []

  if (client?.email) {
    tasks.push(
      transporter.sendMail({
        from,
        to: client.email,
        subject: 'Mindora ödemeniz başarıyla alındı',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
            <h2>Ödemeniz başarıyla alındı</h2>
            <p>Merhaba ${clientName},</p>
            <p>Mindora üzerinden oluşturulan seans ödemeniz başarıyla tamamlandı.</p>
            <p><strong>Ödeme tutarı:</strong> ${amount}</p>
            <p><strong>Eşleştiğiniz uzman:</strong> ${expertName}</p>
            <p>Seans süreci için uzmanınız veya Mindora ekibi sizinle iletişime geçecektir.</p>
            <br />
            <p>Sevgiler,<br />Mindora Ekibi</p>
          </div>
        `,
      })
    )
  }

  if (expert?.email) {
    tasks.push(
      transporter.sendMail({
        from,
        to: expert.email,
        subject: 'Yeni danışan ödemeyi tamamladı',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
            <h2>Danışan ödemeyi tamamladı</h2>
            <p>Merhaba ${expertName},</p>
            <p>Size eşleştirilen danışan ödeme işlemini başarıyla tamamladı.</p>
            <p><strong>Danışan:</strong> ${clientName}</p>
            <p><strong>Toplam ödeme:</strong> ${amount}</p>
            <p><strong>Uzman payı:</strong> ${expertAmount}</p>
            <p>Seans sürecini başlatabilirsiniz.</p>
            <br />
            <p>Mindora Ekibi</p>
          </div>
        `,
      })
    )
  }

  if (adminMail) {
    tasks.push(
      transporter.sendMail({
        from,
        to: adminMail,
        subject: 'Mindora yeni ödeme aldı',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
            <h2>Yeni ödeme alındı</h2>
            <p><strong>Danışan:</strong> ${clientName}</p>
            <p><strong>Psikolog:</strong> ${expertName}</p>
            <p><strong>Toplam ödeme:</strong> ${amount}</p>
            <p><strong>Mindora komisyonu:</strong> ${commissionAmount}</p>
            <p><strong>Uzman payı:</strong> ${expertAmount}</p>
            <p><strong>Payment ID:</strong> ${payment?.id}</p>
            <p><strong>iyzico Payment ID:</strong> ${payment?.iyzico_payment_id || '-'}</p>
          </div>
        `,
      })
    )
  }

  const results = await Promise.allSettled(tasks)

  const failed = results.filter((result) => result.status === 'rejected')

  if (failed.length > 0) {
    console.error('Bazı ödeme mailleri gönderilemedi:', failed)
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = cleanUrl(process.env.IYZICO_BASE_URL)
  const siteUrl = cleanUrl(process.env.NEXT_PUBLIC_SITE_URL)

  try {
    if (!apiKey || !secretKey || !baseUrl || !siteUrl) {
      return NextResponse.json(
        { ok: false, error: 'Iyzico veya site env bilgileri eksik.' },
        { status: 500 }
      )
    }

    const token = await getTokenFromRequest(req)

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Callback token bulunamadı.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('iyzico_token', token)
      .maybeSingle()

    if (paymentError || !payment) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Bu token ile eşleşen ödeme kaydı bulunamadı.',
          detail: paymentError?.message || null,
        },
        { status: 404 }
      )
    }

    if (payment.status === 'paid') {
      return NextResponse.redirect(`${siteUrl}/odeme-basarili`, 303)
    }

    const uri = '/payment/iyzipos/checkoutform/auth/ecom/detail'
    const randomKey = `${Date.now()}${Math.floor(Math.random() * 100000)}`

    const requestBody = {
      locale: 'tr',
      conversationId: payment.iyzico_conversation_id,
      token,
    }

    const bodyStr = JSON.stringify(requestBody)
    const auth = createAuthHeader(apiKey, secretKey, randomKey, uri, bodyStr)

    const iyzicoRes = await fetch(`${baseUrl}${uri}`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'x-iyzi-rnd': randomKey,
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    })

    const iyzicoData = await iyzicoRes.json()

    if (!iyzicoRes.ok || iyzicoData.status !== 'success') {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          iyzico_payment_id: iyzicoData.paymentId || null,
        })
        .eq('id', payment.id)

      return NextResponse.redirect(`${siteUrl}/odeme-basarisiz`, 303)
    }

    if (iyzicoData.paymentStatus !== 'SUCCESS') {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          iyzico_payment_id: iyzicoData.paymentId || null,
        })
        .eq('id', payment.id)

      return NextResponse.redirect(`${siteUrl}/odeme-basarisiz`, 303)
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        iyzico_payment_id: iyzicoData.paymentId || null,
      })
      .eq('id', payment.id)
      .select('*')
      .single()

    if (updateError || !updatedPayment) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödeme başarılı ama DB güncellenemedi.',
          detail: updateError?.message || null,
          iyzico: iyzicoData,
        },
        { status: 500 }
      )
    }

    const [{ data: client }, { data: expert }] = await Promise.all([
      supabase
        .from('client_applications')
        .select('*')
        .eq('id', updatedPayment.client_id)
        .maybeSingle(),

      supabase
        .from('experts')
        .select('*')
        .eq('id', updatedPayment.expert_id)
        .maybeSingle(),
    ])

    if (client && expert) {
      await sendPaymentEmails({
        client,
        expert,
        payment: updatedPayment,
      })

      await supabase
        .from('client_applications')
        .update({
          status: 'completed',
        })
        .eq('id', client.id)
    }

    return NextResponse.redirect(`${siteUrl}/odeme-basarili`, 303)
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          'Payment callback sırasında beklenmeyen hata oluştu.',
      },
      { status: 500 }
    )
  }
}