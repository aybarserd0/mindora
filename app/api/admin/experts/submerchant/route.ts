import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function cleanPhone(phone?: string | null) {
  if (!phone) return '+905350000000'
  let value = phone.replace(/\s/g, '')
  if (value.startsWith('0')) value = '+9' + value
  if (!value.startsWith('+90')) return '+905350000000'
  return value
}

function splitName(fullName?: string | null) {
  const parts = (fullName || 'Mindora Uzman').trim().split(' ')
  return {
    contactName: parts[0] || 'Mindora',
    contactSurname: parts.slice(1).join(' ') || 'Uzman',
  }
}

function createIyzicoAuthHeader({
  apiKey,
  secretKey,
  randomKey,
  uri,
  body,
}: {
  apiKey: string
  secretKey: string
  randomKey: string
  uri: string
  body: string
}) {
  const payload = randomKey + uri + body
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex')

  const authorizationString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`

  return `IYZWSv2 ${Buffer.from(authorizationString).toString('base64')}`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl =
      process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { ok: false, error: 'Iyzico env bilgileri eksik.' },
        { status: 500 }
      )
    }

    const {
      expertId,
      iban,
      identityNumber,
      address,
      city,
    } = await req.json()

    if (!expertId || !iban || !identityNumber || !address || !city) {
      return NextResponse.json(
        {
          ok: false,
          error: 'expertId, iban, identityNumber, address ve city zorunludur.',
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select('*')
      .eq('id', expertId)
      .single()

    if (expertError || !expert) {
      return NextResponse.json(
        { ok: false, error: 'Uzman bulunamadı.' },
        { status: 404 }
      )
    }

    if (expert.iyzico_submerchant_key) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        subMerchantKey: expert.iyzico_submerchant_key,
      })
    }

    const fullName =
      expert.full_name ||
      expert.name ||
      expert.expert_name ||
      expert.title ||
      'Mindora Uzman'

    const { contactName, contactSurname } = splitName(fullName)
    const subMerchantExternalId = `expert_${expert.id}`

    const iyzicoPath = '/onboarding/submerchant'

    const iyzicoBody = {
      locale: 'tr',
      conversationId: subMerchantExternalId,
      subMerchantExternalId,
      subMerchantType: 'PERSONAL',
      address: `${address}, ${city}`,
      contactName,
      contactSurname,
      email: expert.email,
      gsmNumber: cleanPhone(expert.phone || expert.phone_number),
      name: fullName,
      iban,
      identityNumber,
      currency: 'TRY',
    }

    const bodyString = JSON.stringify(iyzicoBody)
    const randomKey = `${Date.now()}${Math.floor(Math.random() * 1000000)}`

    const authorization = createIyzicoAuthHeader({
      apiKey,
      secretKey,
      randomKey,
      uri: iyzicoPath,
      body: bodyString,
    })

    const iyzicoRes = await fetch(`${baseUrl}${iyzicoPath}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'x-iyzi-rnd': randomKey,
      },
      body: bodyString,
    })

    const result = await iyzicoRes.json()

    if (!iyzicoRes.ok || result.status !== 'success') {
      return NextResponse.json(
        {
          ok: false,
          error: result.errorMessage || 'iyzico alt üye oluşturulamadı.',
          iyzico: result,
        },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('experts')
      .update({
        iban,
        iyzico_submerchant_key: result.subMerchantKey,
        iyzico_submerchant_external_id: subMerchantExternalId,
      })
      .eq('id', expert.id)

    if (updateError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Alt üye oluştu ama veritabanına yazılamadı.',
          detail: updateError.message,
          subMerchantKey: result.subMerchantKey,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      subMerchantKey: result.subMerchantKey,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Beklenmeyen hata oluştu.',
      },
      { status: 500 }
    )
  }
}