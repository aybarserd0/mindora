import { getSupabaseAdmin } from '@/lib/supabase/admin'

/** Randevu bitişinden bu kadar sonra hâlâ açık duran görüşmeler kapatılır. */
const GRACE_HOURS = 2

/**
 * Uzman "Görüşmeyi bitir"e basmadan sekmeyi kapattığında randevu sonsuza
 * kadar "planlandı" kalıyordu: yorum istenmiyor, uzman payı aktarılamıyordu.
 * Görüntülü görüşmesi gerçekten başlamış (started_at dolu) ve bitiş saati
 * geçmiş randevular tamamlandı sayılır. Kimsenin katılmadığı randevulara
 * dokunulmaz; onlar için "katılmadı" kararını admin verir.
 */
export async function autoCompleteFinishedBookings(now = new Date()) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any
  const cutoff = new Date(now.getTime() - GRACE_HOURS * 3_600_000).toISOString()

  const { data: bookings, error } = await supabase
    .from('session_bookings')
    .select('id, live_session_id, scheduled_end_at')
    .in('status', ['scheduled', 'confirmed', 'active'])
    .not('live_session_id', 'is', null)
    .lt('scheduled_end_at', cutoff)
    .limit(200)

  if (error) {
    console.error('AUTO_COMPLETE_BOOKINGS_QUERY_ERROR', error)
    return { completed: 0 }
  }

  const rows = (bookings || []) as { id: string; live_session_id: string; scheduled_end_at: string }[]
  if (rows.length === 0) return { completed: 0 }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, status, started_at, ended_at')
    .in('id', rows.map((row) => row.live_session_id))

  const started = new Map<string, { status: string; started_at: string | null; ended_at: string | null }>(
    (sessions || []).map((s: { id: string; status: string; started_at: string | null; ended_at: string | null }) => [s.id, s])
  )

  let completed = 0
  const nowIso = now.toISOString()

  for (const row of rows) {
    const session = started.get(row.live_session_id)
    if (!session?.started_at) continue

    if (session.status !== 'completed') {
      const endedAt = session.ended_at || row.scheduled_end_at
      const minutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 60_000))
      await supabase
        .from('sessions')
        .update({ status: 'completed', ended_at: endedAt, duration_minutes: minutes })
        .eq('id', row.live_session_id)
        .in('status', ['scheduled', 'waiting', 'active'])
    }

    const { error: updateError } = await supabase
      .from('session_bookings')
      .update({ status: 'completed', updated_at: nowIso })
      .eq('id', row.id)
      .in('status', ['scheduled', 'confirmed', 'active'])

    if (updateError) console.error('AUTO_COMPLETE_BOOKING_UPDATE_ERROR', updateError)
    else completed += 1
  }

  return { completed }
}
