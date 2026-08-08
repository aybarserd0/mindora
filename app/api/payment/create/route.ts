import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'

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

function cleanSiteUrl(url?: string) {
  return (url || '').replace(/\/+$/, '')
}

function cleanPhone(phone?: string | null) {
  if (!phone) return '+905350000000'

  let value = phone.replace(/\s/g, '').replace(/[()-]/g, '')

  if (value.startsWith('0')) value = '+9' + value
  if (value.startsWith('90')) value = '+' + value

  return value.startsWith('+90') ? value : '+905350000000'
}

function splitName(fullName?: string | null) {
  const value = (fullName || 'Mindora Danışan').trim()
  const parts = value.split(/\s+/)

  return {
    name: parts[0] || 'Mindora',
    surname: parts.slice(1).join(' ') || 'Danışan',
  }
}

function money(value: number) {
  return Number(value).toFixed(2)
}

function normalizeAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export async function POST(req: NextRequest) {
  try {
    const limited = applyRateLimit(req, {
      scope: 'payment-create',
      limit: 10,
      windowMs: 60_000,
    })

    if (limited) return limited

    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = cleanSiteUrl(process.env.IYZICO_BASE_URL)
    const siteUrl = cleanSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

    if (!apiKey || !secretKey || !baseUrl || !siteUrl) {
      return NextResponse.json(
        { ok: false, error: 'Iyzico veya site env bilgileri eksik.' },
        { status: 500 }
      )
    }

    const bodyJson = await req.json().catch(() => null)
    const clientId = bodyJson?.clientId

    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Geçerli clientId gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: client, error: clientError } = await supabase
      .from('client_applications')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan başvurusu bulunamadı.',
          detail: clientError?.message || null,
        },
        { status: 404 }
      )
    }

    if (!client.matched_expert_id) {
      return NextResponse.json(
        { ok: false, error: 'Bu danışan henüz bir psikologla eşleştirilmemiş.' },
        { status: 400 }
      )
    }

    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from('payments')
      .select(
        'id, client_id, expert_id, amount, commission_amount, expert_amount, iyzico_token, iyzico_conversation_id, payment_page_url, status'
      )
      .eq('client_id', client.id)
      .in('status', ['pending', 'paid'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPaymentError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Mevcut ödeme kontrolü yapılamadı.',
          detail: existingPaymentError.message,
        },
        { status: 500 }
      )
    }

    if (existingPayment) {
      return NextResponse.json({
        ok: true,
        reused: true,
        message:
          existingPayment.status === 'paid'
            ? 'Bu danışanın ödemesi zaten tamamlanmış.'
            : 'Bu danışan için zaten aktif bir ödeme linki var.',
        paymentId: existingPayment.id,
        clientId: existingPayment.client_id,
        expertId: existingPayment.expert_id,
        amount: existingPayment.amount,
        commissionAmount: existingPayment.commission_amount,
        expertAmount: existingPayment.expert_amount,
        token: existingPayment.iyzico_token,
        paymentPageUrl: existingPayment.payment_page_url,
        status: existingPayment.status,
      })
    }

    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select('id, name, email, session_price, status')
      .eq('id', client.matched_expert_id)
      .maybeSingle()

    if (expertError || !expert) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Eşleşen psikolog bulunamadı.',
          detail: expertError?.message || null,
        },
        { status: 404 }
      )
    }

    if (expert.status !== 'approved') {
      return NextResponse.json(
        { ok: false, error: 'Eşleşen psikolog aktif/onaylı değil.' },
        { status: 400 }
      )
    }

    const amount = normalizeAmount((expert as any).session_price)

    if (!amount) {
      return NextResponse.json(
        { ok: false, error: 'Psikolog seans ücreti bulunamadı veya geçersiz.' },
        { status: 400 }
      )
    }

    const commissionAmount = Math.round(amount * 0.3)
    const expertAmount = amount - commissionAmount

    const now = Date.now()
    const randomKey = `${now}${Math.floor(Math.random() * 100000)}`
    const conversationId = `payment_${client.id}_${now}`
    const uri = '/payment/iyzipos/checkoutform/initialize/auth/ecom'

    const clientFullName = client.name || 'Mindora Danışan'

    const { name, surname } = splitName(clientFullName)

    const clientEmail = (client.email || '').trim()

    if (!clientEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Danışanın e-posta adresi eksik. Ödeme başlatılmadan önce başvuru kaydına geçerli bir e-posta eklenmelidir.',
        },
        { status: 400 }
      )
    }

    const clientPhone = cleanPhone(client.phone)
    const clientCity = 'Ankara'
    const clientAddress = 'Türkiye'
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip')?.trim() ||
      null

    if (!ip) {
      return NextResponse.json(
        {
          ok: false,
          error: 'İstemci IP adresi belirlenemedi, ödeme başlatılamadı.',
        },
        { status: 400 }
      )
    }

    const iyzicoBody = {
      locale: 'tr',
      conversationId,
      price: money(amount),
      paidPrice: money(amount),
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
        ip,
        city: clientCity,
        country: 'Turkey',
        zipCode: '06000',
      },
      shippingAddress: {
        contactName: `${name} ${surname}`,
        city: clientCity,
        country: 'Turkey',
        address: clientAddress,
        zipCode: '06000',
      },
      billingAddress: {
        contactName: `${name} ${surname}`,
        city: clientCity,
        country: 'Turkey',
        address: clientAddress,
        zipCode: '06000',
      },
      basketItems: [
        {
          id: `session_${expert.id}`,
          name: `Mindora Psikolojik Danışmanlık - ${expert.name || 'Uzman'}`,
          category1: 'Psikolojik Danışmanlık',
          itemType: 'VIRTUAL',
          price: money(amount),
        },
      ],
    }

    const bodyStr = JSON.stringify(iyzicoBody)
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
      return NextResponse.json(
        {
          ok: false,
          error:
            iyzicoData?.errorMessage || 'iyzico ödeme linki oluşturulamadı.',
          iyzico: iyzicoData,
        },
        { status: 400 }
      )
    }

    if (!iyzicoData.token || !iyzicoData.paymentPageUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: 'iyzico token veya ödeme linki dönmedi.',
          iyzico: iyzicoData,
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
        iyzico_token: iyzicoData.token,
        iyzico_conversation_id: conversationId,
        payment_page_url: iyzicoData.paymentPageUrl,
        status: 'pending',
        expert_payout_status: 'unpaid',
      })
      .select('id')
      .single()

    if (paymentError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödeme linki oluştu ama payments tablosuna kaydedilemedi.',
          detail: paymentError.message,
          token: iyzicoData.token,
          paymentPageUrl: iyzicoData.paymentPageUrl,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      reused: false,
      paymentId: payment.id,
      clientId: client.id,
      expertId: expert.id,
      amount,
      commissionAmount,
      expertAmount,
      token: iyzicoData.token,
      paymentPageUrl: iyzicoData.paymentPageUrl,
      status: 'pending',
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Beklenmeyen hata oluştu.' },
      { status: 500 }
    )
  }
}