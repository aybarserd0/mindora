/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase istemcisi yeni sütunlarla birlikte gevşek tipli kullanılıyor (mevcut rotalardaki gibi) */
import { getPayoutEligibility } from '@/lib/payments/policy'
import { isValidTrIban } from '@/lib/payments/iban'

/** Haftalık hakedişin oluşturulduğu gün (1 = Pazartesi, Türkiye saati). */
export const PAYOUT_WEEKDAY = 1

export type PayoutPayment = {
  id: string
  expert_id: string | null
  status: string | null
  refund_status: string | null
  booking_id: string | null
  expert_amount: number | string | null
  expert_payout_status: string | null
  payout_id: string | null
}

export type PayoutBooking = { id: string; status: string | null; late_cancellation: boolean | null }

export type ExpertPayoutDraft = {
  expertId: string
  amount: number
  paymentIds: string[]
}

/** ISO hafta anahtarı, ör. 2026-W45. Aynı hafta için ikinci kayıt açılmasın diye kullanılır. */
export function periodKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Türkiye saatine göre haftanın günü (0 = Pazar). */
export function istanbulWeekday(date: Date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', weekday: 'short' }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}

/**
 * Aktarılmaya hazır ödemeleri uzman bazında toplar. Hazır: seans tamamlandı
 * (ya da danışan geç iptal etti), iade yok, daha önce ödenmedi ve başka bir
 * hakedişe bağlanmadı.
 */
export function draftWeeklyPayouts(payments: PayoutPayment[], bookings: PayoutBooking[]): ExpertPayoutDraft[] {
  const bookingById = new Map(bookings.map((b) => [b.id, b]))
  const byExpert = new Map<string, ExpertPayoutDraft>()

  for (const payment of payments) {
    if (!payment.expert_id || payment.payout_id) continue
    if (payment.expert_payout_status === 'paid') continue
    const booking = payment.booking_id ? bookingById.get(payment.booking_id) ?? null : null
    if (getPayoutEligibility(payment, booking) !== 'ready') continue

    const amount = Number(payment.expert_amount)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const draft = byExpert.get(payment.expert_id) ?? { expertId: payment.expert_id, amount: 0, paymentIds: [] }
    draft.amount = Math.round((draft.amount + amount) * 100) / 100
    draft.paymentIds.push(payment.id)
    byExpert.set(payment.expert_id, draft)
  }

  return [...byExpert.values()].sort((a, b) => b.amount - a.amount)
}

export type WeeklyPayoutReport = {
  period: string
  created: { expertId: string; name: string; amount: number; payoutId: string }[]
  missingIban: { expertId: string; name: string; email: string | null; amount: number }[]
  skippedExisting: number
}

/**
 * Haftalık hakedişleri oluşturur: her uzman için "işleniyor" durumunda bir
 * kayıt açar ve ödemeleri bağlar. Para aktarımı admin ekranından ya da
 * banka talimatıyla yapılır; "ödendi" işaretlenince ödemeler de kapanır.
 */
export async function createWeeklyPayouts(supabase: any, now = new Date()): Promise<WeeklyPayoutReport> {
  const period = periodKey(now)
  const report: WeeklyPayoutReport = { period, created: [], missingIban: [], skippedExisting: 0 }

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, expert_id, status, refund_status, booking_id, expert_amount, expert_payout_status, payout_id')
    .eq('status', 'paid')
    .is('payout_id', null)
    .neq('expert_payout_status', 'paid')
    .limit(5000)
  if (error) throw new Error(`payments: ${error.message}`)
  if (!payments?.length) return report

  const bookingIds = [...new Set(payments.map((p: PayoutPayment) => p.booking_id).filter(Boolean))]
  const { data: bookings } = bookingIds.length
    ? await supabase.from('session_bookings').select('id, status, late_cancellation').in('id', bookingIds)
    : { data: [] }

  const drafts = draftWeeklyPayouts(payments, bookings || [])
  if (!drafts.length) return report

  const { data: experts } = await supabase
    .from('experts')
    .select('id, name, email, iban')
    .in('id', drafts.map((d) => d.expertId))
  const expertById = new Map((experts || []).map((e: any) => [e.id, e]))

  for (const draft of drafts) {
    const expert: any = expertById.get(draft.expertId)
    const name = expert?.name || 'Uzman'

    if (!isValidTrIban(expert?.iban)) {
      report.missingIban.push({ expertId: draft.expertId, name, email: expert?.email ?? null, amount: draft.amount })
      continue
    }

    const { data: payout, error: insertError } = await supabase
      .from('expert_payouts')
      .insert({
        expert_id: draft.expertId,
        amount: draft.amount,
        currency: 'TRY',
        status: 'processing',
        period_key: period,
        note: `Otomatik haftalık hakediş (${period}, ${draft.paymentIds.length} seans)`,
        created_by: 'system',
      })
      .select('id')
      .single()

    if (insertError || !payout) {
      // Aynı hafta için zaten kayıt varsa (benzersiz indeks) atla
      report.skippedExisting += 1
      continue
    }

    await supabase.from('payments').update({ payout_id: payout.id }).in('id', draft.paymentIds).is('payout_id', null)
    report.created.push({ expertId: draft.expertId, name, amount: draft.amount, payoutId: payout.id })
  }

  return report
}
