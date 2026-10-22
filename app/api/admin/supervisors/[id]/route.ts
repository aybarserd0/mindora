import { NextRequest, NextResponse } from 'next/server'
import { enforceAdminRequest } from '@/lib/security/admin-auth'
import { db, jsonError, toText } from '@/lib/supervision/server'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

const STATUSES = ['pending', 'approved', 'rejected', 'paused']

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = enforceAdminRequest(req)
  if (blocked) return blocked

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Geçersiz istek.', 400)

  const update: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return jsonError('Geçersiz durum.', 400)
    update.status = body.status
    if (body.status === 'approved') update.approved_at = new Date().toISOString()
  }
  if (body.commissionRate !== undefined) {
    const rate = Number(body.commissionRate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) return jsonError('Komisyon oranı 0 ile 0,5 arasında olmalı.', 400)
    update.commission_rate = rate
  }
  if (body.adminNote !== undefined) update.admin_note = toText(body.adminNote, 1000) || null

  if (Object.keys(update).length === 0) return jsonError('Değişiklik yok.', 400)

  const supabase = db()
  const { data, error } = await supabase
    .from('supervisor_profiles')
    .update(update)
    .eq('id', id)
    .select('id, expert_id, status')
    .single()

  if (error || !data) return jsonError('Profil güncellenemedi.', 500)

  if (update.status === 'approved' || update.status === 'rejected') {
    await createNotification({
      supabase,
      userType: 'expert',
      userId: data.expert_id,
      title: update.status === 'approved' ? 'Süpervizör başvurun onaylandı' : 'Süpervizör başvurun hakkında',
      message:
        update.status === 'approved'
          ? 'Artık süpervizör dizininde görünüyorsun ve talep alabilirsin.'
          : 'Başvurun şu an için onaylanmadı. Ayrıntılar için Süpervizör panelini kontrol et.',
      type: 'system',
      link: '/expert/dashboard/supervizor',
    })
  }

  return NextResponse.json({ ok: true, profile: data })
}
