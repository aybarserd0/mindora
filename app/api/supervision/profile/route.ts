import { NextRequest, NextResponse } from 'next/server'
import {
  db,
  getOwnSupervisorProfile,
  jsonError,
  requireExpert,
  toStringArray,
  toText,
} from '@/lib/supervision/server'
import {
  DEFAULT_COMMISSION_RATE,
  MAX_SESSION_PRICE,
  MIN_SESSION_PRICE,
  SUPERVISION_APPROACHES,
} from '@/lib/supervision/constants'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireExpert(req)
  if ('response' in auth) return auth.response

  const profile = await getOwnSupervisorProfile(auth.expertId)
  const { data: expert } = await db()
    .from('experts')
    .select('id, name, status, account_type')
    .eq('id', auth.expertId)
    .maybeSingle()

  return NextResponse.json({ ok: true, profile, expert })
}

// Süpervizör başvurusu oluşturur ya da profili günceller.
export async function PUT(req: NextRequest) {
  const auth = await requireExpert(req, 'supervision-profile')
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Geçersiz istek.', 400)

  const supabase = db()
  const { data: expert } = await supabase
    .from('experts')
    .select('id, name, status')
    .eq('id', auth.expertId)
    .maybeSingle()

  if (!expert || expert.status !== 'approved') {
    return jsonError('Süpervizör olmak için önce uzman hesabının onaylanması gerekiyor.', 403)
  }

  const approaches = toStringArray(body.approaches, SUPERVISION_APPROACHES)
  const focusAreas = toStringArray(body.focusAreas, undefined, 10)
  const bio = toText(body.bio, 1500)
  const credentials = toText(body.credentials, 1500)
  const availabilityNote = toText(body.availabilityNote, 300)
  const years = Number(body.yearsExperience)
  const price = Number(body.sessionPrice)
  const introCallEnabled = body.introCallEnabled !== false

  if (approaches.length === 0) return jsonError('En az bir ekol seç.', 400)
  if (!Number.isInteger(years) || years < 5 || years > 70) {
    return jsonError('Süpervizör olmak için en az 5 yıl klinik deneyim gerekiyor.', 400)
  }
  if (!Number.isFinite(price) || price < MIN_SESSION_PRICE || price > MAX_SESSION_PRICE) {
    return jsonError(`Seans ücreti ${MIN_SESSION_PRICE} ile ${MAX_SESSION_PRICE} TL arasında olmalı.`, 400)
  }
  if (bio.length < 80) return jsonError('Kendini en az birkaç cümleyle tanıt (en az 80 karakter).', 400)
  if (credentials.length < 20) return jsonError('Eğitim ve süpervizörlük belgelerini kısaca yaz.', 400)

  const existing = await getOwnSupervisorProfile(auth.expertId)
  const fields = {
    approaches,
    focus_areas: focusAreas,
    bio,
    credentials,
    availability_note: availabilityNote || null,
    years_experience: years,
    session_price: price,
    intro_call_enabled: introCallEnabled,
  }

  if (existing) {
    // Reddedilen başvuru yeniden gönderilirse tekrar incelemeye düşer
    const nextStatus = existing.status === 'rejected' ? 'pending' : existing.status
    const { data, error } = await supabase
      .from('supervisor_profiles')
      .update({ ...fields, status: nextStatus })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) {
      console.error('SUPERVISOR_PROFILE_UPDATE_ERROR', error)
      return jsonError('Profil kaydedilemedi.', 500)
    }
    return NextResponse.json({ ok: true, profile: data })
  }

  const { data, error } = await supabase
    .from('supervisor_profiles')
    .insert({ ...fields, expert_id: auth.expertId, status: 'pending', commission_rate: DEFAULT_COMMISSION_RATE })
    .select('*')
    .single()

  if (error) {
    console.error('SUPERVISOR_PROFILE_INSERT_ERROR', error)
    return jsonError('Başvuru kaydedilemedi.', 500)
  }

  await createNotification({
    supabase,
    userType: 'admin',
    userId: null,
    title: 'Yeni süpervizör başvurusu',
    message: `${expert.name || 'Bir uzman'} süpervizör olmak için başvurdu.`,
    type: 'admin',
    link: '/admin/supervizorler',
  })

  return NextResponse.json({ ok: true, profile: data })
}
