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

function cleanUrl(url?: string | null) {
  return (url || '').replace(/\/+$/, '')
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

async function getTokenFromRequest(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null)
    return toText(body?.token) || null
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

function formatMoney(value?: number | string | null) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return '0 TL'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

async function sendPaymentEmails({
  client,
  expert,
  payment,
  conversation,
  siteUrl,
}: {
  client: any
  expert: any
  payment: any
  conversation?: any
  siteUrl: string
}) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user
  const adminMail = process.env.ADMIN_EMAIL || process.env.CONTACT_TO || user

  if (!host || !user || !pass || !from) {
    console.warn('SMTP env eksik. Ödeme mail gönderimi atlandı.')
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
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

  const conversationId = toText(conversation?.id)
  const clientChatLink = conversationId
    ? `${siteUrl}/client/chat/${conversationId}`
    : siteUrl
  const expertChatLink = conversationId
    ? `${siteUrl}/expert/chat/${conversationId}`
    : siteUrl
  const adminConversationLink = conversationId
    ? `${siteUrl}/admin/conversations/${conversationId}`
    : siteUrl

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
            <p>Platform içi iletişim alanınız artık aktif hale getirilmiştir.</p>
            <p>
              <a href="${clientChatLink}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">
                Güvenli Chat Alanını Aç
              </a>
            </p>
            <p>Güvenliğiniz ve sürecin sağlıklı ilerlemesi için tüm iletişim Mindora üzerinden yürütülmelidir.</p>
            <p>Uzmanınızın telefon veya e-posta bilgileri gizlilik politikamız gereği paylaşılmamaktadır.</p>
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
            <p>Platform içi iletişim alanı aktif hale getirilmiştir.</p>
            <p>
              <a href="${expertChatLink}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">
                Uzman Chat Alanını Aç
              </a>
            </p>
            <p>Danışanla iletişim yalnızca Mindora üzerinden yürütülmelidir.</p>
            <p>Danışanın telefon veya e-posta bilgileri gizlilik politikamız gereği paylaşılmamaktadır.</p>
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
            <p><strong>Payment ID:</strong> ${payment?.id || '-'}</p>
            <p><strong>iyzico Payment ID:</strong> ${payment?.iyzico_payment_id || '-'}</p>
            <p><strong>Conversation ID:</strong> ${conversation?.id || '-'}</p>
            <p><strong>Conversation Status:</strong> ${conversation?.status || '-'}</p>
            <p><strong>Conversation Payment Status:</strong> ${conversation?.payment_status || '-'}</p>
            <p><strong>Admin Link:</strong> ${adminConversationLink}</p>
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

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('iyzico_token', token)
      .maybeSingle()

    if (paymentError || !paymentData) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Bu token ile eşleşen ödeme kaydı bulunamadı.',
          detail: paymentError?.message || null,
        },
        { status: 404 }
      )
    }

    const payment = paymentData

    if (!payment.client_id) {
      console.error('PAYMENT CALLBACK MISSING CLIENT ID:', payment.id)
      return NextResponse.redirect(`${siteUrl}/odeme-basarisiz`, 303)
    }

    if (payment.status === 'paid') {
      await supabase
        .from('conversations')
        .update({
          status: 'active',
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('client_application_id', payment.client_id)

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

    const iyzicoData = await iyzicoRes.json().catch(() => null)

    if (!iyzicoData || !iyzicoRes.ok || iyzicoData.status !== 'success') {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          iyzico_payment_id: iyzicoData?.paymentId || null,
        })
        .eq('id', payment.id)

      await supabase
        .from('conversations')
        .update({
          status: 'locked',
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('client_application_id', payment.client_id)

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

      await supabase
        .from('conversations')
        .update({
          status: 'locked',
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('client_application_id', payment.client_id)

      return NextResponse.redirect(`${siteUrl}/odeme-basarisiz`, 303)
    }

    const { data: updatedPaymentData, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        iyzico_payment_id: iyzicoData.paymentId || null,
      })
      .eq('id', payment.id)
      .select('*')
      .single()

    if (updateError || !updatedPaymentData) {
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

    const updatedPayment = updatedPaymentData

    if (!updatedPayment.client_id || !updatedPayment.expert_id) {
      console.error('PAYMENT CALLBACK UPDATED PAYMENT MISSING IDS:', {
         paymentId: updatedPayment.id,
         clientId: updatedPayment.client_id,
         expertId: updatedPayment.expert_id,
     })

      return NextResponse.redirect(`${siteUrl}/odeme-basarisiz`, 303)
    }

    const { data: existingConversation, error: existingConversationError } =
      await supabase
        .from('conversations')
        .select('*')
        .eq('client_application_id', updatedPayment.client_id)
        .maybeSingle()

    if (existingConversationError) {
      console.error(
        'PAYMENT CALLBACK CONVERSATION CHECK ERROR:',
        existingConversationError
      )
    }

    let conversation = existingConversation

    if (conversation) {
      const { data: activatedConversation, error: activateConversationError } =
        await supabase
          .from('conversations')
          .update({
            expert_id: updatedPayment.expert_id,
            status: 'active',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.id)
          .select('*')
          .single()

      if (activateConversationError) {
        console.error(
          'PAYMENT CALLBACK CONVERSATION ACTIVATE ERROR:',
          activateConversationError
        )
      } else {
        conversation = activatedConversation
      }
    } else {
      const { data: createdConversation, error: createConversationError } =
        await supabase
          .from('conversations')
          .insert({
            client_application_id: updatedPayment.client_id,
            expert_id: updatedPayment.expert_id,
            status: 'active',
            payment_status: 'paid',
          })
          .select('*')
          .single()

      if (createConversationError) {
        console.error(
          'PAYMENT CALLBACK CONVERSATION CREATE ERROR:',
          createConversationError
        )
      } else {
        conversation = createdConversation
      }
    }

    const shouldSendNotification = !updatedPayment.paid_notified_at

    if (shouldSendNotification && updatedPayment.client_id && updatedPayment.expert_id) {
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
          conversation,
          siteUrl,
        })

        await Promise.all([
          supabase
            .from('payments')
            .update({
              paid_notified_at: new Date().toISOString(),
            })
            .eq('id', updatedPayment.id),

          supabase
            .from('client_applications')
            .update({
              status: 'contacted',
            })
            .eq('id', client.id),
        ])
      }
    }

    return NextResponse.redirect(`${siteUrl}/odeme-basarili`, 303)
  } catch (err: any) {
    console.error('PAYMENT CALLBACK SERVER ERROR:', err)

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