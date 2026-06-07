export default function Footer() {
  const platformLinks = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Uzmanlar', href: '/uzmanlar' },
    { label: 'Psikolojik Testler', href: '/psikolojik-testler' },
    { label: 'Hakkımızda', href: '/hakkimizda' },
    { label: 'SSS', href: '/sss' },
  ]

  const actionLinks = [
    { label: 'Ücretsiz Ön Eşleşme', href: '/eslesme' },
    { label: 'Uzman Başvurusu', href: '/uzman-basvuru' },
  ]

  const trustItems = [
    'Ücretsiz ön eşleşme',
    'Online görüşme süreci',
    'Gizlilik odaklı yönlendirme',
    'Acil kriz hattı değildir',
  ]

  return (
    <footer className="border-t border-black/10 bg-[#f7f2eb] px-5 py-12 text-[#171717]">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div>
            <a href="/" className="inline-flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Mindora"
                className="h-11 w-11 rounded-2xl object-cover"
              />
              <div>
                <p className="text-lg font-black leading-none">Mindora</p>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  Online psikolojik destek platformu
                </p>
              </div>
            </a>

            <p className="mt-5 max-w-sm text-sm leading-7 text-neutral-600">
              Mindora, psikolojik destek almak isteyen kişilerin ihtiyaçlarını
              daha iyi anlamayı ve uygun uzmanlarla güvenli bir başlangıç
              yapmasını kolaylaştırmayı hedefler.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-neutral-700 ring-1 ring-black/5"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-neutral-500">
              Platform
            </p>

            <nav className="space-y-3 text-sm font-bold text-neutral-700">
              {platformLinks.map((link) => (
                <p key={link.href}>
                  <a href={link.href} className="transition hover:text-black">
                    {link.label}
                  </a>
                </p>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-neutral-500">
              Başvuru
            </p>

            <nav className="space-y-3 text-sm font-bold text-neutral-700">
              {actionLinks.map((link) => (
                <p key={link.href}>
                  <a href={link.href} className="transition hover:text-black">
                    {link.label}
                  </a>
                </p>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-neutral-500">
              İletişim
            </p>

            <div className="space-y-3 text-sm font-semibold text-neutral-700">
              <p>Instagram: @mindora.live</p>
              <p>Mail: mindora.live@gmail.com</p>
            </div>

            <div className="mt-6 rounded-3xl bg-white/70 p-5 text-xs leading-6 text-neutral-500 ring-1 ring-black/5">
              Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
              verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da
              112 ile iletişime geç.
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 text-xs font-semibold text-neutral-500 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Mindora. Tüm hakları saklıdır.</p>

          <div className="flex flex-wrap gap-4">
            <span>Gizlilik odaklı süreç</span>
            <span>KVKK uyum hazırlığı</span>
            <span>Güvenli online deneyim</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
