import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createSupabaseMock, type QueryContext } from './helpers/supabase-mock'

const state = vi.hoisted(() => ({
  mock: null as null | ReturnType<typeof import('./helpers/supabase-mock').createSupabaseMock>,
  mails: [] as { subject: string; text?: string; to?: string }[],
}))

vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: () => state.mock!.client }))
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: async (m: { subject: string }) => { state.mails.push(m); return {} } }) },
}))
vi.mock('@/lib/notifications', () => ({ createNotification: async () => ({ ok: true }) }))
vi.mock('@/lib/chat-access-tokens', () => ({ createConversationAccessToken: async () => ({ token: 'tok123' }) }))
vi.mock('@/lib/site-url', () => ({ getSiteUrl: () => 'https://mindora.test' }))

process.env.SMTP_HOST = 'smtp.test'
process.env.SMTP_USER = 'u'
process.env.SMTP_PASS = 'p'

const post = (body: unknown) =>
  new NextRequest(new URL('/api/eslesme', 'http://localhost'), { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

const application = {
  name: 'Ayşe',
  phone: '05000000000',
  email: 'ayse@example.com',
  topic: 'Kilo vermek',
  availability: ['Hafta içi akşam'],
  preference: 'Fark etmez',
  profession: 'dietitian',
  healthScreen: 'Hayır',
}

const hasFilter = (ctx: QueryContext, op: string, col: string) => ctx.filters.some(([o, c]) => o === op && c === col)

function setup({ verified }: { verified: boolean }) {
  state.mails = []
  const appRow = { id: 'a1', name: 'Ayşe', email: 'ayse@example.com', status: 'new', matched_expert_id: null, profession: 'dietitian', topic: 'Kilo vermek', availability: 'Hafta içi akşam', preference: 'Fark etmez' }
  const expertRow = { id: 'e1', name: 'Dyt. Elif', email: 'elif@example.com', status: 'approved', profession: 'dietitian', areas: 'Kilo vermek', availability: 'Hafta içi akşam', experience: '2–5 yıl', gender: 'kadin', session_price: 900, average_rating: null, review_count: 0 }
  state.mock = createSupabaseMock({
    client_applications: (ctx) =>
      ctx.op === 'insert' ? { data: { id: 'a1' }, error: null } : ctx.op === 'update' ? { error: null } : { data: appRow, error: null },
    experts: (ctx) => (hasFilter(ctx, 'eq', 'id') ? { data: expertRow, error: null } : { data: [expertRow], error: null }),
    expert_availability: { data: [{ expert_id: 'e1' }], error: null },
    expert_verifications: {
      data: verified
        ? [
            { expert_id: 'e1', document_type: 'diploma', status: 'approved', created_at: '2026-10-01' },
            { expert_id: 'e1', document_type: 'license', status: 'approved', created_at: '2026-10-01' },
          ]
        : [{ expert_id: 'e1', document_type: 'diploma', status: 'pending', created_at: '2026-10-01' }],
      error: null,
    },
    conversations: (ctx) =>
      ctx.op === 'insert'
        ? { data: { id: 'conv1', status: 'locked', payment_status: 'pending' }, error: null }
        : hasFilter(ctx, 'eq', 'client_application_id')
          ? { data: null, error: null }
          : { data: [], error: null },
  })
}

const applicationUpdate = () =>
  state.mock!.calls.find((c) => c.table === 'client_applications' && c.op === 'update' && (c.payload as Record<string, unknown>).status === 'matched')
    ?.payload as Record<string, unknown> | undefined

describe('başvuru gelince otomatik eşleşme', () => {
  beforeEach(() => vi.resetModules())

  it('belgeleri doğrulanmış uygun uzman varsa danışan hemen eşleşir', async () => {
    setup({ verified: true })
    const { POST } = await import('@/app/api/eslesme/route')
    const res = await POST(post(application))
    const json = await res.json()
    expect(json).toEqual({ ok: true, matched: true })
    expect(applicationUpdate()).toMatchObject({ matched_expert_id: 'e1', status: 'matched', match_source: 'auto' })
    const toClient = state.mails.filter((m) => m.to === 'ayse@example.com')
    expect(toClient).toHaveLength(1)
    expect(toClient[0].subject).toContain('eşleştin')
    expect(state.mails.some((m) => m.to === 'elif@example.com')).toBe(true)
    expect(state.mails.some((m) => (m.text || '').includes('Otomatik eşleşme: yapıldı'))).toBe(true)
  })

  it('uzmanın belgeleri doğrulanmamışsa eşleşme yapılmaz, başvuru bekler', async () => {
    setup({ verified: false })
    const { POST } = await import('@/app/api/eslesme/route')
    const json = await (await POST(post(application))).json()
    expect(json).toEqual({ ok: true, matched: false })
    expect(applicationUpdate()).toBeUndefined()
    const toClient = state.mails.filter((m) => m.to === 'ayse@example.com')
    expect(toClient.map((m) => m.subject)).toEqual(['Mindora Başvurun Alındı'])
    expect(state.mails.some((m) => (m.text || '').includes('uygun uzman yok'))).toBe(true)
  })
})
