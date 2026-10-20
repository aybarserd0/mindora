'use client'

import { useState } from 'react'

const navItems = [
  { label: 'Uzmanlar', href: '/uzmanlar' },
  { label: 'Testler', href: '/psikolojik-testler' },
  { label: 'Hakkımızda', href: '/hakkimizda' },
  { label: 'SSS', href: '/sss' },
  { label: 'Uzman Başvurusu', href: '/uzman-basvuru' },
]

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="/" className="flex items-center gap-3" aria-label="Mindora ana sayfa">
          <img
            src="/logo.png"
            alt="Mindora"
            className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200"
          />

          <div className="leading-none">
            <p className="text-lg font-bold tracking-tight text-slate-900">Mindora</p>
            <p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">
              Online psikolojik destek
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-slate-900">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/eslesme"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ücretsiz eşleş
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
          aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={isOpen}
        >
          <span className="text-lg font-semibold">{isOpen ? '×' : '≡'}</span>
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-200/80 bg-white px-5 py-4 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-200/80 px-4 py-3 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}

            <a
              href="/eslesme"
              onClick={() => setIsOpen(false)}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
            >
              Ücretsiz ön eşleşme başlat
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
