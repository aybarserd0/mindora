import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enforceAdminRequest } from '@/lib/security/admin-auth'
import { cleanUuid } from '@/lib/security/validation'
import { foundingUntilFrom } from '@/lib/payments/policy'

export const runtime = 'nodejs'

/**
 * Uzmanın komisyon ayarı: kurucu uzman durumu ve isteğe bağlı özel oran.
 * Yeni oran yalnızca bundan sonra oluşturulan ödemelere uygulanır.
 */
export async function POST(req: NextRequest) {
  const unauthorized = enforceAdminRequest(req)
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as {
    id?: unknown
    founding?: unknown
    commissionRate?: unknown
  } | null

  const id = cleanUuid(body?.id)
  if (!id) return NextResponse.json({ ok: false, error: 'Geçerli uzman ID gerekli.' }, { status: 400 })

  const update: { founding_member?: boolean; founding_until?: string | null; commission_rate?: number | null } = {}

  if (typeof body?.founding === 'boolean') {
    update.founding_member = body.founding
    update.founding_until = body.founding ? foundingUntilFrom() : null
  }

  if (body && 'commissionRate' in body) {
    if (body.commissionRate === null || body.commissionRate === '') {
      update.commission_rate = null
    } else {
      const percent = Number(body.commissionRate)
      if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
        return NextResponse.json({ ok: false, error: 'Özel oran %0 ile %50 arasında olmalı.' }, { status: 400 })
      }
      update.commission_rate = Math.round(percent * 100) / 10000
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: 'Değiştirilecek bir alan yok.' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('experts')
    .update(update)
    .eq('id', id)
    .select('id, founding_member, founding_until, commission_rate')
    .maybeSingle()

  if (error || !data) {
    console.error('EXPERT COMMISSION UPDATE ERROR:', error)
    return NextResponse.json({ ok: false, error: 'Komisyon ayarı kaydedilemedi.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, expert: data })
}
