import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveIyzicoPaymentByToken } from '@/lib/payments/resolve-iyzico-payment'
import { applyRateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

/**
 * Async, server-to-server counterpart to `/api/payment/callback`.
 *
 * The browser-redirect callback only fires if the buyer's browser makes it
 * back to our site after paying — if they close the tab, lose connection,
 * or their bank's 3DS page fails to redirect, the payment can succeed at
 * iyzico while our `payments` row stays `pending` forever. Registering this
 * URL as the webhook (bildirim URL) in the iyzico merchant panel
 * (Ayarlar > Bildirimler) makes iyzico ping it independently whenever a
 * checkout form payment resolves, so we can reconcile it even if the
 * browser never returned.
 *
 * We do not trust the webhook body's own status field — iyzico's exact
 * webhook payload shape can't be verified without a live merchant panel
 * test delivery, so this only uses the payload to find *which* payment to
 * re-check, then re-verifies it the same authenticated way the callback
 * route does (using the `iyzico_token` we already stored at checkout
 * creation time, not a value trusted from the request body).
 */

function cleanUrl(url?: string | null) {
  return (url || '').replace(/\/+$/, '')
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, {
    scope: 'iyzico-webhook',
    limit: 60,
    windowMs: 60_000,
  })

  if (limited) return limited

  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = cleanUrl(process.env.IYZICO_BASE_URL)
  const siteUrl = cleanUrl(process.env.NEXT_PUBLIC_SITE_URL)

  if (!apiKey || !secretKey || !baseUrl || !siteUrl) {
    console.error('IYZICO_WEBHOOK_ENV_MISSING')
    return NextResponse.json(
      { ok: false, error: 'Iyzico veya site env bilgileri eksik.' },
      { status: 500 }
    )
  }

  const rawBody = await req.text().catch(() => '')

  let payload: Record<string, unknown> | null = null

  try {
    payload = rawBody ? JSON.parse(rawBody) : null
  } catch {
    payload = null
  }

  if (!payload) {
    console.warn('IYZICO_WEBHOOK_UNPARSEABLE_BODY', rawBody.slice(0, 500))
    return NextResponse.json({ ok: true })
  }

  console.log('IYZICO_WEBHOOK_RECEIVED', payload)

  const directToken = toText(payload.token)
  const conversationId = toText(
    payload.paymentConversationId || payload.conversationId || payload.iyziConversationId
  )

  let token = directToken

  if (!token && conversationId) {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('payments' as never)
      .select('iyzico_token')
      .eq('iyzico_conversation_id', conversationId as never)
      .maybeSingle()

    if (error) {
      console.error('IYZICO_WEBHOOK_CONVERSATION_LOOKUP_ERROR', error)
    }

    token = toText((data as unknown as { iyzico_token?: string } | null)?.iyzico_token)
  }

  if (!token) {
    console.warn('IYZICO_WEBHOOK_NO_CORRELATION_KEY', {
      conversationId: conversationId || null,
      payloadKeys: Object.keys(payload),
    })

    return NextResponse.json({ ok: true })
  }

  try {
    const result = await resolveIyzicoPaymentByToken({
      token,
      apiKey,
      secretKey,
      baseUrl,
      siteUrl,
    })

    console.log('IYZICO_WEBHOOK_RESOLVED', { token, outcome: result.outcome })
  } catch (error) {
    console.error('IYZICO_WEBHOOK_RESOLVE_ERROR', error)
  }

  return NextResponse.json({ ok: true })
}
