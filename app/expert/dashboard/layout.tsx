import Link from 'next/link'
import type { ReactNode } from 'react'

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/expert/dashboard',
    description: 'Genel özet',
  },
  {
    label: 'Seanslar',
    href: '/expert/dashboard/sessions',
    description: 'Görüşme takibi',
  },
  {
    label: 'Danışanlar',
    href: '/expert/dashboard/clients',
    description: 'Danışan süreçleri',
  },
  {
    label: 'Müsaitlik',
    href: '/expert/dashboard/availability',
    description: 'Uygun saatler',
  },
  {
    label: 'Kazançlar',
    href: '/expert/dashboard/earnings',
    description: 'Ödeme özeti',
  },
  {
    label: 'Profil',
    href: '/expert/dashboard/profile',
    description: 'Profil bilgileri',
  },
]

const workspaceStats = [
  {
    label: 'Bugünkü seans',
    value: '0',
  },
  {
    label: 'Aktif danışan',
    value: '0',
  },
  {
    label: 'Bu ay',
    value: '₺0',
  },
]

export default function ExpertDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div className="flex h-full min-h-0 w-full">
        <aside className="hidden h-full w-80 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-sm transition group-hover:bg-indigo-700">
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

            <section className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-sm font-black text-indigo-950">Expert Workspace</p>
              <p className="mt-1 text-xs leading-5 text-indigo-800">
                Seanslarınızı, danışanlarınızı ve kazançlarınızı tek panelden yönetin.
              </p>
            </section>

            <nav className="mt-5 flex flex-col gap-1.5">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl px-4 py-3 transition hover:bg-indigo-50"
                >
                  <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {item.description}
                  </span>
                </Link>
              ))}
            </nav>

            <section className="mt-auto space-y-3 pt-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Kısa Özet
                </p>
                <div className="mt-4 space-y-3">
                  {workspaceStats.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200"
                    >
                      <span className="text-xs font-semibold text-slate-500">
                        {item.label}
                      </span>
                      <span className="text-sm font-black text-slate-950">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/expert/dashboard/profile"
                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Profili Görüntüle
              </Link>

              <Link
                href="/"
                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Ana Siteye Dön
              </Link>
            </section>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                  Mindora Expert
                </p>
                <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  Uzman Yönetim Alanı
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Bugünkü seanslarınızı, danışanlarınızı ve kazançlarınızı tek panelden yönetin.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 lg:min-w-72">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-black text-indigo-700 ring-1 ring-indigo-200">
                    U
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-950">Uzman Hesabı</p>
                    <p className="text-xs font-medium text-slate-500">Panel erişimi aktif</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                  Aktif
                </span>
              </div>
            </div>

            <nav className="mt-4 grid gap-2 sm:grid-cols-3 lg:hidden">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
