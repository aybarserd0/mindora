import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { summarizeByProfession } from '@/lib/admin/profession-summary'

export const runtime = 'nodejs'

/** Admin: psikolog / diyetisyen / antrenör için uzman, başvuru ve gelir özeti. (Erişim proxy.ts ile korunur.) */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const [experts, applications, payments] = await Promise.all([
      supabase.from('experts').select('id, profession, status, account_type').limit(5000),
      supabase.from('client_applications').select('profession, status, matched_expert_id, created_at').limit(10000),
      supabase.from('payments').select('expert_id, status, amount, commission_amount, expert_amount').in('status', ['paid', 'refunded']).limit(20000),
    ])

    const error = experts.error || applications.error || payments.error
    if (error) {
      console.error('ADMIN_PROFESSIONS_SUMMARY_ERROR', error)
      return NextResponse.json({ ok: false, error: 'Meslek özeti alınamadı.' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      professions: summarizeByProfession(experts.data || [], applications.data || [], payments.data || []),
    })
  } catch (err) {
    console.error('ADMIN_PROFESSIONS_SUMMARY_ERROR', err)
    return NextResponse.json({ ok: false, error: 'Sunucu hatası.' }, { status: 500 })
  }
}
