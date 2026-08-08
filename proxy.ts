import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "./lib/security/admin-session";

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=()"
  );

  return response;
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/manifest.json")
  );
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminLoginPage = pathname === "/admin/login";
  const isAdminApiRoute = pathname.startsWith("/api/admin");
  const isAdminLoginApiRoute = pathname === "/api/admin/login";

  if (isAdminPage && !isAdminLoginPage) {
    const isAdmin = isValidAdminSession(req.cookies.get(ADMIN_COOKIE_NAME)?.value);

    if (!isAdmin) {
      const loginUrl = req.nextUrl.clone();

      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";

      const redirectResponse = NextResponse.redirect(loginUrl);

      return applySecurityHeaders(redirectResponse);
    }
  }

  if (isAdminApiRoute && !isAdminLoginApiRoute) {
    const isAdmin = isValidAdminSession(req.cookies.get(ADMIN_COOKIE_NAME)?.value);

    if (!isAdmin) {
      const unauthorizedResponse = NextResponse.json(
        { ok: false, error: "Admin erişimi doğrulanamadı." },
        { status: 401 }
      );

      return applySecurityHeaders(unauthorizedResponse);
    }
  }

  const response = NextResponse.next();

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
