import { NextRequest, NextResponse } from 'next/server'
import {
  computeSplit,
  db,
  getOwnSupervisorProfile,
  jsonError,
  requireExpert,
  toText,
} from '@/lib/supervision/server'
import { INTRO_CALL_MINUTES, SUPERVISION_SESSION_MINUTES } from '@/lib/supervision/constants'
import { scanForPii } from '@/lib/supervision/pii-scan'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

const BOOKING_FIELDS =
  'id, supervisor_profile_id, supervisee_expert_id, kind, status, requested_start, duration_minutes, price, commission_amount, supervisor_amount, request_note, decline_reason, payment_page_url, paid_at, completed_at, cancelled_by, created_at'

// Kullanıcının hem süpervizyon alan hem süpervizör olarak randevuları
export async function GET(req: NextRequest) {
  const auth = await requireExpert(req)
  if ('response' in auth) return auth.response

  const supabase = db()
  const ownProfile = await getOwnSupervisorProfile(auth.expertId)

  const { data: asSupervisee, error: e1 } = await supabase
    .from('supervision_bookings')
    .select(`${BOOKING_FIELDS}, supervisor_profiles!inner(id, experts!inner(name, title))`)
    .eq('supervisee_expert_id', auth.expertId)
    .order('requested_start', { ascending: false })
    .limit(100)

  let asSupervisor: unknown[] = []
  if (ownProfile) {
    const { data, error } = await supabase
      .from('supervision_bookings')
      .select(`${BOOKING_FIELDS}, experts!supervision_bookings_supervisee_expert_id_fkey(name, title)`)
      .eq('supervisor_profile_id', ownProfile.id)
      .order('requested_start', { ascending: false })
      .limit(100)
    if (error) console.error('SUPERVISION_BOOKINGS_SUPERVISOR_ERROR', error)
    asSupervisor = data || []
  }

  if (e1) {
    console.error('SUPERVISION_BOOKINGS_ERROR', e1)
    return jsonError('Randevular alınamadı.', 500)
  }

  return NextResponse.json({ ok: true, asSupervisee: asSupervisee || [], asSupervisor })
}

// Süpervizyon talebi oluşturur
export async function POST(req: NextRequest) {
  const auth = await requireExpert(req, 'supervision-booking-create')
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Geçersiz istek.', 400)

  const supervisorProfileId = toText(body.supervisorProfileId, 64)
  const kind = body.kind === 'intro' ? 'intro' : 'individual'
  const note = toText(body.note, 1000)
  const start = new Date(toText(body.requestedStart, 40))

  if (!supervisorProfileId) return jsonError('Süpervizör seçilmedi.', 400)
  if (Number.isNaN(start.getTime())) return jsonError('Geçerli bir tarih ve saat seç.', 400)
  if (start.getTime() < Date.now() + 12 * 60 * 60 * 1000) {
    return jsonError('Talep en az 12 saat sonrası için olmalı.', 400)
  }
  if (start.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
    return jsonError('En fazla 90 gün sonrası için talep oluşturabilirsin.', 400)
  }

  const findings = scanForPii(note)
  if (findings.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Talep notunda kişisel bilgi olabilecek ifadeler var. Danışan bilgisi paylaşma; vakayı vaka kartıyla anonim olarak ekleyebilirsin.',
        findings,
      },
      { status: 422 }
    )
  }

  const supabase = db()

  const { data: supervisee } = await supabase
    .from('experts')
    .select('id, name, status')
    .eq('id', auth.expertId)
    .maybeSingle()
  if (!supervisee || supervisee.status !== 'approved') {
    return jsonError('Süpervizyon talep etmek için uzman hesabının onaylı olması gerekiyor.', 403)
  }

  const { data: profile } = await supabase
    .from('supervisor_profiles')
    .select('id, expert_id, status, session_price, commission_rate, intro_call_enabled')
    .eq('id', supervisorProfileId)
    .maybeSingle()

  if (!profile || profile.status !== 'approved') return jsonError('Bu süpervizör şu anda talep kabul etmiyor.', 404)
  if (profile.expert_id === auth.expertId) return jsonError('Kendinden süpervizyon talep edemezsin.', 400)
  if (kind === 'intro' && !profile.intro_call_enabled) return jsonError('Bu süpervizör tanışma görüşmesi sunmuyor.', 400)

  // Aynı süpervizörle açık talep varken yenisi açılmasın
  const { count } = await supabase
    .from('supervision_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('supervisor_profile_id', profile.id)
    .eq('supervisee_expert_id', auth.expertId)
    .in('status', ['requested', 'accepted'])
  if ((count || 0) > 0) return jsonError('Bu süpervizörle yanıt veya ödeme bekleyen bir talebin var.', 409)

  const price = kind === 'intro' ? 0 : Number(profile.session_price || 0)
  if (kind === 'individual' && !(price > 0)) return jsonError('Süpervizörün seans ücreti tanımlı değil.', 400)
  const rate = kind === 'intro' ? 0 : Number(profile.commission_rate)
  const split = computeSplit(price, rate)

  const { data: booking, error } = await supabase
    .from('supervision_bookings')
    .insert({
      supervisor_profile_id: profile.id,
      supervisee_expert_id: auth.expertId,
      kind,
      status: 'requested',
      requested_start: start.toISOString(),
      duration_minutes: kind === 'intro' ? INTRO_CALL_MINUTES : SUPERVISION_SESSION_MINUTES,
      price,
      commission_rate: rate,
      commission_amount: split.commission,
      supervisor_amount: split.supervisorAmount,
      request_note: note || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('SUPERVISION_BOOKING_INSERT_ERROR', error)
    return jsonError('Talep oluşturulamadı.', 500)
  }

  await createNotification({
    supabase,
    userType: 'expert',
    userId: profile.expert_id,
    title: kind === 'intro' ? 'Yeni tanışma görüşmesi talebi' : 'Yeni süpervizyon talebi',
    message: `${supervisee.name || 'Bir meslektaşın'} senden ${kind === 'intro' ? 'tanışma görüşmesi' : 'süpervizyon'} talep etti.`,
    type: 'session',
    link: '/expert/dashboard/supervizor',
  })

  return NextResponse.json({ ok: true, bookingId: booking.id })
}
