import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createExpertAccessToken } from '@/lib/expert-access-tokens'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { sendMail } from '@/lib/mail/smtp'
import { expertLoginLinkTemplate } from '@/lib/mail/templates'

export const runtime = 'nodejs'

function cleanUrl(url?: string | null) {
  return (url || '').replace(/\/+$/, '')
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * Passwordless expert login: request a magic link by email. Always returns
 * a generic success message regardless of whether the email matched an
 * approved expert, so the response can't be used to enumerate accounts.
 */
export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, {
    scope: 'expert-login',
    limit: 5,
    windowMs: 5 * 60_000,
  })

  if (limited) return limited

  const genericResponse = NextResponse.json({
    ok: true,
    message: 'Bu e-posta adresi kayıtlı ve onaylıysa, giriş bağlantısı gönderildi.',
  })

  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli bir e-posta adresi girin.' },
        { status: 400 }
      )
    }

    const siteUrl = cleanUrl(process.env.NEXT_PUBLIC_SITE_URL)

    if (!siteUrl) {
      console.error('EXPERT_LOGIN_MISSING_SITE_URL')
      return genericResponse
    }

    const supabase = getSupabaseAdmin() as any

    const { data: expert, error } = await supabase
      .from('experts')
      .select('id, name, email, status')
      .eq('email', email)
      .eq('status', 'approved')
      .maybeSingle()

    if (error) {
      console.error('EXPERT_LOGIN_LOOKUP_ERROR', error)
      return genericResponse
    }

    if (!expert) {
      return genericResponse
    }

    const { token } = await createExpertAccessToken({ expertId: expert.id })
    const loginUrl = `${siteUrl}/api/expert/session/consume?token=${encodeURIComponent(token)}`

    await sendMail({
      to: expert.email,
      subject: 'Mindora uzman paneli giriş bağlantınız',
      text: expertLoginLinkTemplate({ expertName: expert.name || 'Uzman', loginUrl }),
    }).catch((mailError) => {
      console.error('EXPERT_LOGIN_MAIL_ERROR', mailError)
    })

    return genericResponse
  } catch (err) {
    console.error('EXPERT_LOGIN_SERVER_ERROR', err)
    return genericResponse
  }
}
