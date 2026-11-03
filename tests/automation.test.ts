import { describe, expect, it } from 'vitest'
import { eligibility, genderPreference, rankCandidates, MAX_ACTIVE_CLIENTS, type AutoMatchCandidate } from '@/lib/matching/auto-match'
import { draftWeeklyPayouts, istanbulWeekday, periodKey } from '@/lib/automation/payouts'
import { summarizeExpertDocuments } from '@/lib/automation/verification'
import { formatIban, isValidTrIban, maskIban } from '@/lib/payments/iban'
import { adminDigestText, digestHasActions, type AdminDigest } from '@/lib/automation/notify'

const client = { topic: 'Kilo vermek', availability: 'Hafta içi akşam', preference: 'Fark etmez', profession: 'dietitian' }

function expert(id: string, extra: Partial<AutoMatchCandidate> = {}): AutoMatchCandidate {
  return {
    id,
    profession: 'dietitian',
    areas: 'Kilo vermek, Sporcu beslenmesi',
    availability: 'Hafta içi akşam',
    experience: '2–5 yıl',
    gender: 'kadin',
    session_price: 900,
    average_rating: null,
    review_count: 0,
    hasSchedule: true,
    documentsVerified: true,
    activeClients: 0,
    ...extra,
  }
}

describe('otomatik eşleşme', () => {
  it('cinsiyet tercihini okur', () => {
    expect(genderPreference('Kadın psikolog')).toBe('kadin')
    expect(genderPreference('Erkek antrenör')).toBe('erkek')
    expect(genderPreference('Fark etmez')).toBeNull()
    expect(genderPreference(null)).toBeNull()
  })

  it('belgesi doğrulanmamış, ücretsiz, takvimsiz ya da dolu uzmana danışan vermez', () => {
    expect(eligibility(client, expert('a', { documentsVerified: false }))).toBe('documents')
    expect(eligibility(client, expert('a', { session_price: 0 }))).toBe('price')
    expect(eligibility(client, expert('a', { hasSchedule: false }))).toBe('schedule')
    expect(eligibility(client, expert('a', { activeClients: MAX_ACTIVE_CLIENTS }))).toBe('capacity')
    expect(eligibility(client, expert('a', { profession: 'trainer' }))).toBe('profession')
    expect(eligibility(client, expert('a'))).toBeNull()
  })

  it('cinsiyet tercihi varsa yalnızca uyan ve cinsiyetini belirten uzman seçilir', () => {
    const wantsMale = { ...client, preference: 'Erkek diyetisyen' }
    expect(eligibility(wantsMale, expert('a', { gender: 'kadin' }))).toBe('gender')
    expect(eligibility(wantsMale, expert('a', { gender: null }))).toBe('gender')
    expect(eligibility(wantsMale, expert('a', { gender: 'erkek' }))).toBeNull()
  })

  it('konusu uyan uzmanı öne alır, eşit puanda işi az olana verir', () => {
    const ranked = rankCandidates(client, [
      expert('konusu-uymayan', { areas: 'Sporcu beslenmesi' }),
      expert('yogun', { activeClients: 4 }),
      expert('bos'),
    ])
    expect(ranked.map((r) => r.expertId)).toEqual(['bos', 'yogun', 'konusu-uymayan'])
    expect(ranked[0].reasons.join(' ')).toContain('Konu eşleşiyor')
  })

  it('uygun uzman yoksa boş liste döner', () => {
    expect(rankCandidates(client, [expert('a', { documentsVerified: false })])).toEqual([])
  })
})

describe('haftalık hakediş', () => {
  const bookings = [
    { id: 'b-done', status: 'completed', late_cancellation: false },
    { id: 'b-late', status: 'cancelled', late_cancellation: true },
    { id: 'b-future', status: 'scheduled', late_cancellation: false },
  ]
  const pay = (id: string, expertId: string, bookingId: string, amount: number, extra = {}) => ({
    id,
    expert_id: expertId,
    status: 'paid',
    refund_status: null,
    booking_id: bookingId,
    expert_amount: amount,
    expert_payout_status: 'pending',
    payout_id: null,
    ...extra,
  })

  it('yalnızca gerçekleşen (ya da geç iptal edilen) seansların payını toplar', () => {
    const drafts = draftWeeklyPayouts(
      [
        pay('p1', 'e1', 'b-done', 800),
        pay('p2', 'e1', 'b-late', 680),
        pay('p3', 'e1', 'b-future', 800),
        pay('p4', 'e2', 'b-done', 500, { refund_status: 'pending' }),
        pay('p5', 'e2', 'b-done', 500, { payout_id: 'zaten-bagli' }),
        pay('p6', 'e2', 'b-done', 500, { expert_payout_status: 'paid' }),
      ],
      bookings
    )
    expect(drafts).toEqual([{ expertId: 'e1', amount: 1480, paymentIds: ['p1', 'p2'] }])
  })

  it('hafta anahtarı ve Türkiye saatine göre gün', () => {
    expect(periodKey(new Date('2026-11-02T08:00:00Z'))).toBe('2026-W45')
    expect(periodKey(new Date('2027-01-01T08:00:00Z'))).toBe('2026-W53')
    // Pazar 22:30 UTC, İstanbul'da pazartesi 01:30
    expect(istanbulWeekday(new Date('2026-11-01T22:30:00Z'))).toBe(1)
  })
})

describe('uzman belge ön kontrolü', () => {
  const rec = (type: string, status: string, at: string) => ({ expert_id: 'e1', document_type: type, status, created_at: at })

  it('eksik ve reddedilen zorunlu belgeleri bulur', () => {
    const s = summarizeExpertDocuments('psychologist', [rec('diploma', 'approved', '2026-10-01'), rec('license', 'rejected', '2026-10-01')])
    expect(s.verified).toBe(false)
    expect(s.readyForReview).toBe(false)
    expect(s.missing.map((d) => d.key)).toEqual(['license'])
  })

  it('en son yüklenen belge geçerlidir; hepsi onaylıysa doğrulanmış sayılır', () => {
    const s = summarizeExpertDocuments('psychologist', [
      rec('diploma', 'approved', '2026-10-01'),
      rec('license', 'rejected', '2026-10-01'),
      rec('license', 'approved', '2026-10-05'),
    ])
    expect(s.verified).toBe(true)
  })

  it('hepsi yüklendi ama bekliyorsa incelemeye hazırdır', () => {
    const s = summarizeExpertDocuments('psychologist', [
      rec('diploma', 'pending', '2026-10-01'),
      rec('license', 'approved', '2026-10-01'),
    ])
    expect(s.readyForReview).toBe(true)
    expect(s.verified).toBe(false)
    expect(s.pending.map((d) => d.key)).toEqual(['diploma'])
  })
})

describe('IBAN', () => {
  // Kurgusal ama sağlama toplamı geçerli bir IBAN
  const valid = 'TR330006100519786457841326'
  it('mod-97 ile doğrular', () => {
    expect(isValidTrIban(valid)).toBe(true)
    expect(isValidTrIban('tr33 0006 1005 1978 6457 8413 26')).toBe(true)
    expect(isValidTrIban('TR330006100519786457841327')).toBe(false)
    expect(isValidTrIban('DE89370400440532013000')).toBe(false)
    expect(isValidTrIban('')).toBe(false)
  })
  it('biçimler', () => {
    expect(formatIban(valid)).toBe('TR33 0006 1005 1978 6457 8413 26')
    expect(maskIban(valid)).toBe('TR33 •••• •••• •••• •••• 1326')
  })
})

describe('admin günlük özeti', () => {
  const empty: AdminDigest = {
    unmatched: [],
    readyForReview: [],
    unclearBookings: [],
    payouts: null,
    stats: { autoMatched: 3, completedBookings: 2, remindersSent: 1 },
  }
  it('yapılacak bir şey yoksa gönderilmez', () => {
    expect(digestHasActions(empty)).toBe(false)
  })
  it('eşleşemeyen başvuruları ve hakedişleri listeler', () => {
    const d = { ...empty, unmatched: [{ id: 'a', name: 'Ayşe', profession: 'trainer', hours: 30 }], payouts: { created: [{ name: 'Elif', amount: 1480 }], missingIban: [] } }
    expect(digestHasActions(d)).toBe(true)
    const text = adminDigestText(d)
    expect(text).toContain('Ayşe · Kişisel Antrenör · 30 saattir bekliyor')
    expect(text).toContain('Elif')
    expect(text).toContain('3 danışanı eşleştirdi')
  })
})
