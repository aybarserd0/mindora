'use client'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f6f1ea]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        
        {/* LOGO */}
        <a href="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Mindora"
            className="h-10 w-10 rounded-xl object-cover"
          />
          <span className="text-xl font-bold tracking-tight">Mindora</span>
        </a>

        {/* NAV */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-neutral-600 md:flex">
          <a href="/" className="transition hover:text-black">
            Ana Sayfa
          </a>
          <a href="/hakkimizda" className="transition hover:text-black">
            Hakkımızda
          </a>
          <a href="/uzmanlar" className="transition hover:text-black">
            Uzmanlarımız
          </a>
          <a href="/psikolojik-testler" className="transition hover:text-black">
            Testler
          </a>
          <a href="/uzman-basvuru" className="transition hover:text-black">
            Psikolog Başvuru
          </a>
          <a href="/sss" className="transition hover:text-black">
            SSS
          </a>

          {/* 🔐 ADMIN */}
          <a
            href="/admin/uzman-basvurulari"
            className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white"
          >
            Admin
          </a>
        </nav>

        {/* CTA */}
        <a
          href="/eslesme"
          className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Başla
        </a>
      </div>
    </header>
  )
}