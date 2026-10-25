import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { iyzicoPost, money, readIyzicoEnv } from './iyzico'

type RefundablePayment = {
  id: string
  amount: number | string
  status: string
  refund_status?: string | null
  iyzico_payment_id: string | null
  client_id: string | null
}

type IyzicoRefundResponse = {
  status?: string
  errorMessage?: string
  errorCode?: string
  paymentId?: string
  price?: number
  hostReference?: string
  refundHostReference?: string
}

export type RefundResult =
  | { ok: true; status: 'refunded' }
  | { ok: false; status: 'failed' | 'skipped'; error: string }

/**
 * Danışan ödemesini Iyzico üzerinden tam tutarla iade eder.
 * Başarısız olursa ödeme "iade bekliyor/başarısız" olarak işaretlenir ve
 * admin ödeme ekranından tekrar denenebilir. Aynı ödeme iki kez iade edilmez.
 */
export async function refundPayment(
  paymentId: string,
  opts: { ip?: string | null; allowPendingRetry?: boolean } = {}
): Promise<RefundResult> {
  // Tablo tipleri yeni sütunları içeriyor; dinamik güncellemeler için gevşek istemci
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any

  const { data } = await supabase
    .from('payments')
    .select('id, amount, status, refund_status, iyzico_payment_id, client_id')
    .eq('id', paymentId)
    .maybeSingle()

  const payment = data as RefundablePayment | null
  if (!payment) return { ok: false, status: 'skipped', error: 'Ödeme bulunamadı.' }
  if (payment.status === 'refunded' || payment.refund_status === 'refunded') return { ok: true, status: 'refunded' }
  if (payment.status !== 'paid') return { ok: false, status: 'skipped', error: 'Yalnızca tamamlanmış ödemeler iade edilebilir.' }

  const amount = Number(payment.amount)
  const now = new Date().toISOString()

  // Önce "bekliyor" olarak işaretle: eşzamanlı ikinci istek aynı ödemeyi iade etmesin
  const { data: claimed } = await supabase
    .from('payments')
    .update({ refund_status: 'pending', refund_requested_at: now, refund_error: null })
    .eq('id', payment.id)
    .in('refund_status', opts.allowPendingRetry ? ['none', 'failed', 'pending'] : ['none', 'failed'])
    .select('id')
    .maybeSingle()

  if (!claimed) return { ok: false, status: 'skipped', error: 'Bu ödeme için iade zaten işleniyor.' }

  const fail = async (error: string): Promise<RefundResult> => {
    await supabase.from('payments').update({ refund_status: 'failed', refund_error: error.slice(0, 500) }).eq('id', payment.id)
    return { ok: false, status: 'failed', error }
  }

  const env = readIyzicoEnv()
  if (!env) return fail('Iyzico ayarları eksik.')
  if (!payment.iyzico_payment_id) return fail('Ödemenin Iyzico kimliği yok; iade panelden elle yapılmalı.')

  const { ok, data: res } = await iyzicoPost<IyzicoRefundResponse>(env, '/v2/payment/refund', {
    locale: 'tr',
    conversationId: `refund_${payment.id}`,
    paymentId: payment.iyzico_payment_id,
    price: money(amount),
    currency: 'TRY',
    ...(opts.ip ? { ip: opts.ip } : {}),
  })

  if (!ok || !res || res.status !== 'success') {
    return fail(res?.errorMessage || 'Iyzico iadeyi kabul etmedi.')
  }

  await supabase
    .from('payments')
    .update({
      status: 'refunded',
      refunded_at: now,
      refund_status: 'refunded',
      refund_amount: amount,
      iyzico_refund_id: res.refundHostReference || res.hostReference || null,
    })
    .eq('id', payment.id)

  // İade edilen ödeme uzmana aktarılmaz (ayrı güncelleme: kısıt farklıysa iade kaydı etkilenmesin)
  await supabase
    .from('payments')
    .update({ expert_payout_status: 'blocked' })
    .eq('id', payment.id)
    .neq('expert_payout_status', 'paid')

  // Tek bir seansın iadesi sohbeti kilitlememeli: danışanın başka ödenmiş
  // seansı varsa sohbet açık kalır. Hiç ödenmiş seansı kalmadıysa iade
  // olarak işaretlenir; yeni seans aldığında tekrar açılır.
  if (payment.client_id) {
    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', payment.client_id)
      .eq('status', 'paid')
    if (!count) {
      await supabase
        .from('conversations')
        .update({ payment_status: 'refunded' })
        .eq('client_application_id', payment.client_id)
    }
  }

  return { ok: true, status: 'refunded' }
}
