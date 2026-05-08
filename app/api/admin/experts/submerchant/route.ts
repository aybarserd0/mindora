import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type ExpertRecord = {
  id: string
  name?: string | null
  full_name?: string | null
  expert_name?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  phone_number?: string | null
  iyzico_submerchant_key?: string | null
}

type IyzicoSubmerchantResponse = {
  status?: string
  errorMessage?: string
  subMerchantKey?: string
  [key: string]: unknown
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function cleanPhone(phone?: string | null) {
  const raw = toText(phone).replace(/\s/g, '')

  if (!raw) return '+905350000000'

  let value = raw

  if (value.startsWith('0')) value = `+9${value}`

  if (!value.startsWith('+90')) return '+905350000000'

  return value
}

function splitName(fullName?: string | null) {
  const parts = toText(fullName || 'Mindora Uzman')
    .split(' ')
    .filter(Boolean)

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

    const body = await req.json().catch(() => null)

    const expertId = toText(body?.expertId)
    const iban = toText(body?.iban).replace(/\s/g, '').toUpperCase()
    const identityNumber = toText(body?.identityNumber)
    const address = toText(body?.address)
    const city = toText(body?.city)

    if (!expertId || !iban || !identityNumber || !address || !city) {
      return NextResponse.json(
        {
          ok: false,
          error: 'expertId, iban, identityNumber, address ve city zorunludur.',
        },
        { status: 400 }
      )
    }

    if (!iban.startsWith('TR') || iban.length < 24) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli bir TR IBAN giriniz.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin() as any

    const { data: expertData, error: expertError } = await supabase
      .from('experts')
      .select('*')
      .eq('id', expertId)
      .maybeSingle()

    if (expertError || !expertData) {
      return NextResponse.json(
        { ok: false, error: 'Uzman bulunamadı.' },
        { status: 404 }
      )
    }

    const expert = expertData as ExpertRecord

    if (expert.iyzico_submerchant_key) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        subMerchantKey: expert.iyzico_submerchant_key,
      })
    }

    const fullName =
      toText(expert.full_name) ||
      toText(expert.name) ||
      toText(expert.expert_name) ||
      toText(expert.title) ||
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
      email: toText(expert.email),
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

    const result =
      (await iyzicoRes.json().catch(() => null)) as IyzicoSubmerchantResponse | null

    if (!iyzicoRes.ok || result?.status !== 'success' || !result.subMerchantKey) {
      return NextResponse.json(
        {
          ok: false,
          error: result?.errorMessage || 'iyzico alt üye oluşturulamadı.',
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