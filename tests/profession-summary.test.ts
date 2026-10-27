import { describe, expect, it } from 'vitest'
import { summarizeByProfession } from '@/lib/admin/profession-summary'

describe('admin meslek özeti', () => {
  const now = new Date('2026-10-27T12:00:00Z')
  const experts = [
    { id: 'p1', profession: 'psychologist', status: 'approved' },
    { id: 'p2', profession: null, status: 'pending' },
    { id: 'p3', profession: 'psychologist', status: 'approved', account_type: 'supervision_only' },
    { id: 'd1', profession: 'dietitian', status: 'approved' },
    { id: 't1', profession: 'trainer', status: 'pending' },
  ]
  const applications = [
    { profession: 'psychologist', created_at: '2026-10-05T10:00:00Z', matched_expert_id: 'p1' },
    { profession: 'dietitian', created_at: '2026-09-20T10:00:00Z', matched_expert_id: null },
    { profession: 'dietitian', created_at: '2026-10-20T10:00:00Z', matched_expert_id: 'd1' },
    { profession: null, created_at: '2026-10-21T10:00:00Z' },
  ]
  const payments = [
    { expert_id: 'p1', status: 'paid', amount: 5000, commission_amount: 750, expert_amount: 4250 },
    { expert_id: 'd1', status: 'paid', amount: '1000', commission_amount: '250', expert_amount: '750' },
    { expert_id: 'd1', status: 'refunded', amount: 1000, commission_amount: 250, expert_amount: 750 },
    { expert_id: 'bilinmeyen', status: 'paid', amount: 999, commission_amount: 1, expert_amount: 998 },
  ]

  const result = summarizeByProfession(experts, applications, payments, now)
  const by = Object.fromEntries(result.map((r) => [r.profession, r]))

  it('her meslek için bir satır döner', () => {
    expect(result.map((r) => r.profession)).toEqual(['psychologist', 'dietitian', 'trainer'])
  })

  it('uzmanları sayar, yalnızca süpervizyon hesaplarını dışarıda bırakır', () => {
    expect(by.psychologist.expertsApproved).toBe(1)
    expect(by.psychologist.expertsPending).toBe(1)
    expect(by.dietitian.expertsApproved).toBe(1)
    expect(by.trainer.expertsPending).toBe(1)
  })

  it('başvuruları ve bu ayki başvuruları sayar', () => {
    expect(by.psychologist.applicationsTotal).toBe(2)
    expect(by.psychologist.applicationsThisMonth).toBe(2)
    expect(by.dietitian.applicationsTotal).toBe(2)
    expect(by.dietitian.applicationsThisMonth).toBe(1)
    expect(by.dietitian.applicationsMatched).toBe(1)
  })

  it('geliri uzmanın mesleğine göre ayırır, iadeleri ayrı sayar', () => {
    expect(by.psychologist.grossRevenue).toBe(5000)
    expect(by.psychologist.platformRevenue).toBe(750)
    expect(by.dietitian.grossRevenue).toBe(1000)
    expect(by.dietitian.expertRevenue).toBe(750)
    expect(by.dietitian.refundedCount).toBe(1)
    expect(by.trainer.paidCount).toBe(0)
  })
})
