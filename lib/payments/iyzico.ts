import crypto from 'crypto'

// Iyzico REST çağrıları için küçük ortak yardımcı. Mevcut terapi ödeme
// akışı kendi kopyasını kullanmaya devam eder; süpervizyon ödemeleri bunu kullanır.

export type IyzicoEnv = {
  apiKey: string
  secretKey: string
  baseUrl: string
  siteUrl: string
}

function clean(url?: string | null) {
  return (url || '').replace(/\/+$/, '')
}

export function readIyzicoEnv(): IyzicoEnv | null {
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = clean(process.env.IYZICO_BASE_URL)
  const siteUrl = clean(process.env.NEXT_PUBLIC_SITE_URL)
  if (!apiKey || !secretKey || !baseUrl || !siteUrl) return null
  return { apiKey, secretKey, baseUrl, siteUrl }
}

function authHeader(env: IyzicoEnv, randomKey: string, uri: string, body: string) {
  const signature = crypto
    .createHmac('sha256', env.secretKey)
    .update(randomKey + uri + body)
    .digest('hex')
  const authString = `apiKey:${env.apiKey}&randomKey:${randomKey}&signature:${signature}`
  return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`
}

export async function iyzicoPost<T = Record<string, unknown>>(
  env: IyzicoEnv,
  uri: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; data: T | null }> {
  const randomKey = `${Date.now()}${crypto.randomInt(100000)}`
  const body = JSON.stringify(payload)
  const res = await fetch(`${env.baseUrl}${uri}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(env, randomKey, uri, body),
      'x-iyzi-rnd': randomKey,
      'Content-Type': 'application/json',
    },
    body,
  })
  const data = (await res.json().catch(() => null)) as T | null
  return { ok: res.ok, data }
}

export function money(value: number) {
  return Number(value).toFixed(2)
}

export function splitName(fullName?: string | null) {
  const value = (fullName || 'Mindora Uzman').trim()
  const parts = value.split(/\s+/)
  return { name: parts[0] || 'Mindora', surname: parts.slice(1).join(' ') || 'Uzman' }
}

export function cleanPhone(phone?: string | null) {
  if (!phone) return '+905350000000'
  let value = phone.replace(/\s/g, '').replace(/[()-]/g, '')
  if (value.startsWith('0')) value = '+9' + value
  if (value.startsWith('90')) value = '+' + value
  return value.startsWith('+90') ? value : '+905350000000'
}
