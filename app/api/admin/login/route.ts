import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/security/rate-limit'
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionValue,
} from '@/lib/security/admin-session'

export async function POST(req: NextRequest) {
  try {
    const limited = applyRateLimit(req, {
      scope: 'admin-login',
      limit: 8,
      windowMs: 5 * 60_000,
    })

    if (limited) return limited

    const { password } = await req.json()

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: 'Admin password is not configured.' },
        { status: 500 }
      )
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: 'Invalid password.' },
        { status: 401 }
      )
    }

    const res = NextResponse.json({ ok: true })

    res.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    })

    return res
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Server error.' },
      { status: 500 }
    )
  }
}