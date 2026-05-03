import { NextRequest, NextResponse } from 'next/server'
import Iyzipay from 'iyzipay'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
})

function cleanPhone(phone?: string | null) {
  if (!phone) return '+905350000000'

  let value = phone.replace(/\s/g, '')

  if (value.startsWith('0')) {
    value = '+9' + value
  }

  if (!value.startsWith('+90')) {
    value = '+905350000000'
  }

  return value
}

function splitName(fullName?: string | null) {
  const parts = (fullName || 'Mindora Uzman').trim().split(' ')
  const contactName = parts[0] || 'Mindora'
  const contactSurname = parts.slice(1).join(' ') || 'Uzman'

  return { contactName, contactSurname }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Iyzico env bilgileri eksik.' },
        { status: 500 }
      )
    }

    const body = await req.json()

    const {
      expertId,
      iban,
      identityNumber,
      address,
      city,
    } = body

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

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: subMerchantExternalId,

      subMerchantExternalId,
      subMerchantType: Iyzipay.SUB_MERCHANT_TYPE.PERSONAL,

      address: `${address}, ${city}`,
      contactName,
      contactSurname,
      email: expert.email,
      gsmNumber: cleanPhone(expert.phone || expert.phone_number),
      name: fullName,
      iban,
      identityNumber,
      currency: Iyzipay.CURRENCY.TRY,
    }

    const result: any = await new Promise((resolve, reject) => {
      iyzipay.subMerchant.create(request, (err: any, result: any) => {
        if (err) reject(err)
        else resolve(result)
      })
    })

    if (result.status !== 'success') {
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