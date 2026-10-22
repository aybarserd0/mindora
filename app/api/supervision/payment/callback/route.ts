import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supervision/server'
import { iyzicoPost, readIyzicoEnv } from '@/lib/payments/iyzico'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

type DetailResponse = { status?: string; paymentStatus?: string; paymentId?: string; paidPrice?: string }

async function readToken(req: NextRequest) {
  const type = req.headers.get('content-type') || ''
  if (type.includes('application/json')) {
    const body = await req.json().catch(() => null)
    return typeof body?.token === 'string' ? body.token : null
  }
  const form = await req.formData().catch(() => null)
  return form?.get('token')?.toString() || null
}

function redirectTo(siteUrl: string, result: 'basarili' | 'basarisiz') {
  // Iyzico POST ile döner; 303 ile tarayıcıyı GET'e çeviriyoruz
  return NextResponse.redirect(`${siteUrl}/expert/dashboard/supervizyon?odeme=${result}`, 303)
}

export async function POST(req: NextRequest) {
  const env = readIyzicoEnv()
  if (!env) return NextResponse.json({ ok: false, error: 'Ödeme altyapısı yapılandırılmamış.' }, { status: 500 })

  const token = await readToken(req)
  if (!token) return redirectTo(env.siteUrl, 'basarisiz')

  const supabase = db()
  const { data: booking } = await supabase
    .from('supervision_bookings')
    .select('id, status, price, iyzico_conversation_id, supervisor_profile_id, supervisor_profiles!inner(expert_id)')
    .eq('iyzico_token', token)
    .maybeSingle()

  if (!booking) return redirectTo(env.siteUrl, 'basarisiz')
  if (booking.status === 'confirmed') return redirectTo(env.siteUrl, 'basarili')
  if (booking.status !== 'accepted') return redirectTo(env.siteUrl, 'basarisiz')

  const { ok, data } = await iyzicoPost<DetailResponse>(env, '/payment/iyzipos/checkoutform/auth/ecom/detail', {
    locale: 'tr',
    conversationId: booking.iyzico_conversation_id,
    token,
  })

  const paidAmountMatches = Number(data?.paidPrice) >= Number(booking.price) - 0.01
  const verified = ok && data?.status === 'success' && data.paymentStatus === 'SUCCESS' && paidAmountMatches

  if (!verified) {
    // Yeni bir deneme için ödeme sayfası bilgisini temizle
    await supabase
      .from('supervision_bookings')
      .update({ iyzico_token: null, payment_page_url: null })
      .eq('id', booking.id)
      .eq('status', 'accepted')
    return redirectTo(env.siteUrl, 'basarisiz')
  }

  const { error } = await supabase
    .from('supervision_bookings')
    .update({
      status: 'confirmed',
      paid_at: new Date().toISOString(),
      iyzico_payment_id: data?.paymentId || null,
      room_name: `sup_${booking.id}`,
    })
    .eq('id', booking.id)
    .eq('status', 'accepted')

  if (error) {
    console.error('SUPERVISION_PAYMENT_CONFIRM_ERROR', error)
    return redirectTo(env.siteUrl, 'basarisiz')
  }

  await createNotification({
    supabase,
    userType: 'expert',
    userId: booking.supervisor_profiles?.expert_id || null,
    title: 'Süpervizyon seansı kesinleşti',
    message: 'Ödeme tamamlandı. Seans saatinde Süpervizör paneli üzerinden görüşmeye katılabilirsin.',
    type: 'payment',
    link: '/expert/dashboard/supervizor',
  })

  return redirectTo(env.siteUrl, 'basarili')
}
