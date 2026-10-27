import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createSupabaseMock } from './helpers/supabase-mock'

const state = vi.hoisted(() => ({
  mock: null as null | ReturnType<typeof import('./helpers/supabase-mock').createSupabaseMock>,
  expertId: 'e1' as string | null,
  mails: [] as { to: string; subject: string; text: string }[],
  iyzico: [] as Record<string, unknown>[],
  tokens: 0,
}))

vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: () => state.mock!.client }))
vi.mock('@/lib/security/expert-session', () => ({ getExpertIdFromRequest: async () => state.expertId }))
vi.mock('@/lib/security/rate-limit', () => ({ applyRateLimit: () => null }))
vi.mock('@/lib/mail/smtp', () => ({ sendMail: async (m: { to: string; subject: string; text: string }) => { state.mails.push(m) } }))
vi.mock('@/lib/chat-access-tokens', () => ({ createConversationAccessToken: async () => ({ token: `tok${++state.tokens}` }) }))
vi.mock('@/lib/site-url', () => ({ getSiteUrl: () => 'https://mindora.test' }))
vi.mock('@/lib/payments/iyzico', () => ({
  readIyzicoEnv: () => ({ apiKey: 'k', secretKey: 's', baseUrl: 'https://sandbox' }),
  iyzicoPost: async (_env: unknown, _path: string, body: Record<string, unknown>) => {
    state.iyzico.push(body)
    return { ok: true, data: { status: 'success', token: 't', paymentPageUrl: 'https://pay' } }
  },
  money: (n: number) => n.toFixed(2),
  cleanPhone: (p: string) => p,
  splitName: (n: string) => ({ name: n, surname: n }),
}))

const req = (url: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(new URL(url, 'http://localhost'), {
    method: init?.method || 'GET',
    body: init?.body ? JSON.stringify(init.body) : undefined,
    headers: { 'content-type': 'application/json' },
  })

beforeEach(() => {
  vi.resetModules()
  state.mails = []
  state.iyzico = []
  state.tokens = 0
  state.expertId = 'e1'
})

describe('süpervizyon yalnızca psikologlara açık', () => {
  it.each([
    ['dietitian', 403],
    ['trainer', 403],
  ])('%s → %i', async (profession, status) => {
    state.mock = createSupabaseMock({ experts: { data: { profession }, error: null } })
    const { requireExpert } = await import('@/lib/supervision/server')
    const result = await requireExpert(req('/api/supervision/log'))
    expect('response' in result && result.response.status).toBe(status)
  })

  it('psikolog geçer', async () => {
    state.mock = createSupabaseMock({ experts: { data: { profession: 'psychologist' }, error: null } })
    const { requireExpert } = await import('@/lib/supervision/server')
    const result = await requireExpert(req('/api/supervision/log'))
    expect(result).toEqual({ expertId: 'e1' })
  })

  it('oturum yoksa 401', async () => {
    state.expertId = null
    state.mock = createSupabaseMock({})
    const { requireExpert } = await import('@/lib/supervision/server')
    const result = await requireExpert(req('/api/supervision/log'))
    expect('response' in result && result.response.status).toBe(401)
  })
})

describe('uzman belge doğrulaması mesleğe göre', () => {
  it('antrenörde yalnızca diploma zorunlu, başlıklar antrenöre göre', async () => {
    state.mock = createSupabaseMock({
      expert_verifications: { data: [{ id: 'v1', document_type: 'diploma', status: 'pending', created_at: '2026-10-27' }], error: null },
      experts: { data: { profession: 'trainer' }, error: null },
    })
    const { GET } = await import('@/app/api/expert/verification/route')
    const body = await (await GET(req('/api/expert/verification'))).json()
    expect(body.profession).toBe('trainer')
    const diploma = body.documents.find((d: { documentType: string }) => d.documentType === 'diploma')
    const license = body.documents.find((d: { documentType: string }) => d.documentType === 'license')
    expect(diploma.documentLabel).toMatch(/antrenörlük/)
    expect(license.required).toBe(false)
    // Tek zorunlu belge (diploma) yüklendiği için incelemeye hazır
    expect(body.summary.isReadyForReview).toBe(true)
  })

  it('diyetisyende diploma ve e-Devlet belgesi zorunlu', async () => {
    state.mock = createSupabaseMock({
      expert_verifications: { data: [{ id: 'v1', document_type: 'diploma', status: 'pending', created_at: '2026-10-27' }], error: null },
      experts: { data: { profession: 'dietitian' }, error: null },
    })
    const { GET } = await import('@/app/api/expert/verification/route')
    const body = await (await GET(req('/api/expert/verification'))).json()
    expect(body.documents.filter((d: { required: boolean }) => d.required)).toHaveLength(2)
    expect(body.summary.isReadyForReview).toBe(false)
  })
})

describe('danışan giriş bağlantısı', () => {
  it('her uzman için ayrı bağlantı tek e-postada gider', async () => {
    state.mock = createSupabaseMock({
      client_applications: { data: [{ id: 'a1', name: 'Ayşe', email: 'ayse@example.com' }, { id: 'a2', name: 'Ayşe', email: 'ayse@example.com' }], error: null },
      conversations: {
        data: [
          { id: 'c-diyet', client_application_id: 'a2', expert_id: 'd1', updated_at: '2026-10-27' },
          { id: 'c-psk', client_application_id: 'a1', expert_id: 'p1', updated_at: '2026-10-20' },
          { id: 'c-psk-eski', client_application_id: 'a1', expert_id: 'p1', updated_at: '2026-10-01' },
        ],
        error: null,
      },
      conversation_access_tokens: { data: [], error: null },
      experts: { data: [{ id: 'd1', name: 'Dyt. Elif', profession: 'dietitian' }, { id: 'p1', name: 'Deniz A.', profession: 'psychologist' }], error: null },
    })
    const { POST } = await import('@/app/api/client/access-link/route')
    const res = await POST(req('/api/client/access-link', { method: 'POST', body: { email: 'ayse@example.com' } }))
    expect(res.status).toBe(200)
    expect(state.mails).toHaveLength(1)
    const text = state.mails[0].text
    expect(text).toContain('Diyetisyen · Dyt. Elif')
    expect(text).toContain('Psikolog · Deniz A.')
    expect(state.tokens).toBe(2)
    expect(text).not.toMatch(/panel/i)
  })

  it('kayıt yoksa e-posta gitmez ve aynı yanıt döner', async () => {
    state.mock = createSupabaseMock({ client_applications: { data: [], error: null } })
    const { POST } = await import('@/app/api/client/access-link/route')
    const res = await POST(req('/api/client/access-link', { method: 'POST', body: { email: 'yok@example.com' } }))
    expect(res.status).toBe(200)
    expect(state.mails).toHaveLength(0)
  })
})

describe('ödeme sayfasında hizmet adı mesleğe göre', () => {
  it.each([
    ['dietitian', 'Diyetisyen Görüşmesi'],
    ['trainer', 'Kişisel Antrenörlük Seansı'],
    [null, 'Psikolojik Destek Seansı'],
  ])('%s', async (profession, serviceName) => {
    const { initSessionCheckout } = await import('@/lib/payments/checkout')
    const result = await initSessionCheckout({
      paymentId: 'pay1',
      bookingId: 'b1',
      amount: 1000,
      client: { id: 'c1', name: 'Ayşe Yılmaz', email: 'ayse@example.com', phone: '05000000000' },
      expertName: 'Uzman',
      profession,
      ip: '1.1.1.1',
    })
    expect(result.ok).toBe(true)
    const item = (state.iyzico[0].basketItems as { name: string; category1: string }[])[0]
    expect(item.category1).toBe(serviceName)
    expect(item.name).toContain(serviceName)
  })
})

describe('admin meslek özeti API', () => {
  it('üç mesleği döner', async () => {
    state.mock = createSupabaseMock({
      experts: { data: [{ id: 'd1', profession: 'dietitian', status: 'approved' }], error: null },
      client_applications: { data: [{ profession: 'trainer', created_at: new Date().toISOString() }], error: null },
      payments: { data: [{ expert_id: 'd1', status: 'paid', amount: 1000, commission_amount: 250, expert_amount: 750 }], error: null },
    })
    const { GET } = await import('@/app/api/admin/professions-summary/route')
    const body = await (await GET()).json()
    expect(body.ok).toBe(true)
    expect(body.professions).toHaveLength(3)
    expect(body.professions[1]).toMatchObject({ profession: 'dietitian', expertsApproved: 1, grossRevenue: 1000 })
    expect(body.professions[2]).toMatchObject({ profession: 'trainer', applicationsTotal: 1 })
  })
})
