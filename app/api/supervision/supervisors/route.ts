import { NextRequest, NextResponse } from 'next/server'
import { db, jsonError, requireExpert } from '@/lib/supervision/server'

export const runtime = 'nodejs'

// Onaylı süpervizörler dizini. Yalnızca oturum açmış uzmanlar görebilir.
export async function GET(req: NextRequest) {
  const auth = await requireExpert(req, 'supervision-directory')
  if ('response' in auth) return auth.response

  const { data, error } = await db()
    .from('supervisor_profiles')
    .select(
      'id, expert_id, approaches, focus_areas, bio, years_experience, session_price, intro_call_enabled, availability_note, experts!inner(name, title, photo_url, status)'
    )
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })

  if (error) {
    console.error('SUPERVISION_DIRECTORY_ERROR', error)
    return jsonError('Süpervizör listesi alınamadı.', 500)
  }

  type Row = {
    id: string
    expert_id: string
    approaches: string[]
    focus_areas: string[]
    bio: string | null
    years_experience: number | null
    session_price: number | null
    intro_call_enabled: boolean
    availability_note: string | null
    experts: { name: string | null; title: string | null; photo_url: string | null; status: string | null }
  }

  const supervisors = ((data || []) as Row[])
    .filter((row) => row.experts?.status === 'approved' && row.expert_id !== auth.expertId)
    .map((row) => ({
      id: row.id,
      name: row.experts?.name || 'Süpervizör',
      title: row.experts?.title || null,
      photoUrl: row.experts?.photo_url || null,
      approaches: row.approaches || [],
      focusAreas: row.focus_areas || [],
      bio: row.bio,
      yearsExperience: row.years_experience,
      sessionPrice: row.session_price,
      introCallEnabled: row.intro_call_enabled,
      availabilityNote: row.availability_note,
    }))

  return NextResponse.json({ ok: true, supervisors })
}
