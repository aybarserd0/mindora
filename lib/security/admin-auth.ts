import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "./rate-limit";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "./admin-session";

export function hasAdminSession(req: NextRequest) {
  return isValidAdminSession(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export function adminUnauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Admin erişimi doğrulanamadı.",
    },
    { status: 401 }
  );
}

/**
 * Defense-in-depth guard for admin-only route handlers that live outside
 * `/api/admin/**` (proxy.ts already blocks that whole prefix). Call at the
 * top of the handler and return early when a response comes back.
 */
export function enforceAdminRequest(req: NextRequest) {
  const limited = applyRateLimit(req, {
    scope: "admin",
    limit: 120,
    windowMs: 60_000,
  });

  if (limited) return limited;

  if (!hasAdminSession(req)) {
    return adminUnauthorizedResponse();
  }

  return null;
}
