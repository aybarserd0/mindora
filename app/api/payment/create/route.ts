import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

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
    const apiKey = process.env.IYZICO_API_KEY!
    const secretKey = process.env.IYZICO_SECRET_KEY!
    const baseUrl = process.env.IYZICO_BASE_URL!

    const { price } = await req.json()

    if (!price) {
      return NextResponse.json({ ok: false, error: 'price gerekli' }, { status: 400 })
    }

    const uri = '/payment/iyzipos/checkoutform/initialize'

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
        lastLoginDate: '2020-05-15 12:43:35',
        registrationDate: '2013-04-21 15:12:09',
        registrationAddress: 'Ankara',
        ip: '85.34.78.112',
        city: 'Ankara',
        country: 'Turkey',
        zipCode: '06000'
      },
      shippingAddress: {
        contactName: 'Test User',
        city: 'Ankara',
        country: 'Turkey',
        address: 'Ankara',
        zipCode: '06000'
      },
      billingAddress: {
        contactName: 'Test User',
        city: 'Ankara',
        country: 'Turkey',
        address: 'Ankara',
        zipCode: '06000'
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
    {
      ok: false,
      error: data.errorMessage || 'iyzico ödeme başlatılamadı',
      iyzico: data
    },
    { status: 400 }
  )
}

    return NextResponse.json({
      ok: true,
      checkoutFormContent: data.checkoutFormContent
    })

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}