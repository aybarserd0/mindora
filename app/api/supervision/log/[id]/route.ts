import { NextRequest, NextResponse } from 'next/server'
import { db, getOwnSupervisorProfile, jsonError, requireExpert } from '@/lib/supervision/server'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

// Süpervizör, kendisine ait bir defter kaydını onaylar ya da itiraz eder
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-log')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const action = body?.action === 'dispute' ? 'dispute' : body?.action === 'confirm' ? 'confirm' : null
  if (!action) return jsonError('Geçersiz işlem.', 400)

  const profile = await getOwnSupervisorProfile(auth.expertId)
  if (!profile) return jsonError('Süpervizör profilin yok.', 403)

  const supabase = db()
  const { data: entry } = await supabase
    .from('supervision_log_entries')
    .select('id, supervisor_profile_id, supervisee_expert_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!entry || entry.supervisor_profile_id !== profile.id) return jsonError('Kayıt bulunamadı.', 404)
  if (entry.status !== 'pending') return jsonError('Bu kayıt zaten yanıtlanmış.', 409)

  const update =
    action === 'confirm'
      ? { status: 'confirmed', confirmed_at: new Date().toISOString() }
      : { status: 'disputed' }

  const { error } = await supabase.from('supervision_log_entries').update(update).eq('id', id)
  if (error) return jsonError('Kayıt güncellenemedi.', 500)

  await createNotification({
    supabase,
    userType: 'expert',
    userId: entry.supervisee_expert_id,
    title: action === 'confirm' ? 'Süpervizyon saatin onaylandı' : 'Süpervizyon kaydına itiraz edildi',
    message:
      action === 'confirm'
        ? 'Saat defterindeki bir kayıt süpervizörün tarafından onaylandı.'
        : 'Süpervizörün bir kaydı onaylamadı. Ayrıntı için süpervizörünle iletişime geç.',
    type: 'session',
    link: '/expert/dashboard/supervizyon',
  })

  if (action === 'dispute') {
    await createNotification({
      supabase,
      userType: 'admin',
      userId: null,
      title: 'Süpervizyon kaydına itiraz',
      message: `Defter kaydı ${id} süpervizör tarafından itiraz edildi.`,
      type: 'admin',
      link: '/admin/supervizorler',
    })
  }

  return NextResponse.json({ ok: true })
}
