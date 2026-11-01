import { PROFESSIONS, toProfession, type Profession } from '@/lib/professions'

export type ProfessionStats = {
  profession: Profession
  expertsApproved: number
  expertsPending: number
  applicationsTotal: number
  applicationsThisMonth: number
  applicationsMatched: number
  paidCount: number
  grossRevenue: number
  platformRevenue: number
  expertRevenue: number
  refundedCount: number
}

type ExpertInput = { id: string; profession?: string | null; status?: string | null; account_type?: string | null }
type ApplicationInput = { profession?: string | null; status?: string | null; matched_expert_id?: string | null; created_at?: string | null }
type PaymentInput = {
  expert_id?: string | null
  status?: string | null
  amount?: number | string | null
  commission_amount?: number | string | null
  expert_amount?: number | string | null
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Admin için meslek bazlı özet: uzman sayıları, başvurular ve ödemeler.
 * Saf fonksiyon; veritabanı sorgusu çağıran tarafta yapılır (test edilebilir kalsın).
 */
export function summarizeByProfession(
  experts: ExpertInput[],
  applications: ApplicationInput[],
  payments: PaymentInput[],
  now = new Date()
): ProfessionStats[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const expertProfession = new Map(experts.map((e) => [e.id, toProfession(e.profession)]))

  const stats = new Map<Profession, ProfessionStats>(
    PROFESSIONS.map((p) => [
      p,
      {
        profession: p,
        expertsApproved: 0,
        expertsPending: 0,
        applicationsTotal: 0,
        applicationsThisMonth: 0,
        applicationsMatched: 0,
        paidCount: 0,
        grossRevenue: 0,
        platformRevenue: 0,
        expertRevenue: 0,
        refundedCount: 0,
      },
    ])
  )

  for (const e of experts) {
    if (e.account_type === 'supervision_only') continue
    const s = stats.get(toProfession(e.profession))!
    if (e.status === 'approved') s.expertsApproved += 1
    else if (e.status === 'pending') s.expertsPending += 1
  }

  for (const a of applications) {
    const s = stats.get(toProfession(a.profession))!
    s.applicationsTotal += 1
    if (a.created_at && new Date(a.created_at).getTime() >= monthStart) s.applicationsThisMonth += 1
    if (a.matched_expert_id) s.applicationsMatched += 1
  }

  for (const p of payments) {
    if (!p.expert_id) continue
    const profession = expertProfession.get(p.expert_id)
    if (!profession) continue
    const s = stats.get(profession)!
    if (p.status === 'paid') {
      s.paidCount += 1
      s.grossRevenue += num(p.amount)
      s.platformRevenue += num(p.commission_amount)
      s.expertRevenue += num(p.expert_amount)
    } else if (p.status === 'refunded') {
      s.refundedCount += 1
    }
  }

  return PROFESSIONS.map((p) => {
    const s = stats.get(p)!
    return {
      ...s,
      grossRevenue: Math.round(s.grossRevenue * 100) / 100,
      platformRevenue: Math.round(s.platformRevenue * 100) / 100,
      expertRevenue: Math.round(s.expertRevenue * 100) / 100,
    }
  })
}
