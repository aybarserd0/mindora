import { NextRequest, NextResponse } from 'next/server'
import { db, jsonError, requireExpert } from '@/lib/supervision/server'
import { parseCaseInput } from '@/lib/supervision/cases'
import { CASE_RETENTION_DAYS } from '@/lib/supervision/constants'

export const runtime = 'nodejs'

async function loadOwnCase(id: string, expertId: string) {
  const { data } = await db()
    .from('supervision_cases')
    .select('id, owner_expert_id, status')
    .eq('id', id)
    .maybeSingle()
  return data && data.owner_expert_id === expertId ? data : null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-case-write')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const existing = await loadOwnCase(id, auth.expertId)
  if (!existing) return jsonError('Vaka kartı bulunamadı.', 404)

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Geçersiz istek.', 400)

  if (body.action === 'close') {
    const now = new Date()
    const { error } = await db()
      .from('supervision_cases')
      .update({
        status: 'closed',
        closed_at: now.toISOString(),
        delete_after: new Date(now.getTime() + CASE_RETENTION_DAYS * 86_400_000).toISOString(),
      })
      .eq('id', id)
    if (error) return jsonError('Vaka kartı kapatılamadı.', 500)
    return NextResponse.json({ ok: true })
  }

  if (existing.status === 'closed') return jsonError('Kapatılmış vaka kartı düzenlenemez.', 409)

  const parsed = parseCaseInput(body)
  if ('error' in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error, findings: parsed.findings || [] }, { status: 422 })
  }
  if (existing.status === 'shared' && !parsed.value.consent_attested) {
    return jsonError('Paylaşılmış bir vaka için danışan onayı beyanı kaldırılamaz.', 409)
  }

  const { data, error } = await db()
    .from('supervision_cases')
    .update(parsed.value)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('SUPERVISION_CASE_UPDATE_ERROR', error)
    return jsonError('Vaka kartı güncellenemedi.', 500)
  }

  return NextResponse.json({ ok: true, case: data })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-case-write')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const existing = await loadOwnCase(id, auth.expertId)
  if (!existing) return jsonError('Vaka kartı bulunamadı.', 404)

  const { error } = await db().from('supervision_cases').delete().eq('id', id)
  if (error) return jsonError('Vaka kartı silinemedi.', 500)

  return NextResponse.json({ ok: true })
}
