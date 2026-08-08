import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createConversationAccessToken } from '@/lib/chat-access-tokens'
import { sendMail } from '@/lib/mail/smtp'
import { paymentFailedClientTemplate } from '@/lib/mail/templates'
import { createNotification } from '@/lib/notifications'

/**
 * Single source of truth for turning an iyzico checkout-form `token` into a
 * confirmed payment. Called from both the browser-redirected callback route
 * (`/api/payment/callback`) and the async merchant-panel webhook
 * (`/api/payment/webhook`), so a closed tab between "pay" and "redirect"
 * doesn't leave a payment stuck in `pending` forever — the webhook resolves
 * it independently using the exact same server-to-server verification.
 *
 * Never trusts caller-supplied status: always re-verifies the token against
 * iyzico's authenticated "retrieve checkout form" endpoint before mutating
 * anything.
 */

export type ResolvePaymentOutcome =
  | 'not_found'
  | 'missing_client'
  | 'already_paid'
  | 'already_failed'
  | 'verification_failed'
  | 'db_update_failed'
  | 'missing_ids'
  | 'paid'

export type ResolvePaymentResult = {
  outcome: ResolvePaymentOutcome
  paymentId?: string
  clientId?: string
  detail?: string
}

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

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
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

async function notifyPaymentFailedClient(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  clientId: string | null | undefined
) {
  if (!clientId) return

  const { data, error } = await supabase
    .from('client_applications' as never)
    .select('name,email')
    .eq('id', clientId as never)
    .maybeSingle()

  if (error) {
    console.error('Payment failed client lookup error:', error)
    return
  }

  const client = data as unknown as { name?: string; email?: string } | null

  await createNotification({
    supabase,
    userType: 'client',
    userId: clientId,
    title: 'Ödeme tamamlanamadı',
    message: 'Ödeme işleminiz tamamlanamadı. Tekrar deneyebilirsiniz.',
    type: 'payment',
  })

  if (!client?.email) return

  try {
    await sendMail({
      to: client.email,
      subject: 'Mindora ödemeniz tamamlanamadı',
      text: paymentFailedClientTemplate({ clientName: client.name || 'Danışan' }),
    })
  } catch (mailError) {
    console.error('Payment failed email error:', mailError)
  }
}

async function sendPaymentEmails({
  client,
  expert,
  payment,
  conversation,
  siteUrl,
  clientChatLink,
  expertChatLink,
}: {
  client: any
  expert: any
  payment: any
  conversation?: any
  siteUrl: string
  clientChatLink: string
  expertChatLink: string
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
            <p>Bu bağlantı size özel güvenli erişim bağlantısıdır. Lütfen başkalarıyla paylaşmayınız.</p>
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
            <p>Bu bağlantı size özel güvenli uzman erişim bağlantısıdır. Lütfen başkalarıyla paylaşmayınız.</p>
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

export async function resolveIyzicoPaymentByToken({
  token,
  apiKey,
  secretKey,
  baseUrl,
  siteUrl,
}: {
  token: string
  apiKey: string
  secretKey: string
  baseUrl: string
  siteUrl: string
}): Promise<ResolvePaymentResult> {
  const supabase = getSupabaseAdmin()

  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('iyzico_token', token)
    .maybeSingle()

  if (paymentError || !paymentData) {
    return { outcome: 'not_found', detail: paymentError?.message }
  }

  const payment = paymentData as any

  if (!payment.client_id) {
    console.error('PAYMENT RESOLVE MISSING CLIENT ID:', payment.id)
    return { outcome: 'missing_client', paymentId: payment.id }
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

    return { outcome: 'already_paid', paymentId: payment.id, clientId: payment.client_id }
  }

  if (payment.status === 'failed') {
    return { outcome: 'already_failed', paymentId: payment.id, clientId: payment.client_id }
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

  const verified =
    iyzicoData && iyzicoRes.ok && iyzicoData.status === 'success' && iyzicoData.paymentStatus === 'SUCCESS'

  if (!verified) {
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

    await notifyPaymentFailedClient(supabase, payment.client_id)

    return { outcome: 'verification_failed', paymentId: payment.id, clientId: payment.client_id }
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
    return {
      outcome: 'db_update_failed',
      paymentId: payment.id,
      clientId: payment.client_id,
      detail: updateError?.message,
    }
  }

  const updatedPayment = updatedPaymentData as any

  if (!updatedPayment.client_id || !updatedPayment.expert_id) {
    console.error('PAYMENT RESOLVE UPDATED PAYMENT MISSING IDS:', {
      paymentId: updatedPayment.id,
      clientId: updatedPayment.client_id,
      expertId: updatedPayment.expert_id,
    })

    return { outcome: 'missing_ids', paymentId: updatedPayment.id, clientId: updatedPayment.client_id }
  }

  const { data: existingConversation, error: existingConversationError } = await supabase
    .from('conversations')
    .select('*')
    .eq('client_application_id', updatedPayment.client_id)
    .maybeSingle()

  if (existingConversationError) {
    console.error('PAYMENT RESOLVE CONVERSATION CHECK ERROR:', existingConversationError)
  }

  let conversation = existingConversation as any

  if (conversation) {
    const { data: activatedConversation, error: activateConversationError } = await supabase
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
      console.error('PAYMENT RESOLVE CONVERSATION ACTIVATE ERROR:', activateConversationError)
    } else {
      conversation = activatedConversation
    }
  } else {
    const { data: createdConversation, error: createConversationError } = await supabase
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
      console.error('PAYMENT RESOLVE CONVERSATION CREATE ERROR:', createConversationError)
    } else {
      conversation = createdConversation
    }
  }

  const shouldSendNotification = !updatedPayment.paid_notified_at

  if (
    shouldSendNotification &&
    updatedPayment.client_id &&
    updatedPayment.expert_id &&
    conversation?.id
  ) {
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
      const [clientAccess, expertAccess] = await Promise.all([
        createConversationAccessToken({
          conversationId: conversation.id,
          role: 'client',
          expiresInHours: 24 * 7,
        }),
        createConversationAccessToken({
          conversationId: conversation.id,
          role: 'expert',
          expiresInHours: 24 * 7,
        }),
      ])

      const clientChatLink = `${siteUrl}/client/chat/${conversation.id}?token=${clientAccess.token}`
      const expertChatLink = `${siteUrl}/expert/chat/${conversation.id}?token=${expertAccess.token}`

      await sendPaymentEmails({
        client,
        expert,
        payment: updatedPayment,
        conversation,
        siteUrl,
        clientChatLink,
        expertChatLink,
      })

      await Promise.all([
        createNotification({
          supabase,
          userType: 'client',
          userId: updatedPayment.client_id,
          title: 'Ödemeniz alındı',
          message: `${expert.name || 'Uzmanınız'} ile seans ödemeniz başarıyla tamamlandı.`,
          type: 'payment',
          link: `/client/chat/${conversation.id}`,
        }),
        createNotification({
          supabase,
          userType: 'expert',
          userId: updatedPayment.expert_id,
          title: 'Danışan ödemeyi tamamladı',
          message: `${client.name || 'Danışanınız'} için ödeme başarıyla alındı.`,
          type: 'payment',
          link: `/expert/chat/${conversation.id}`,
        }),
      ])

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

  return { outcome: 'paid', paymentId: updatedPayment.id, clientId: updatedPayment.client_id }
}
