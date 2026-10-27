import { describe, expect, it } from 'vitest'
import { evaluateCancellation, getPayoutEligibility, resolveCommission, splitAmount } from '@/lib/payments/policy'

describe('ödeme kuralları (üç meslekte aynı)', () => {
  const now = new Date('2026-10-27T12:00:00Z')

  it('standart %25, kurucu %15, özel oran öncelikli', () => {
    expect(resolveCommission({ founding_member: false }, now)).toEqual({ rate: 0.25, source: 'standard' })
    expect(resolveCommission({ founding_member: true, founding_until: '2027-10-01T00:00:00Z' }, now)).toEqual({ rate: 0.15, source: 'founding' })
    expect(resolveCommission({ founding_member: true, founding_until: '2026-01-01T00:00:00Z' }, now).rate).toBe(0.25)
    expect(resolveCommission({ commission_rate: 0.1, founding_member: true }, now)).toEqual({ rate: 0.1, source: 'custom' })
  })

  it('tutarı kuruşuna kadar böler', () => {
    expect(splitAmount(5000, 0.15)).toEqual({ commissionAmount: 750, expertAmount: 4250 })
    expect(splitAmount(999.99, 0.25)).toEqual({ commissionAmount: 250, expertAmount: 749.99 })
  })

  it('24 saat kuralı', () => {
    expect(evaluateCancellation('client', '2026-10-28T13:00:00Z', now)).toMatchObject({ late: false, refund: true })
    expect(evaluateCancellation('client', '2026-10-28T11:00:00Z', now)).toMatchObject({ late: true, refund: false })
    expect(evaluateCancellation('expert', '2026-10-27T13:00:00Z', now)).toMatchObject({ late: false, refund: true })
  })

  it('uzman payı yalnızca seans gerçekleşince aktarılır', () => {
    expect(getPayoutEligibility({ status: 'paid', booking_id: 'b' }, { status: 'confirmed' })).toBe('waiting_session')
    expect(getPayoutEligibility({ status: 'paid', booking_id: 'b' }, { status: 'completed' })).toBe('ready')
    expect(getPayoutEligibility({ status: 'paid', booking_id: 'b' }, { status: 'cancelled', late_cancellation: true })).toBe('ready')
    expect(getPayoutEligibility({ status: 'refunded' })).toBe('refunded')
  })
})
