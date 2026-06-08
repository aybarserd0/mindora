'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/expert/dashboard',
    description: 'Genel özet',
    icon: '⌂',
  },
  {
    label: 'Seanslar',
    href: '/expert/dashboard/sessions',
    description: 'Görüşme takibi',
    icon: '◷',
  },
  {
    label: 'Danışanlar',
    href: '/expert/dashboard/clients',
    description: 'Danışan süreçleri',
    icon: '◉',
  },
  {
    label: 'Müsaitlik',
    href: '/expert/dashboard/availability',
    description: 'Uygun saatler',
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
    icon: '◌',
  },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === '/expert/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function ExpertDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/expert/dashboard'

  return (
    <div className="h-screen overflow-hidden bg-[#f6f8fb] text-slate-950">
      <div className="flex h-full min-w-0">
        <aside className="hidden h-full w-[272px] shrink-0 border-r border-slate-200 bg-white/95 shadow-sm lg:flex lg:flex-col">
          <div className="border-b border-slate-100 px-5 py-5">
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
            <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
                Workspace
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-indigo-950">
                Seans ve danışan süreçlerini tek panelden yönetin.
              </p>
            </div>

            <div className="space-y-1.5">
              {navigationItems.map((item) => {
                const active = isActiveRoute(pathname, item.href)

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
                        active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-white'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{item.label}</span>
                      <span
                        className={`block truncate text-xs ${
                          active ? 'text-white/70' : 'text-slate-500'
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

          <div className="border-t border-slate-100 p-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-700">
                  U
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">Uzman Hesabı</p>
                  <p className="text-xs font-medium text-emerald-700">Aktif panel erişimi</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/expert/dashboard/profile"
                  className="rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  Profil
                </Link>
                <Link
                  href="/"
                  className="rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  Site
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex h-full min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
                  Mindora Expert
                </p>
                <h1 className="mt-0.5 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  Uzman Yönetim Alanı
                </h1>
              </div>

              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700 ring-1 ring-indigo-200">
                  U
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">Uzman Hesabı</p>
                  <p className="text-xs font-medium text-slate-500">Panel erişimi aktif</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                  Aktif
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navigationItems.map((item) => {
                const active = isActiveRoute(pathname, item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      active
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
