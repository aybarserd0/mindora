import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createConversationAccessToken } from '@/lib/chat-access-tokens'
import { createNotification } from '@/lib/notifications'
import { sendMail } from '@/lib/mail/smtp'
import { iyzicoPost, readIyzicoEnv } from './iyzico'
import { refundPayment } from './refund'
import { FREE_CANCELLATION_HOURS } from './policy'

// Danışanın kendi aldığı randevunun ödemesi. Eski "danışan başına tek ödeme"
// akışından ayrı tutulur: başarısız bir seans ödemesi var olan sohbeti kilitlemez.

type BookingPaymentRow = {
  id: string
  status: string
  client_id: string | null
  expert_id: string | null
  amount: number | string
  booking_id: string
  iyzico_conversation_id: string | null
  paid_notified_at: string | null
}

type CheckoutDetail = { status?: string; paymentStatus?: string; paymentId?: string; errorMessage?: string }

export type BookingPaymentResult = {
  outcome: 'paid' | 'already_paid' | 'verification_failed' | 'slot_taken_refunded' | 'db_update_failed'
  paymentId: string
  clientId?: string
  redirectPath: string
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(iso))
}

async function clientLinkToken(conversationId: string | null) {
  if (!conversationId) return null
  try {
    const access = await createConversationAccessToken({ conversationId, role: 'client', expiresInHours: 24 * 30 })
    return access.token
  } catch (error) {
    console.error('BOOKING_PAYMENT_CLIENT_TOKEN_ERROR', error)
    return null
  }
}

export async function resolveBookingPayment(payment: BookingPaymentRow, token: string): Promise<BookingPaymentResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any

  const { data: booking } = await supabase
    .from('session_bookings')
    .select('id, conversation_id, expert_id, client_id, scheduled_start_at, scheduled_end_at, status')
    .eq('id', payment.booking_id)
    .maybeSingle()

  const conversationId: string | null = booking?.conversation_id || null

  if (payment.status === 'paid') {
    const t = await clientLinkToken(conversationId)
    return { outcome: 'already_paid', paymentId: payment.id, clientId: payment.client_id || undefined, redirectPath: `/odeme-basarili?seans=1${t ? `&token=${t}` : ''}` }
  }

  const env = readIyzicoEnv()
  const { ok, data } = env
    ? await iyzicoPost<CheckoutDetail>(env, '/payment/iyzipos/checkoutform/auth/ecom/detail', {
        locale: 'tr',
        conversationId: payment.iyzico_conversation_id,
        token,
      })
    : { ok: false, data: null }

  const verified = ok && data?.status === 'success' && data?.paymentStatus === 'SUCCESS'
  const nowIso = new Date().toISOString()

  if (!verified) {
    await supabase.from('payments').update({ status: 'failed', iyzico_payment_id: data?.paymentId || null }).eq('id', payment.id).neq('status', 'paid')
    if (booking?.status === 'pending_payment') {
      await supabase
        .from('session_bookings')
        .update({ status: 'cancelled', cancellation_reason: 'Ödeme tamamlanmadı.', cancelled_at: nowIso, updated_at: nowIso })
        .eq('id', booking.id)
        .eq('status', 'pending_payment')
    }
    const t = await clientLinkToken(conversationId)
    return { outcome: 'verification_failed', paymentId: payment.id, clientId: payment.client_id || undefined, redirectPath: `/odeme-basarisiz?seans=1${t ? `&token=${t}` : ''}` }
  }

  const { error: paidError } = await supabase
    .from('payments')
    .update({ status: 'paid', iyzico_payment_id: data?.paymentId || null })
    .eq('id', payment.id)
    .neq('status', 'paid')

  if (paidError) {
    console.error('BOOKING_PAYMENT_MARK_PAID_ERROR', paidError)
    return { outcome: 'db_update_failed', paymentId: payment.id, redirectPath: '/odeme-basarisiz' }
  }

  // Ödeme süresi dolup saat serbest kaldıysa: hâlâ boşsa geri al, doluysa iade et
  let confirmed = booking?.status === 'pending_payment' || booking?.status === 'scheduled'
  if (booking && booking.status === 'cancelled') {
    const { data: overlapping } = await supabase
      .from('session_bookings')
      .select('id')
      .eq('expert_id', booking.expert_id)
      .in('status', ['pending_payment', 'scheduled', 'confirmed', 'active'])
      .lt('scheduled_start_at', booking.scheduled_end_at)
      .gt('scheduled_end_at', booking.scheduled_start_at)
      .neq('id', booking.id)
    confirmed = (overlapping || []).length === 0
  }

  if (!booking || !confirmed) {
    await refundPayment(payment.id)
    if (payment.client_id) {
      await createNotification({
        supabase,
        userType: 'client',
        userId: payment.client_id,
        title: 'Seçtiğin saat doldu',
        message: 'Ödeme sırasında seçtiğin saat başka bir danışana verildi. Ödemen kartına iade edildi; lütfen yeni bir saat seç.',
        type: 'payment',
      })
    }
    const t = await clientLinkToken(conversationId)
    return { outcome: 'slot_taken_refunded', paymentId: payment.id, clientId: payment.client_id || undefined, redirectPath: `/odeme-basarisiz?seans=1&iade=1${t ? `&token=${t}` : ''}` }
  }

  await supabase
    .from('session_bookings')
    .update({ status: 'scheduled', cancellation_reason: null, cancelled_at: null, updated_at: nowIso })
    .eq('id', booking.id)
    .in('status', ['pending_payment', 'cancelled'])

  if (conversationId) {
    await supabase.from('conversations').update({ status: 'active', payment_status: 'paid', updated_at: nowIso }).eq('id', conversationId)
  }

  const t = await clientLinkToken(conversationId)

  if (!payment.paid_notified_at) {
    await notifyBookingConfirmed({ supabase, payment, booking, conversationId, clientToken: t })
    await supabase.from('payments').update({ paid_notified_at: nowIso }).eq('id', payment.id)
  }

  return { outcome: 'paid', paymentId: payment.id, clientId: payment.client_id || undefined, redirectPath: `/odeme-basarili?seans=1${t ? `&token=${t}` : ''}` }
}

async function notifyBookingConfirmed({
  supabase,
  payment,
  booking,
  conversationId,
  clientToken,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  payment: BookingPaymentRow
  booking: { scheduled_start_at: string }
  conversationId: string | null
  clientToken: string | null
}) {
  const env = readIyzicoEnv()
  const siteUrl = env?.siteUrl || ''
  const when = formatWhen(booking.scheduled_start_at)

  const [{ data: client }, { data: expert }] = await Promise.all([
    payment.client_id ? supabase.from('client_applications').select('name, email').eq('id', payment.client_id).maybeSingle() : { data: null },
    payment.expert_id ? supabase.from('experts').select('name, email').eq('id', payment.expert_id).maybeSingle() : { data: null },
  ])

  const clientPanel = clientToken ? `${siteUrl}/client/dashboard/sessions?token=${clientToken}` : `${siteUrl}`
  const expertPanel = `${siteUrl}/expert/dashboard/sessions`

  const jobs: Promise<unknown>[] = []

  if (client?.email) {
    jobs.push(
      sendMail({
        to: client.email,
        subject: `Seansın onaylandı: ${when}`,
        text: `Merhaba ${client.name || ''},

Ödemen alındı ve seansın onaylandı.

Uzman: ${expert?.name || 'Uzmanın'}
Tarih: ${when}
Süre: yaklaşık 50 dakika, online

Görüşme saatinden 15 dakika önce panelindeki sohbet ekranından "Görüntülü görüşmeye katıl" düğmesiyle odaya girebilirsin.
Panelin: ${clientPanel}

İptal kuralı: Seansa ${FREE_CANCELLATION_HOURS} saatten fazla varken iptal edersen ücretin tamamı iade edilir. Daha geç iptallerde iade yapılmaz.

Mindora acil durum hizmeti değildir. Acil bir durumda 112'yi ara.

Mindora`,
      })
    )
  }

  if (expert?.email) {
    jobs.push(
      sendMail({
        to: expert.email,
        subject: `Yeni seans: ${when}`,
        text: `Merhaba ${expert.name || ''},

${client?.name || 'Danışanın'} ${when} için seans aldı ve ödemesini tamamladı.

Görüşmeden 15 dakika önce sohbet ekranından odaya girebilirsin.
Panelin: ${expertPanel}

Mindora`,
      })
    )
  }

  if (payment.client_id) {
    jobs.push(
      createNotification({
        supabase,
        userType: 'client',
        userId: payment.client_id,
        title: 'Seansın onaylandı',
        message: `${when} tarihindeki seansın için ödeme alındı.`,
        type: 'session',
        link: conversationId ? `/client/chat/${conversationId}` : undefined,
      })
    )
  }
  if (payment.expert_id) {
    jobs.push(
      createNotification({
        supabase,
        userType: 'expert',
        userId: payment.expert_id,
        title: 'Yeni seans',
        message: `${client?.name || 'Bir danışan'} ${when} için seans aldı.`,
        type: 'session',
        link: '/expert/dashboard/sessions',
      })
    )
  }

  const results = await Promise.allSettled(jobs)
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length) console.error('BOOKING_CONFIRMED_NOTIFY_ERROR', failed)
}
