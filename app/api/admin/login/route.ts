import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
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

    res.cookies.set('mindora_admin', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return res
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Server error.' },
      { status: 500 }
    )
  }
}