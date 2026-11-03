import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock, type QueryContext } from './helpers/supabase-mock'

const state = vi.hoisted(() => ({ mails: [] as { to: string; subject: string; text: string }[] }))

vi.mock('@/lib/mail/smtp', () => ({
  sendMail: async (m: { to: string; subject: string; text: string }) => {
    state.mails.push(m)
    return {}
  },
}))
vi.mock('@/lib/notifications', () => ({ createNotification: async () => ({ ok: true }) }))
vi.mock('@/lib/chat-access-tokens', () => ({ createConversationAccessToken: async () => ({ token: 'tok123' }) }))
vi.mock('@/lib/site-url', () => ({ getSiteUrl: () => 'https://mindora.test' }))

process.env.CONTACT_TO = 'admin@mindora.test'

const MONDAY = new Date('2026-11-02T06:00:00Z')
const has = (ctx: QueryContext, op: string, col: string, val?: unknown) =>
  ctx.filters.some(([o, c, v]) => o === op && c === col && (val === undefined || v === val))

describe('günlük otomasyon', () => {
  beforeEach(() => {
    state.mails = []
    vi.resetModules()
  })

  it('pazartesi hakediş oluşturur, IBAN eksik uzmana yazar, bekleyen danışana haber verir ve admine özet yollar', async () => {
    const mock = createSupabaseMock({
      client_applications: (ctx) => {
        if (ctx.op === 'update') return { error: null }
        if (has(ctx, 'eq', 'status', 'new') && !has(ctx, 'eq', 'id'))
          return { data: [{ id: 'a1', name: 'Ayşe', email: 'ayse@example.com', profession: 'trainer', created_at: '2026-11-01T00:00:00Z', waiting_notice_sent_at: null }], error: null }
        if (has(ctx, 'eq', 'id')) return { data: { id: 'a1', status: 'new', matched_expert_id: null, profession: 'trainer' }, error: null }
        return { data: [], error: null }
      },
      experts: (ctx) =>
        has(ctx, 'in', 'id')
          ? {
              data: [
                { id: 'e1', name: 'Elif', email: 'elif@example.com', iban: 'TR330006100519786457841326' },
                { id: 'e2', name: 'Can', email: 'can@example.com', iban: null },
              ],
              error: null,
            }
          : { data: [], error: null },
      payments: (ctx) =>
        ctx.op === 'update'
          ? { error: null }
          : has(ctx, 'is', 'payout_id') || has(ctx, 'neq', 'expert_payout_status')
            ? {
                data: [
                  { id: 'p1', expert_id: 'e1', status: 'paid', refund_status: null, booking_id: 'b1', expert_amount: 800, expert_payout_status: 'pending', payout_id: null },
                  { id: 'p2', expert_id: 'e2', status: 'paid', refund_status: null, booking_id: 'b1', expert_amount: 500, expert_payout_status: 'pending', payout_id: null },
                ],
                error: null,
              }
            : { data: [], error: null },
      session_bookings: (ctx) => (has(ctx, 'in', 'id') ? { data: [{ id: 'b1', status: 'completed', late_cancellation: false }], error: null } : { data: [], error: null }),
      expert_payouts: (ctx) => (ctx.op === 'insert' ? { data: { id: 'po1' }, error: null } : { data: null, error: null }),
    })

    const { runDailyAutomation } = await import('@/lib/automation/daily')
    const report = await runDailyAutomation(mock.client, MONDAY)

    expect(report.errors).toEqual([])
    expect(report.payouts).toEqual({ created: 1, missingIban: 1 })
    const payoutInsert = mock.calls.find((c) => c.table === 'expert_payouts' && c.op === 'insert')?.payload as Record<string, unknown>
    expect(payoutInsert).toMatchObject({ expert_id: 'e1', amount: 800, status: 'processing', period_key: '2026-W45', created_by: 'system' })
    expect(mock.calls.some((c) => c.table === 'payments' && c.op === 'update' && (c.payload as Record<string, unknown>).payout_id === 'po1')).toBe(true)

    expect(state.mails.find((m) => m.to === 'can@example.com')?.subject).toContain('IBAN')
    expect(state.mails.find((m) => m.to === 'ayse@example.com')?.subject).toContain('arıyoruz')
    expect(report.waitingNotices).toBe(1)

    const digest = state.mails.find((m) => m.to === 'admin@mindora.test')
    expect(digest?.text).toContain('Ayşe')
    expect(digest?.text).toContain('Elif')
    expect(report.digestSent).toBe(true)
  })

  it('pazartesi değilse hakediş oluşturmaz', async () => {
    const mock = createSupabaseMock({})
    const { runDailyAutomation } = await import('@/lib/automation/daily')
    const report = await runDailyAutomation(mock.client, new Date('2026-11-03T06:00:00Z'))
    expect(report.payouts).toBeNull()
    expect(mock.calls.some((c) => c.table === 'expert_payouts')).toBe(false)
    expect(report.digestSent).toBe(false)
  })
})
