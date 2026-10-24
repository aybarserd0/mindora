import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { BADGE_MIN_SESSIONS, BADGE_WINDOW_DAYS } from './constants'

/**
 * "Süpervizyonlu Uzman" rozetini hak eden uzmanların kimlikleri:
 * son BADGE_WINDOW_DAYS günde en az BADGE_MIN_SESSIONS onaylı süpervizyon seansı.
 * Tablo yoksa ya da sorgu hata verirse boş küme döner; sayfalar bozulmaz.
 */
export async function getSupervisedExpertIds(): Promise<Set<string>> {
  try {
    const since = new Date(Date.now() - BADGE_WINDOW_DAYS * 86_400_000).toISOString()
    // Tablo henüz üretilmiş tiplerde yok
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any
    const { data, error } = await supabase
      .from('supervision_log_entries')
      .select('supervisee_expert_id')
      .eq('status', 'confirmed')
      .gte('session_date', since)

    if (error || !Array.isArray(data)) return new Set()

    const counts = new Map<string, number>()
    for (const row of data as { supervisee_expert_id: string }[]) {
      counts.set(row.supervisee_expert_id, (counts.get(row.supervisee_expert_id) || 0) + 1)
    }
    return new Set([...counts].filter(([, n]) => n >= BADGE_MIN_SESSIONS).map(([id]) => id))
  } catch {
    return new Set()
  }
}
