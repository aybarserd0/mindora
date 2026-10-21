import { NextRequest, NextResponse } from 'next/server'
import { enforceAdminRequest } from '@/lib/security/admin-auth'
import { db, jsonError } from '@/lib/supervision/server'

export const runtime = 'nodejs'

// Admin: süpervizör başvuruları ve randevu özeti. Vaka kartı içeriği burada yok.
export async function GET(req: NextRequest) {
  const blocked = enforceAdminRequest(req)
  if (blocked) return blocked

  const supabase = db()
  const { data: profiles, error } = await supabase
    .from('supervisor_profiles')
    .select('*, experts!inner(name, email, phone, title, status)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('ADMIN_SUPERVISORS_ERROR', error)
    return jsonError('Süpervizörler alınamadı.', 500)
  }

  const { data: bookings } = await supabase
    .from('supervision_bookings')
    .select('id, supervisor_profile_id, kind, status, requested_start, price, commission_amount, paid_at, cancelled_by')
    .order('requested_start', { ascending: false })
    .limit(200)

  return NextResponse.json({ ok: true, profiles: profiles || [], bookings: bookings || [] })
}
