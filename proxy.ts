import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin/login'

  if (!isAdminRoute || isLoginPage) {
    return NextResponse.next()
  }

  const isAdmin = req.cookies.get('mindora_admin')?.value === 'true'

  if (!isAdmin) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}