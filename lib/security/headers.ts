import { NextResponse } from "next/server";

export function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "on");

  return response;
}

export function secureJson(data: unknown, init?: ResponseInit) {
  return withSecurityHeaders(NextResponse.json(data, init));
}
