import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function createAuthHeader(apiKey: string, secretKey: string, randomKey: string, uri: string, body: string) {
  const payload = randomKey + uri + body

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex')

  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`

  return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`
}

export async function POST(req: NextRequest) {
  try {
    const { expertId } = await req.json()

    if (!expertId) {
      return NextResponse.json({ ok: false, error: 'expertId gerekli' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: expert } = await supabase
      .from('experts')
      .select('session_price')
      .eq('id', expertId)
      .single()

    if (!expert || !expert.session_price) {
      return NextResponse.json(
        { ok: false, error: 'Uzman fiyatı bulunamadı' },
        { status: 400 }
      )
    }

    const price = expert.session_price

    const apiKey = process.env.IYZICO_API_KEY!
    const secretKey = process.env.IYZICO_SECRET_KEY!
    const baseUrl = process.env.IYZICO_BASE_URL!

    const uri = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
    const randomKey = Date.now().toString()

    const body = {
      locale: 'tr',
      conversationId: 'payment_' + randomKey,
      price: price.toString(),
      paidPrice: price.toString(),
      currency: 'TRY',
      basketId: 'B67832',
      paymentGroup: 'PRODUCT',
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`,
      buyer: {
        id: 'BY789',
        name: 'Test',
        surname: 'User',
        gsmNumber: '+905350000000',
        email: 'test@test.com',
        identityNumber: '11111111111',
        registrationAddress: 'Ankara',
        ip: '85.34.78.112',
        city: 'Ankara',
        country: 'Turkey'
      },
      shippingAddress: {
        contactName: 'Test User',
        city: 'Ankara',
        country: 'Turkey',
        address: 'Ankara'
      },
      billingAddress: {
        contactName: 'Test User',
        city: 'Ankara',
        country: 'Turkey',
        address: 'Ankara'
      },
      basketItems: [
        {
          id: 'BI101',
          name: 'Psikolojik Danışmanlık',
          category1: 'Danışmanlık',
          itemType: 'VIRTUAL',
          price: price.toString()
        }
      ]
    }

    const bodyStr = JSON.stringify(body)

    const auth = createAuthHeader(apiKey, secretKey, randomKey, uri, bodyStr)

    const res = await fetch(baseUrl + uri, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'x-iyzi-rnd': randomKey,
        'Content-Type': 'application/json'
      },
      body: bodyStr
    })

    const data = await res.json()

    if (data.status !== 'success') {
      return NextResponse.json(
        { ok: false, error: data.errorMessage, iyzico: data },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      paymentPageUrl: data.paymentPageUrl,
      token: data.token
    })

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}