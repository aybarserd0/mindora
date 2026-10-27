'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import NotificationBell from '@/components/NotificationBell'

type NavItem = {
  label: string
  href: string
  description: string
  icon: string
}

const navigationItems: NavItem[] = [
  { label: 'Genel Bakış', href: '/client/dashboard', description: 'Özet', icon: '⌂' },
  { label: 'Seanslarım', href: '/client/dashboard/sessions', description: 'Randevu takibi', icon: '▷' },
  { label: 'Ödemelerim', href: '/client/dashboard/payments', description: 'Ödeme geçmişi', icon: '₺' },
  { label: 'Dosyalarım', href: '/client/dashboard/files', description: 'Paylaşılan dosyalar', icon: '▦' },
  { label: 'Profilim', href: '/client/dashboard/profile', description: 'Hesap bilgileri', icon: '○' },
]

function isActive(pathname: string, href: string) {
  if (href === '/client/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function buildTokenUrl(href: string, token: string) {
  if (!token) return href

  try {
    const url = new URL(href, 'https://mindora.local')
    if (!url.searchParams.get('token')) url.searchParams.set('token', token)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    if (href.includes('token=')) return href
    const separator = href.includes('?') ? '&' : '?'
    return `${href}${separator}token=${encodeURIComponent(token)}`
  }
}

function ClientDashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/client/dashboard'
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const dashboardHref = buildTokenUrl('/client/dashboard', token)
  const profileHref = buildTokenUrl('/client/dashboard/profile', token)

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full min-w-0">
        <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="px-5 pb-4 pt-6">
            <Link href={dashboardHref} className="flex items-center gap-2.5">
              <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
              <span className="leading-tight">
                <span className="block font-display text-lg font-semibold text-slate-900">mindora</span>
                <span className="block text-xs text-slate-500">Destek alanın</span>
              </span>
            </Link>
          </div>

          <nav aria-label="Danışan menüsü" className="flex-1 overflow-y-auto px-3 pb-6 pt-2">
            <div className="space-y-0.5">
              {navigationItems.map((item) => {
                const active = isActive(pathname, item.href)
                const href = buildTokenUrl(item.href, token)

                return (
                  <Link
                    key={item.href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative block rounded-lg px-3 py-2.5 text-[0.94rem] transition-colors ${
                      active
                        ? 'bg-pine-50 font-semibold text-pine-900 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-pine-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="space-y-3 border-t border-slate-200 p-4">
            <p className="text-xs leading-5 text-slate-500">
              Acil bir durumdaysan 112&apos;yi ara. Mindora acil durum hizmeti değildir.
            </p>
            <div className="flex gap-2">
              <Link
                href={profileHref}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
              >
                Profil
              </Link>
              <Link
                href="/"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
              >
                Site
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-20 border-b border-slate-200 bg-white lg:bg-slate-50">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <Link href={dashboardHref} className="flex items-center gap-2 lg:hidden">
                <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
                <span className="font-display text-lg font-semibold text-slate-900">Destek alanın</span>
              </Link>
              <p className="hidden text-sm text-slate-500 lg:block">Seanslarını, ödemelerini ve dosyalarını buradan takip edebilirsin.</p>
              <NotificationBell role="client" token={token} />
            </div>

            <nav aria-label="Danışan menüsü" className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
              {navigationItems.map((item) => {
                const active = isActive(pathname, item.href)
                const href = buildTokenUrl(item.href, token)

                return (
                  <Link
                    key={item.href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      active ? 'bg-pine-800 text-white' : 'border border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default function ClientDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-slate-50 p-6 text-slate-900">
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-sm font-semibold text-slate-600 shadow-sm">
            Panel yükleniyor...
          </div>
        </div>
      }
    >
      <ClientDashboardShell>{children}</ClientDashboardShell>
    </Suspense>
  )
}
