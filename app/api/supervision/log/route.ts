import { NextRequest, NextResponse } from 'next/server'
import { db, getOwnSupervisorProfile, jsonError, requireExpert } from '@/lib/supervision/server'
import { BADGE_MIN_SESSIONS, BADGE_WINDOW_DAYS } from '@/lib/supervision/constants'

export const runtime = 'nodejs'

// Saat defteri: kendi kayıtların + süpervizörsen onayını bekleyen kayıtlar
export async function GET(req: NextRequest) {
  const auth = await requireExpert(req)
  if ('response' in auth) return auth.response

  const supabase = db()
  const { data: entries, error } = await supabase
    .from('supervision_log_entries')
    .select('id, session_date, duration_minutes, format, approach, status, confirmed_at, verification_code, supervisor_profiles!inner(experts!inner(name, title))')
    .eq('supervisee_expert_id', auth.expertId)
    .order('session_date', { ascending: false })

  if (error) {
    console.error('SUPERVISION_LOG_LIST_ERROR', error)
    return jsonError('Saat defteri alınamadı.', 500)
  }

  type Entry = { status: string; duration_minutes: number; session_date: string }
  const list = (entries || []) as Entry[]
  const confirmed = list.filter((e) => e.status === 'confirmed')
  const totalMinutes = confirmed.reduce((sum, e) => sum + Number(e.duration_minutes || 0), 0)
  const windowStart = Date.now() - BADGE_WINDOW_DAYS * 86_400_000
  const recent = confirmed.filter((e) => new Date(e.session_date).getTime() >= windowStart).length

  let pendingForMe: unknown[] = []
  const profile = await getOwnSupervisorProfile(auth.expertId)
  if (profile) {
    const { data } = await supabase
      .from('supervision_log_entries')
      .select('id, session_date, duration_minutes, status, experts!supervision_log_entries_supervisee_expert_id_fkey(name)')
      .eq('supervisor_profile_id', profile.id)
      .eq('status', 'pending')
      .order('session_date', { ascending: false })
    pendingForMe = data || []
  }

  return NextResponse.json({
    ok: true,
    entries: entries || [],
    summary: {
      confirmedSessions: confirmed.length,
      totalMinutes,
      recentSessions: recent,
      badgeEligible: recent >= BADGE_MIN_SESSIONS,
    },
    pendingForMe,
  })
}
