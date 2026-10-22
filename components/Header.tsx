'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { label: 'Uzmanlar', href: '/uzmanlar' },
  { label: 'Testler', href: '/psikolojik-testler' },
  { label: 'Hakkımızda', href: '/hakkimizda' },
  { label: 'SSS', href: '/sss' },
  { label: 'Psikologlar için', href: '/supervizyon' },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Header() {
  const pathname = usePathname() || '/'
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Mindora ana sayfa">
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="font-display text-[1.35rem] font-semibold tracking-tight text-slate-900">
            mindora
          </span>
        </Link>

        <nav aria-label="Ana menü" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-[0.94rem] transition-colors ${
                  active
                    ? 'font-semibold text-pine-800'
                    : 'font-medium text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/expert/login"
            className="rounded-md px-3 py-2 text-[0.94rem] font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Uzman girişi
          </Link>
          <Link
            href="/eslesme"
            className="rounded-full bg-pine-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pine-900"
          >
            Ücretsiz eşleş
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-800 lg:hidden"
          aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={isOpen}
          aria-controls="mobil-menu"
        >
          {isOpen ? 'Kapat' : 'Menü'}
        </button>
      </div>

      {isOpen ? (
        <div id="mobil-menu" className="border-t border-slate-200 bg-slate-50 px-5 pb-6 pt-2 lg:hidden">
          <nav aria-label="Mobil menü" className="mx-auto flex max-w-7xl flex-col">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="border-b border-slate-200 py-4 font-display text-xl font-medium text-slate-900"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/expert/login"
              onClick={() => setIsOpen(false)}
              className="border-b border-slate-200 py-4 text-base font-medium text-slate-600"
            >
              Uzman girişi
            </Link>
            <Link
              href="/eslesme"
              onClick={() => setIsOpen(false)}
              className="mt-5 rounded-full bg-pine-800 px-5 py-3.5 text-center font-semibold text-white"
            >
              Ücretsiz ön eşleşme başlat
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
