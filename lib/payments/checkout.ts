import { cleanPhone, iyzicoPost, money, readIyzicoEnv, splitName } from './iyzico'

type CheckoutInitResponse = {
  status?: string
  errorMessage?: string
  token?: string
  paymentPageUrl?: string
}

/**
 * Bir seans için Iyzico ödeme formu başlatır. Danışan ödeme sayfasına
 * yönlendirilir; sonuç /api/payment/callback üzerinden işlenir.
 */
export async function initSessionCheckout({
  paymentId,
  bookingId,
  amount,
  client,
  expertName,
  ip,
}: {
  paymentId: string
  bookingId: string
  amount: number
  client: { id: string; name: string | null; email: string | null; phone: string | null }
  expertName: string | null
  ip: string
}): Promise<{ ok: true; token: string; paymentPageUrl: string; conversationId: string } | { ok: false; error: string }> {
  const env = readIyzicoEnv()
  if (!env) return { ok: false, error: 'Ödeme altyapısı şu anda yapılandırılmamış.' }

  const email = (client.email || '').trim()
  if (!email) return { ok: false, error: 'Ödeme için kayıtlı bir e-posta adresi gerekiyor.' }

  const { name, surname } = splitName(client.name || 'Mindora Danışan')
  const conversationId = `booking_${bookingId}_${Date.now()}`
  const address = { contactName: `${name} ${surname}`, city: 'Ankara', country: 'Turkey', address: 'Türkiye', zipCode: '06000' }

  const { ok, data } = await iyzicoPost<CheckoutInitResponse>(env, '/payment/iyzipos/checkoutform/initialize/auth/ecom', {
    locale: 'tr',
    conversationId,
    price: money(amount),
    paidPrice: money(amount),
    currency: 'TRY',
    basketId: `mindora_booking_${bookingId}`,
    paymentGroup: 'PRODUCT',
    callbackUrl: `${env.siteUrl}/api/payment/callback`,
    buyer: {
      id: client.id,
      name,
      surname,
      gsmNumber: cleanPhone(client.phone),
      email,
      identityNumber: '11111111111',
      registrationAddress: 'Türkiye',
      ip,
      city: 'Ankara',
      country: 'Turkey',
      zipCode: '06000',
    },
    shippingAddress: address,
    billingAddress: address,
    basketItems: [
      {
        id: `session_${paymentId}`,
        name: `Mindora Psikolojik Danışmanlık Seansı - ${expertName || 'Uzman'}`.slice(0, 120),
        category1: 'Psikolojik Danışmanlık',
        itemType: 'VIRTUAL',
        price: money(amount),
      },
    ],
  })

  if (!ok || !data || data.status !== 'success' || !data.token || !data.paymentPageUrl) {
    return { ok: false, error: data?.errorMessage || 'Ödeme sayfası oluşturulamadı.' }
  }

  return { ok: true, token: data.token, paymentPageUrl: data.paymentPageUrl, conversationId }
}
