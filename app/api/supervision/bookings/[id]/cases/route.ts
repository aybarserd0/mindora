import { NextRequest, NextResponse } from 'next/server'
import { db, getBookingRole, jsonError, logCaseAccess, requireExpert, toText } from '@/lib/supervision/server'

export const runtime = 'nodejs'

// Randevuya eklenmiş anonim vaka kartları. Süpervizör yalnızca bu uç noktadan,
// yalnızca kendi randevusuna paylaşılan kartları görebilir.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req)
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const found = await getBookingRole(id, auth.expertId)
  if (!found) return jsonError('Randevu bulunamadı.', 404)

  const { data, error } = await db()
    .from('supervision_case_shares')
    .select('case_id, supervision_cases!inner(id, label, age_range, gender, topic, session_count, formulation, question, status)')
    .eq('booking_id', id)

  if (error) {
    console.error('SUPERVISION_SHARED_CASES_ERROR', error)
    return jsonError('Vaka kartları alınamadı.', 500)
  }

  type Row = { case_id: string; supervision_cases: Record<string, unknown> & { label: string } }
  const cases = ((data || []) as Row[]).map((row) => {
    const c = row.supervision_cases
    // Etiket psikoloğun kendi notudur; süpervizöre gösterilmez
    return found.role === 'supervisor' ? { ...c, label: null } : c
  })

  if (found.role === 'supervisor') {
    for (const row of (data || []) as Row[]) {
      await logCaseAccess({ actorType: 'supervisor', actorId: auth.expertId, caseId: row.case_id, bookingId: id, action: 'view' })
    }
  }

  return NextResponse.json({ ok: true, cases })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-case-write')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const found = await getBookingRole(id, auth.expertId)
  if (!found || found.role !== 'supervisee') return jsonError('Randevu bulunamadı.', 404)
  if (!['requested', 'accepted', 'confirmed'].includes(found.booking.status)) {
    return jsonError('Bu randevuya artık vaka eklenemez.', 409)
  }

  const body = await req.json().catch(() => null)
  const caseId = toText(body?.caseId, 64)

  const supabase = db()
  const { data: caseRow } = await supabase
    .from('supervision_cases')
    .select('id, owner_expert_id, status, consent_attested')
    .eq('id', caseId)
    .maybeSingle()

  if (!caseRow || caseRow.owner_expert_id !== auth.expertId) return jsonError('Vaka kartı bulunamadı.', 404)
  if (caseRow.status === 'closed') return jsonError('Kapatılmış vaka paylaşılamaz.', 409)
  if (!caseRow.consent_attested) {
    return jsonError('Paylaşmadan önce danışandan onay aldığını vaka kartında beyan etmelisin.', 409)
  }

  const { error } = await supabase
    .from('supervision_case_shares')
    .upsert({ case_id: caseRow.id, booking_id: id }, { onConflict: 'case_id,booking_id', ignoreDuplicates: true })
  if (error) {
    console.error('SUPERVISION_CASE_SHARE_ERROR', error)
    return jsonError('Vaka kartı eklenemedi.', 500)
  }

  if (caseRow.status === 'draft') {
    await supabase.from('supervision_cases').update({ status: 'shared' }).eq('id', caseRow.id)
  }
  await logCaseAccess({ actorType: 'supervisee', actorId: auth.expertId, caseId: caseRow.id, bookingId: id, action: 'share' })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-case-write')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const found = await getBookingRole(id, auth.expertId)
  if (!found || found.role !== 'supervisee') return jsonError('Randevu bulunamadı.', 404)

  const caseId = toText(new URL(req.url).searchParams.get('caseId'), 64)
  const { error } = await db().from('supervision_case_shares').delete().eq('booking_id', id).eq('case_id', caseId)
  if (error) return jsonError('Vaka kartı kaldırılamadı.', 500)

  await logCaseAccess({ actorType: 'supervisee', actorId: auth.expertId, caseId, bookingId: id, action: 'unshare' })
  return NextResponse.json({ ok: true })
}
