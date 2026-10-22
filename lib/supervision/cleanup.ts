import { db } from './server'

/**
 * Saklama süresi dolan vaka kartlarını siler. Günlük cron'dan çağrılır.
 * Saat defteri kayıtları vaka içeriği taşımadığı için silinmez.
 */
export async function deleteExpiredSupervisionCases() {
  const { data, error } = await db()
    .from('supervision_cases')
    .delete()
    .lt('delete_after', new Date().toISOString())
    .select('id')

  if (error) {
    // Migration henüz uygulanmamışsa tablo yoktur; cron'u bozmasın
    console.error('SUPERVISION_CASE_CLEANUP_ERROR', error.message)
    return 0
  }

  return (data || []).length
}
