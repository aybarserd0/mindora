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
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f2eb]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="/" className="flex items-center gap-3" aria-label="Mindora ana sayfa">
          <img
            src="/logo.png"
            alt="Mindora"
            className="h-11 w-11 rounded-2xl object-cover shadow-sm ring-1 ring-black/10"
          />

          <div className="leading-none">
            <p className="text-xl font-black tracking-tight text-black">Mindora</p>
            <p className="mt-1 hidden text-xs font-semibold text-neutral-500 sm:block">
              Online psikolojik destek
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-7 text-sm font-bold text-neutral-700 lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-black">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/eslesme"
            className="rounded-full bg-black px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Ücretsiz eşleş
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white lg:hidden"
          aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={isOpen}
        >
          <span className="text-xl font-black">{isOpen ? '×' : '≡'}</span>
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-black/10 bg-[#f7f2eb] px-5 py-4 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2 text-sm font-bold text-neutral-700">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-black/5 transition hover:bg-white hover:text-black"
              >
                {item.label}
              </a>
            ))}

            <a
              href="/eslesme"
              onClick={() => setIsOpen(false)}
              className="mt-2 rounded-2xl bg-black px-4 py-4 text-center font-black text-white transition hover:bg-neutral-800"
            >
              Ücretsiz ön eşleşme başlat
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
