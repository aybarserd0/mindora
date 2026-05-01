import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = req.nextUrl.pathname === '/admin/login'

  if (!isAdminRoute || isLoginPage) {
    return NextResponse.next()
  }

  const isAdmin = req.cookies.get('mindora_admin')?.value === 'true'

  if (!isAdmin) {
    const loginUrl = new URL('/admin/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}