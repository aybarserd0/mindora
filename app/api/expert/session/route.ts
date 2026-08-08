import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getExpertIdFromRequest } from '@/lib/security/expert-session'
import { EXPERT_SESSION_COOKIE } from '@/lib/security/expert-session'

export const runtime = 'nodejs'

/** Lets client components (the dashboard layout, NotificationBell) check "am I logged in" without exposing the token. */
export async function GET(req: NextRequest) {
  const expertId = await getExpertIdFromRequest(req)

  if (!expertId) {
    return NextResponse.json({ ok: false, error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin() as any

  const { data: expert, error } = await supabase
    .from('experts')
    .select('id, name, email, status')
    .eq('id', expertId)
    .maybeSingle()

  if (error || !expert || expert.status !== 'approved') {
    return NextResponse.json({ ok: false, error: 'Oturum geçersiz.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true, expertId: expert.id, name: expert.name })
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set(EXPERT_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
