import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createSupabaseMock } from './helpers/supabase-mock'

const state = vi.hoisted(() => ({
  mock: null as null | ReturnType<typeof import('./helpers/supabase-mock').createSupabaseMock>,
  mails: [] as { subject: string; text?: string; html?: string; to?: string }[],
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
  new NextRequest(new URL('/api/admin/clients/match', 'http://localhost'), { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

function setup(clientProfession: string, expertProfession: string) {
  state.mails = []
  state.mock = createSupabaseMock({
    client_applications: (ctx) =>
      ctx.op === 'update' ? { error: null } : { data: { id: 'c1', name: 'Ayşe', email: 'ayse@example.com', profession: clientProfession }, error: null },
    experts: { data: { id: 'e1', name: 'Dyt. Elif', email: 'elif@example.com', status: 'approved', profession: expertProfession }, error: null },
    conversations: (ctx) => (ctx.op === 'insert' ? { data: { id: 'conv1', status: 'locked', payment_status: 'pending' }, error: null } : { data: null, error: null }),
  })
}

describe('admin eşleştirme /api/admin/clients/match', () => {
  beforeEach(() => vi.resetModules())

  it('farklı meslekten uzmanla eşleştirmeyi reddeder', async () => {
    setup('dietitian', 'psychologist')
    const { POST } = await import('@/app/api/admin/clients/match/route')
    const res = await POST(post({ clientId: 'c1', expertId: 'e1' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/diyetisyen/)
    expect(state.mock!.calls.some((c) => c.table === 'client_applications' && c.op === 'update')).toBe(false)
  })

  it('aynı meslekte eşleştirir ve mesleğe göre e-posta gönderir', async () => {
    setup('dietitian', 'dietitian')
    const { POST } = await import('@/app/api/admin/clients/match/route')
    const res = await POST(post({ clientId: 'c1', expertId: 'e1' }))
    expect(res.status).toBe(200)
    const clientMail = state.mails.find((m) => m.to === 'ayse@example.com')!
    expect(clientMail.subject).toContain('Diyetisyeninle eşleştin')
    expect(clientMail.text).toContain('Diyetisyeninin boş saatlerinden')
    expect(clientMail.html).toContain('Diyetisyeninle eşleştin')
    expect(clientMail.html).not.toContain('Psikoloğun')
  })

  it('eski kayıtlarda meslek boşsa psikolog sayılır', async () => {
    setup('', 'psychologist')
    const { POST } = await import('@/app/api/admin/clients/match/route')
    const res = await POST(post({ clientId: 'c1', expertId: 'e1' }))
    expect(res.status).toBe(200)
    expect(state.mails.find((m) => m.to === 'ayse@example.com')!.subject).toContain('Psikoloğunla')
  })
})
