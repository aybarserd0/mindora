import { NextResponse } from "next/server";
import { applyRateLimit } from "./rate-limit";

export function getAdminTokenFromRequest(req: Request) {
  const url = new URL(req.url);

  return {
    configuredToken: process.env.ADMIN_DASHBOARD_TOKEN || process.env.ADMIN_TOKEN || "",
    headerToken: req.headers.get("x-admin-token") || "",
    queryToken: url.searchParams.get("adminToken") || "",
  };
}

export function hasAdminAccess(req: Request) {
  const { configuredToken, headerToken, queryToken } = getAdminTokenFromRequest(req);

  if (!configuredToken) {
    return process.env.NODE_ENV !== "production";
  }

  return headerToken === configuredToken || queryToken === configuredToken;
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

export function enforceAdminRequest(req: Request) {
  const limited = applyRateLimit(req, {
    scope: "admin",
    limit: 120,
    windowMs: 60_000,
  });

  if (limited) return limited;

  if (!hasAdminAccess(req)) {
    return adminUnauthorizedResponse();
  }

  return null;
}
