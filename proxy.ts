import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "mindora_admin";

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

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginPage = pathname === "/admin/login";

  if (isAdminRoute && !isAdminLoginPage) {
    const isAdmin = req.cookies.get(ADMIN_COOKIE_NAME)?.value === "true";

    if (!isAdmin) {
      const loginUrl = req.nextUrl.clone();

      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";

      const redirectResponse = NextResponse.redirect(loginUrl);

      return applySecurityHeaders(redirectResponse);
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
