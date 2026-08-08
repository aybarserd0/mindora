/**
 * Canonical site base URL, trailing slash always stripped.
 *
 * `NEXT_PUBLIC_SITE_URL` is configured with a trailing slash in this
 * project's env — every call site that did `${siteUrl}/path` without
 * trimming first produced a double-slash URL (e.g. in emailed links).
 * Use this instead of reading the env vars directly.
 */
export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'

  return raw.replace(/\/+$/, '')
}

/** Same trim, for a request-derived origin (proxy/dashboard base URL fallbacks). */
export function normalizeSiteUrl(url: string | null | undefined) {
  return (url || '').replace(/\/+$/, '')
}
