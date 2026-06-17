import { NextResponse } from "next/server";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const store = new Map<string, RateLimitRecord>();

function cleanupExpiredRecords(now: number) {
  if (store.size < 5000) return;

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");

  const rawIp = forwardedFor || vercelForwardedFor || realIp || "unknown";

  return rawIp.split(",")[0]?.trim() || "unknown";
}

export function getRateLimitKey(req: Request, scope: string) {
  return `${scope}:${getClientIp(req)}`;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();

  cleanupExpiredRecords(now);

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    };

    store.set(key, next);

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: next.resetAt,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return NextResponse.json(
    {
      ok: false,
      error: "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(resetAt),
      },
    }
  );
}

export function applyRateLimit(
  req: Request,
  options: {
    scope: string;
    limit?: number;
    windowMs?: number;
  }
) {
  const result = checkRateLimit({
    key: getRateLimitKey(req, options.scope),
    limit: options.limit ?? 30,
    windowMs: options.windowMs ?? 60_000,
  });

  if (!result.allowed) {
    return rateLimitResponse(result.resetAt);
  }

  return null;
}
