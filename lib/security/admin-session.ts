import { createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE_NAME = 'mindora_admin'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD

  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be configured.')
  }

  return secret
}

function sign(payload: string) {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function createAdminSessionValue() {
  const expiry = String(Date.now() + SESSION_TTL_MS)

  return `${expiry}.${sign(expiry)}`
}

export function isValidAdminSession(cookieValue: string | undefined | null) {
  if (!cookieValue) return false

  const separatorIndex = cookieValue.lastIndexOf('.')

  if (separatorIndex === -1) return false

  const expiryRaw = cookieValue.slice(0, separatorIndex)
  const signature = cookieValue.slice(separatorIndex + 1)

  const expiry = Number(expiryRaw)

  if (!Number.isFinite(expiry) || expiry < Date.now()) return false

  const expected = sign(expiryRaw)
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== signatureBuffer.length) return false

  return timingSafeEqual(expectedBuffer, signatureBuffer)
}
