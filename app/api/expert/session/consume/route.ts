import { NextRequest, NextResponse } from 'next/server'
import { resolveExpertIdFromToken } from '@/lib/expert-access-tokens'
import { EXPERT_SESSION_COOKIE, EXPERT_SESSION_MAX_AGE_SECONDS } from '@/lib/security/expert-session'

export const runtime = 'nodejs'

/** Only allow redirecting back into the expert area — never an absolute/external URL. */
function isSafeReturnTo(value: string) {
  return /^\/expert(\/[a-zA-Z0-9\-_/]*)?$/.test(value)
}

/** Destination of the magic-link email: verifies the token, sets the session cookie, redirects into the panel. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const returnTo = req.nextUrl.searchParams.get('returnTo') || ''
  const expertId = await resolveExpertIdFromToken(token)

  if (!expertId) {
    const failureUrl = new URL('/expert/login', req.url)
    failureUrl.searchParams.set('error', 'invalid_token')
    return NextResponse.redirect(failureUrl)
  }

  const destination = isSafeReturnTo(returnTo) ? returnTo : '/expert/dashboard'
  const dashboardUrl = new URL(destination, req.url)
  const response = NextResponse.redirect(dashboardUrl)

  response.cookies.set(EXPERT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPERT_SESSION_MAX_AGE_SECONDS,
  })

  return response
}
