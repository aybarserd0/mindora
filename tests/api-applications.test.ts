import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createSupabaseMock } from './helpers/supabase-mock'

const state = vi.hoisted(() => ({ mock: null as null | ReturnType<typeof import('./helpers/supabase-mock').createSupabaseMock>, mails: [] as { subject: string; text?: string; html?: string; to?: string }[] }))

vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: () => state.mock!.client }))
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: async (m: { subject: string }) => { state.mails.push(m); return {} } }) },
}))

const post = (url: string, body: unknown) =>
  new NextRequest(new URL(url, 'http://localhost'), { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

const baseClient = {
  name: 'Test Danışan',
  phone: '05000000000',
  email: 'test@example.com',
  age: '25–35',
  topic: 'Kilo vermek',
  duration: 'Yeni başlıyorum',
  previousSupport: 'Hayır',
  startTime: 'Hemen',
  preference: 'Fark etmez',
  availability: ['Hafta içi akşam'],
}

describe('danışan başvurusu /api/eslesme', () => {
  beforeEach(() => {
    state.mock = createSupabaseMock({ client_applications: { error: null } })
    state.mails = []
  })

  const inserted = () => state.mock!.calls.find((c) => c.table === 'client_applications' && c.op === 'insert')?.payload as Record<string, unknown>

  it('diyetisyen başvurusu meslek ve sağlık ön sorusuyla kaydedilir', async () => {
    const { POST } = await import('@/app/api/eslesme/route')
    const res = await POST(post('/api/eslesme', { ...baseClient, profession: 'dietitian', healthScreen: 'Evet', setting: 'Salonda' }))
    expect(res.status).toBe(200)
    const row = inserted()
    expect(row.profession).toBe('dietitian')
    expect(row.health_screen).toBe('Evet')
    // Antrenman yeri sorusu yalnızca antrenörde
    expect(row.setting).toBeNull()
    expect(state.mails.some((m) => m.subject.includes('Diyetisyen'))).toBe(true)
    expect(state.mails.some((m) => (m.text || '').includes('diyetisyen eşleşmesi'))).toBe(true)
  })

  it('antrenör başvurusunda antrenman yeri kaydedilir', async () => {
    const { POST } = await import('@/app/api/eslesme/route')
    await POST(post('/api/eslesme', { ...baseClient, profession: 'trainer', healthScreen: 'Hayır', setting: 'Salonda' }))
    expect(inserted()).toMatchObject({ profession: 'trainer', health_screen: 'Hayır', setting: 'Salonda' })
  })

  it('geçersiz değerler kaydedilmez, meslek yoksa psikolog sayılır', async () => {
    const { POST } = await import('@/app/api/eslesme/route')
    await POST(post('/api/eslesme', { ...baseClient, profession: 'hacker', healthScreen: 'kanser', setting: 'Ay' }))
    expect(inserted()).toMatchObject({ profession: 'psychologist', health_screen: null, setting: null })
  })

  it('zorunlu alan eksikse 400', async () => {
    const { POST } = await import('@/app/api/eslesme/route')
    const res = await POST(post('/api/eslesme', { ...baseClient, email: 'gecersiz' }))
    expect(res.status).toBe(400)
    expect(inserted()).toBeUndefined()
  })
})

describe('uzman başvurusu /api/uzman-basvuru', () => {
  beforeEach(() => {
    state.mock = createSupabaseMock({ experts: { error: null } })
    state.mails = []
  })
  const inserted = () => (state.mock!.calls.find((c) => c.table === 'experts' && c.op === 'insert')?.payload as Record<string, unknown>[])[0]
  const expert = { name: 'Dyt. Test', phone: '05000000000', email: 'dyt@example.com', title: 'Diyetisyen', areas: ['Kilo yönetimi'], experience: '2–5 yıl', online: 'Evet', price: '1000', availability: ['Hafta sonu'], expectation: 'Danışan' }

  it('diyetisyen başvurusu meslekle kaydedilir', async () => {
    const { POST } = await import('@/app/api/uzman-basvuru/route')
    const res = await POST(post('/api/uzman-basvuru', { ...expert, profession: 'dietitian' }))
    expect(res.status).toBe(200)
    expect(inserted()).toMatchObject({ profession: 'dietitian', account_type: 'therapist', status: 'pending' })
    expect(state.mails[0].subject).toContain('Diyetisyen')
  })

  it('yalnızca süpervizyon hesabı psikolog dışında açılamaz', async () => {
    const { POST } = await import('@/app/api/uzman-basvuru/route')
    await POST(post('/api/uzman-basvuru', { ...expert, profession: 'trainer', account_type: 'supervision_only' }))
    expect(inserted()).toMatchObject({ profession: 'trainer', account_type: 'therapist' })
  })

  it('psikolog yalnızca süpervizyon için başvurabilir', async () => {
    const { POST } = await import('@/app/api/uzman-basvuru/route')
    await POST(post('/api/uzman-basvuru', { ...expert, profession: 'psychologist', account_type: 'supervision_only' }))
    expect(inserted()).toMatchObject({ profession: 'psychologist', account_type: 'supervision_only' })
  })
})
