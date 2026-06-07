'use client'

import { usePathname } from 'next/navigation'
import Footer from '@/components/Footer'

const FOOTER_HIDDEN_PREFIXES = [
  '/expert/dashboard',
  '/expert/availability',
  '/expert/chat',
  '/expert/session',
  '/client/chat',
  '/client/session',
  '/admin',
]

function shouldHideFooter(pathname: string) {
  return FOOTER_HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export default function RootAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const hideFooter = shouldHideFooter(pathname)

  if (hideFooter) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
