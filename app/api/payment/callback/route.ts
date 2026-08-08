import { NextRequest, NextResponse } from 'next/server'
import { resolveIyzicoPaymentByToken } from '@/lib/payments/resolve-iyzico-payment'

export const runtime = 'nodejs'

function cleanUrl(url?: string | null) {
  return (url || '').replace(/\/+$/, '')
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

async function getTokenFromRequest(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null)
    return toText(body?.token) || null
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await req.formData().catch(() => null)
    return formData?.get('token')?.toString() || null
  }

  const text = await req.text().catch(() => '')
  const params = new URLSearchParams(text)

  return params.get('token')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = cleanUrl(process.env.IYZICO_BASE_URL)
  const siteUrl = cleanUrl(process.env.NEXT_PUBLIC_SITE_URL)

  try {
    if (!apiKey || !secretKey || !baseUrl || !siteUrl) {
      return NextResponse.json(
        { ok: false, error: 'Iyzico veya site env bilgileri eksik.' },
        { status: 500 }
      )
    }

    const token = await getTokenFromRequest(req)

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Callback token bulunamadı.' },
        { status: 400 }
      )
    }

    const result = await resolveIyzicoPaymentByToken({
      token,
      apiKey,
      secretKey,
      baseUrl,
      siteUrl,
    })

    switch (result.outcome) {
      case 'not_found':
        return NextResponse.json(
          {
            ok: false,
            error: 'Bu token ile eşleşen ödeme kaydı bulunamadı.',
            detail: result.detail || null,
          },
          { status: 404 }
        )

      case 'db_update_failed':
        return NextResponse.json(
          {
            ok: false,
            error: 'Ödeme başarılı ama DB güncellenemedi.',
            detail: result.detail || null,
          },
          { status: 500 }
        )

      case 'already_paid':
      case 'paid':
        return NextResponse.redirect(`${siteUrl}/odeme-basarili`, 303)

      case 'missing_client':
      case 'already_failed':
      case 'verification_failed':
      case 'missing_ids':
      default: {
        const failureUrl = new URL(`${siteUrl}/odeme-basarisiz`)

        if (result.clientId) {
          failureUrl.searchParams.set('clientId', result.clientId)
        }

        return NextResponse.redirect(failureUrl.toString(), 303)
      }
    }
  } catch (err) {
    console.error('PAYMENT CALLBACK SERVER ERROR:', err)

    return NextResponse.json(
      {
        ok: false,
        error:
          (err instanceof Error && err.message) ||
          'Payment callback sırasında beklenmeyen hata oluştu.',
      },
      { status: 500 }
    )
  }
}
