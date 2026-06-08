'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type NavItem = {
  label: string
  href: string
  description: string
  icon: string
}

const navigationItems: NavItem[] = [
  {
    label: 'Genel Bakış',
    href: '/expert/dashboard',
    description: 'Panel özeti',
    icon: '⌂',
  },
  {
    label: 'Danışanlar',
    href: '/expert/dashboard/clients',
    description: 'Danışan süreçleri',
    icon: '◉',
  },
  {
    label: 'Görüşmeler',
    href: '/expert/dashboard/sessions',
    description: 'Seans takibi',
    icon: '◷',
  },
  {
    label: 'Takvim',
    href: '/expert/dashboard/availability',
    description: 'Müsait saatler',
    icon: '▦',
  },
  {
    label: 'Kazançlar',
    href: '/expert/dashboard/earnings',
    description: 'Ödeme özeti',
    icon: '₺',
  },
  {
    label: 'Profil',
    href: '/expert/dashboard/profile',
    description: 'Profil bilgileri',
    icon: '○',
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/expert/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function ExpertDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname() || '/expert/dashboard'

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div className="flex h-full min-w-0">
        <aside className="hidden h-full w-[260px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
            <Link href="/expert/dashboard" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-sm">
                M
              </span>
              <span>
                <span className="block text-base font-black tracking-tight text-slate-950">
                  Mindora
                </span>
                <span className="block text-xs font-semibold text-slate-500">
                  Uzman Paneli
                </span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-4 rounded-2xl bg-indigo-50 px-4 py-4 ring-1 ring-indigo-100">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
                Çalışma Alanı
              </p>
              <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">
                Danışanlarınızı, görüşmelerinizi ve kazançlarınızı yönetin.
              </p>
            </div>

            <div className="space-y-1.5">
              {navigationItems.map((item) => {
                const active = isActive(pathname, item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                        active
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-white'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black leading-5">
                        {item.label}
                      </span>
                      <span
                        className={`block truncate text-xs leading-4 ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="border-t border-slate-100 p-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-700">
                  U
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">
                    Uzman Hesabı
                  </p>
                  <p className="text-xs font-semibold text-emerald-600">Aktif</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/expert/dashboard/profile"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:bg-slate-100"
                >
                  Profil
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:bg-slate-100"
                >
                  Site
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                  Uzman Paneli
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  Yönetim Alanı
                </h1>
              </div>

              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:flex">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-700 ring-1 ring-indigo-200">
                  U
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">Uzman Hesabı</p>
                  <p className="text-xs font-semibold text-slate-500">Panel erişimi aktif</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                  Aktif
                </span>
              </div>

              <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {navigationItems.map((item) => {
                  const active = isActive(pathname, item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                        active
                          ? 'bg-slate-950 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
