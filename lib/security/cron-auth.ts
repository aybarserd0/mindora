import { NextRequest } from 'next/server'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/**
 * Guards `/api/cron/*` endpoints. Accepts the secret via:
 * - `Authorization: Bearer <secret>` — what Vercel's own Cron Jobs send
 *   automatically once `CRON_SECRET` is set as a project env var.
 * - `x-cron-secret: <secret>` header — for services that support custom headers.
 * - `?secret=<secret>` query param — for services that only support a plain URL
 *   (e.g. cron-job.org), so a 5–15 minute external trigger can cover the
 *   1h/15m reminder windows that Vercel Hobby's daily cron can't.
 *
 * Fails closed in production: if `CRON_SECRET` isn't configured, requests
 * are rejected rather than silently left open. Local/dev without the env
 * var still works unauthenticated for convenience.
 */
export function isAuthorizedCronRequest(req: NextRequest) {
  const secret = toText(process.env.CRON_SECRET)

  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = toText(req.headers.get('authorization'))
  const cronHeader = toText(req.headers.get('x-cron-secret'))
  const querySecret = toText(req.nextUrl.searchParams.get('secret'))

  return (
    authHeader === `Bearer ${secret}` ||
    cronHeader === secret ||
    querySecret === secret
  )
}
