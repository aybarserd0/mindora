import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { runDailyAutomation } from '@/lib/automation/daily'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Günlük otomasyon: eşleşemeyen başvuruları yeniden dener, hatırlatmaları
 * gönderir, saati geçen seansları kapatır, pazartesileri haftalık hakedişleri
 * oluşturur ve admine yapılacaklar özetini yollar.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Yetkisiz.' }, { status: 401 })
  }

  try {
    const report = await runDailyAutomation(getSupabaseAdmin())
    return NextResponse.json({ ok: report.errors.length === 0, report })
  } catch (error) {
    console.error('DAILY_AUTOMATION_CRON_ERROR', error)
    return NextResponse.json({ ok: false, error: 'Otomasyon çalışırken hata oluştu.' }, { status: 500 })
  }
}
