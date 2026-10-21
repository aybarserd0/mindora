import { NextRequest, NextResponse } from 'next/server'
import { db, getBookingRole, jsonError, requireExpert } from '@/lib/supervision/server'
import { cleanPhone, iyzicoPost, money, readIyzicoEnv, splitName } from '@/lib/payments/iyzico'
import { getClientIp } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

type InitResponse = { status?: string; token?: string; paymentPageUrl?: string; errorMessage?: string }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-pay')
  if ('response' in auth) return auth.response

  const env = readIyzicoEnv()
  if (!env) return jsonError('Ödeme altyapısı yapılandırılmamış.', 500)

  const { id } = await ctx.params
  const found = await getBookingRole(id, auth.expertId)
  if (!found || found.role !== 'supervisee') return jsonError('Randevu bulunamadı.', 404)

  const { booking } = found
  if (booking.status !== 'accepted') return jsonError('Bu randevu için ödeme beklenmiyor.', 409)
  if (!(Number(booking.price) > 0)) return jsonError('Bu randevu ücretsiz.', 400)

  if (booking.payment_page_url && booking.iyzico_token) {
    return NextResponse.json({ ok: true, paymentPageUrl: booking.payment_page_url })
  }

  const supabase = db()
  const { data: expert } = await supabase
    .from('experts')
    .select('id, name, email, phone')
    .eq('id', auth.expertId)
    .maybeSingle()

  if (!expert?.email) return jsonError('Ödeme için hesabında geçerli bir e-posta olmalı.', 400)

  const rawIp = getClientIp(req)
  const ip = rawIp === 'unknown' ? null : rawIp
  const { name, surname } = splitName(expert.name)
  const conversationId = `supervision_${booking.id}_${Date.now()}`
  const address = { contactName: `${name} ${surname}`, city: 'Ankara', country: 'Turkey', address: 'Türkiye', zipCode: '06000' }

  const { ok, data } = await iyzicoPost<InitResponse>(env, '/payment/iyzipos/checkoutform/initialize/auth/ecom', {
    locale: 'tr',
    conversationId,
    price: money(booking.price),
    paidPrice: money(booking.price),
    currency: 'TRY',
    basketId: `mindora_sup_${booking.id}`,
    paymentGroup: 'PRODUCT',
    callbackUrl: `${env.siteUrl}/api/supervision/payment/callback`,
    buyer: {
      id: expert.id,
      name,
      surname,
      gsmNumber: cleanPhone(expert.phone),
      email: expert.email,
      identityNumber: '11111111111',
      registrationAddress: 'Türkiye',
      ip: ip || '127.0.0.1',
      city: 'Ankara',
      country: 'Turkey',
      zipCode: '06000',
    },
    shippingAddress: address,
    billingAddress: address,
    basketItems: [
      {
        id: `supervision_${booking.id}`,
        name: 'Mindora Klinik Süpervizyon Seansı',
        category1: 'Mesleki Süpervizyon',
        itemType: 'VIRTUAL',
        price: money(booking.price),
      },
    ],
  })

  if (!ok || data?.status !== 'success' || !data.token || !data.paymentPageUrl) {
    console.error('SUPERVISION_IYZICO_INIT_ERROR', data?.errorMessage)
    return jsonError(data?.errorMessage || 'Ödeme sayfası oluşturulamadı.', 400)
  }

  const { error } = await supabase
    .from('supervision_bookings')
    .update({ iyzico_token: data.token, iyzico_conversation_id: conversationId, payment_page_url: data.paymentPageUrl })
    .eq('id', booking.id)

  if (error) {
    console.error('SUPERVISION_PAYMENT_SAVE_ERROR', error)
    return jsonError('Ödeme kaydı oluşturulamadı.', 500)
  }

  return NextResponse.json({ ok: true, paymentPageUrl: data.paymentPageUrl })
}
