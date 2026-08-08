import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { resolveExpertIdFromToken } from '@/lib/expert-access-tokens'

export const EXPERT_SESSION_COOKIE = 'mindora_expert_session'
export const EXPERT_SESSION_MAX_AGE_SECONDS = 24 * 30 * 60 * 60

/** For use inside Route Handlers (NextRequest available). */
export async function getExpertIdFromRequest(req: NextRequest) {
  const token = req.cookies.get(EXPERT_SESSION_COOKIE)?.value

  return resolveExpertIdFromToken(token)
}

/** For use inside Server Components / layouts (no NextRequest available). */
export async function getExpertIdFromCookies() {
  const cookieStore = await cookies()
  const token = cookieStore.get(EXPERT_SESSION_COOKIE)?.value

  return resolveExpertIdFromToken(token)
}
