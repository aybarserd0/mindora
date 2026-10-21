import { NextRequest, NextResponse } from 'next/server'
import { db, jsonError, requireExpert } from '@/lib/supervision/server'
import { parseCaseInput } from '@/lib/supervision/cases'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireExpert(req)
  if ('response' in auth) return auth.response

  const { data, error } = await db()
    .from('supervision_cases')
    .select('*, supervision_case_shares(booking_id)')
    .eq('owner_expert_id', auth.expertId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('SUPERVISION_CASES_LIST_ERROR', error)
    return jsonError('Vaka kartları alınamadı.', 500)
  }

  return NextResponse.json({ ok: true, cases: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireExpert(req, 'supervision-case-write')
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Geçersiz istek.', 400)

  const parsed = parseCaseInput(body)
  if ('error' in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error, findings: parsed.findings || [] }, { status: 422 })
  }

  const { data, error } = await db()
    .from('supervision_cases')
    .insert({ ...parsed.value, owner_expert_id: auth.expertId, status: 'draft' })
    .select('*')
    .single()

  if (error) {
    console.error('SUPERVISION_CASE_INSERT_ERROR', error)
    return jsonError('Vaka kartı kaydedilemedi.', 500)
  }

  return NextResponse.json({ ok: true, case: data })
}
