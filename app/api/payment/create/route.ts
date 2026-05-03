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

function cleanSiteUrl(url?: string) {
  return (url || '').replace(/\/$/, '')
}

function cleanPhone(phone?: string | null) {
  if (!phone) return '+905350000000'

  let value = phone.replace(/\s/g, '')

  if (value.startsWith('0')) value = '+9' + value
  if (!value.startsWith('+90')) return '+905350000000'

  return value
}

function splitName(fullName?: string | null) {
  const parts = (fullName || 'Mindora Danışan').trim().split(' ')

  return {
    name: parts[0] || 'Mindora',
    surname: parts.slice(1).join(' ') || 'Danışan',
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = process.env.IYZICO_BASE_URL
    const siteUrl = cleanSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

    if (!apiKey || !secretKey || !baseUrl || !siteUrl) {
      return NextResponse.json(
        { ok: false, error: 'Iyzico veya site env bilgileri eksik.' },
        { status: 500 }
      )
    }

    const { clientId } = await req.json()

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: 'clientId gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: client, error: clientError } = await supabase
      .from('client_applications')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { ok: false, error: 'Danışan başvurusu bulunamadı.' },
        { status: 404 }
      )
    }

    if (!client.matched_expert_id) {
      return NextResponse.json(
        { ok: false, error: 'Bu danışan henüz bir psikologla eşleştirilmemiş.' },
        { status: 400 }
      )
    }

    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select('id, full_name, name, email, session_price, status')
      .eq('id', client.matched_expert_id)
      .single()

    if (expertError || !expert) {
      return NextResponse.json(
        { ok: false, error: 'Eşleşen psikolog bulunamadı.' },
        { status: 404 }
      )
    }

    if (expert.status && expert.status !== 'approved') {
      return NextResponse.json(
        { ok: false, error: 'Eşleşen psikolog aktif/onaylı değil.' },
        { status: 400 }
      )
    }

    if (!expert.session_price || expert.session_price <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Psikolog seans ücreti bulunamadı.' },
        { status: 400 }
      )
    }

    const amount = Number(expert.session_price)
    const commissionAmount = Math.round(amount * 0.3)
    const expertAmount = amount - commissionAmount

    const conversationId = `payment_${client.id}_${Date.now()}`
    const randomKey = Date.now().toString()
    const uri = '/payment/iyzipos/checkoutform/initialize/auth/ecom'

    const clientFullName =
      client.full_name ||
      client.name ||
      client.client_name ||
      'Mindora Danışan'

    const { name, surname } = splitName(clientFullName)

    const clientEmail = client.email || 'test@test.com'
    const clientPhone = cleanPhone(client.phone || client.phone_number)
    const clientCity = client.city || 'Ankara'
    const clientAddress = client.address || clientCity || 'Türkiye'

    const body = {
      locale: 'tr',
      conversationId,
      price: amount.toString(),
      paidPrice: amount.toString(),
      currency: 'TRY',
      basketId: `mindora_${client.id}`,
      paymentGroup: 'PRODUCT',
      callbackUrl: `${siteUrl}/api/payment/callback`,
      buyer: {
        id: client.id,
        name,
        surname,
        gsmNumber: clientPhone,
        email: clientEmail,
        identityNumber: '11111111111',
        registrationAddress: clientAddress,
        ip:
          req.headers.get('x-forwarded-for')?.split(',')[0] ||
          req.headers.get('x-real-ip') ||
          '85.34.78.112',
        city: clientCity,
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: `${name} ${surname}`,
        city: clientCity,
        country: 'Turkey',
        address: clientAddress,
      },
      billingAddress: {
        contactName: `${name} ${surname}`,
        city: clientCity,
        country: 'Turkey',
        address: clientAddress,
      },
      basketItems: [
        {
          id: `session_${expert.id}`,
          name: `Mindora Psikolojik Danışmanlık - ${
            expert.full_name || expert.name || 'Uzman'
          }`,
          category1: 'Psikolojik Danışmanlık',
          itemType: 'VIRTUAL',
          price: amount.toString(),
        },
      ],
    }

    const bodyStr = JSON.stringify(body)

    const auth = createAuthHeader(apiKey, secretKey, randomKey, uri, bodyStr)

    const res = await fetch(baseUrl + uri, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'x-iyzi-rnd': randomKey,
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    })

    const data = await res.json()

    if (data.status !== 'success') {
      return NextResponse.json(
        {
          ok: false,
          error: data.errorMessage || 'iyzico ödeme linki oluşturulamadı.',
          iyzico: data,
        },
        { status: 400 }
      )
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        client_id: client.id,
        expert_id: expert.id,
        amount,
        commission_amount: commissionAmount,
        expert_amount: expertAmount,
        iyzico_token: data.token,
        iyzico_conversation_id: conversationId,
        status: 'pending',
      })
      .select('id')
      .single()

    if (paymentError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödeme linki oluştu ama payments tablosuna kaydedilemedi.',
          detail: paymentError.message,
          paymentPageUrl: data.paymentPageUrl,
          token: data.token,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      clientId: client.id,
      expertId: expert.id,
      amount,
      commissionAmount,
      expertAmount,
      token: data.token,
      paymentPageUrl: data.paymentPageUrl,
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Beklenmeyen hata oluştu.' },
      { status: 500 }
    )
  }
}