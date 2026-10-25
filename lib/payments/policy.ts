// Danışan seansları için ücret politikası: komisyon oranları ve iptal kuralı.
// Tek kaynak burasıdır; ödeme, iptal ve panel ekranları buradan okur.

export const STANDARD_COMMISSION_RATE = 0.25
export const FOUNDING_COMMISSION_RATE = 0.15
export const FOUNDING_PERIOD_MONTHS = 12

/** Açık olduğu sürece yeni onaylanan uzmanlar kurucu uzman olarak işaretlenir. */
export const FOUNDING_PROGRAM_OPEN = true

/** Danışan bu kadar saat öncesine kadar iptal ederse tam iade alır. */
export const FREE_CANCELLATION_HOURS = 24

export type CommissionSource = 'custom' | 'founding' | 'standard'

export type ExpertCommissionFields = {
  commission_rate?: number | string | null
  founding_member?: boolean | null
  founding_until?: string | null
}

function toRate(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 0.5 ? n : null
}

export function isFoundingActive(expert: ExpertCommissionFields, now = new Date()) {
  if (!expert.founding_member) return false
  if (!expert.founding_until) return true
  const until = new Date(expert.founding_until)
  return Number.isNaN(until.getTime()) ? true : until > now
}

export function resolveCommission(
  expert: ExpertCommissionFields,
  now = new Date()
): { rate: number; source: CommissionSource } {
  const custom = toRate(expert.commission_rate)
  if (custom !== null) return { rate: custom, source: 'custom' }
  if (isFoundingActive(expert, now)) return { rate: FOUNDING_COMMISSION_RATE, source: 'founding' }
  return { rate: STANDARD_COMMISSION_RATE, source: 'standard' }
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function splitAmount(amount: number, rate: number) {
  const commissionAmount = round2(amount * rate)
  return { commissionAmount, expertAmount: round2(amount - commissionAmount) }
}

export function foundingUntilFrom(date = new Date()) {
  const until = new Date(date)
  until.setMonth(until.getMonth() + FOUNDING_PERIOD_MONTHS)
  return until.toISOString()
}

export type CancellationActor = 'client' | 'expert' | 'admin'

/**
 * İptal sonucunda iade yapılıp yapılmayacağı.
 * Danışan geç iptal ederse iade yok; diğer tüm durumlarda tam iade.
 */
export function evaluateCancellation(actor: CancellationActor, scheduledStartAt: string | Date, now = new Date()) {
  const start = new Date(scheduledStartAt)
  const hoursLeft = (start.getTime() - now.getTime()) / 3_600_000
  const late = actor === 'client' && hoursLeft < FREE_CANCELLATION_HOURS
  return { late, refund: !late, hoursLeft }
}

export function formatRate(rate: number) {
  return `%${Math.round(rate * 100)}`
}

export type PayoutEligibility = 'ready' | 'waiting_session' | 'refunded' | 'refund_pending' | 'unlinked' | 'not_paid'

/**
 * Uzman payının aktarılabilir olup olmadığı. Ödeme yalnızca seans
 * gerçekleştiğinde ya da danışan geç iptal ettiğinde uzmana aktarılır.
 */
export function getPayoutEligibility(
  payment: { status?: string | null; refund_status?: string | null; booking_id?: string | null },
  booking?: { status?: string | null; late_cancellation?: boolean | null } | null
): PayoutEligibility {
  if (payment.status === 'refunded' || payment.refund_status === 'refunded') return 'refunded'
  if (payment.refund_status === 'pending' || payment.refund_status === 'failed') return 'refund_pending'
  if (payment.status !== 'paid') return 'not_paid'
  if (!payment.booking_id || !booking) return 'unlinked'
  if (booking.status === 'completed') return 'ready'
  if (booking.status === 'cancelled' && booking.late_cancellation) return 'ready'
  return 'waiting_session'
}
