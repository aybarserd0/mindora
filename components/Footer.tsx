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
    <footer className="border-t border-slate-200/80 bg-white px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div>
            <a href="/" className="inline-flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Mindora"
                className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200"
              />
              <div>
                <p className="text-base font-bold leading-none">Mindora</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Online psikolojik destek platformu
                </p>
              </div>
            </a>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
              Mindora, psikolojik destek almak isteyen kişilerin ihtiyaçlarını
              daha iyi anlamayı ve uygun uzmanlarla güvenli bir başlangıç
              yapmasını kolaylaştırmayı hedefler.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-slate-200/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Platform
            </p>

            <nav className="space-y-3 text-sm font-medium text-slate-600">
              {platformLinks.map((link) => (
                <p key={link.href}>
                  <a href={link.href} className="transition hover:text-slate-900">
                    {link.label}
                  </a>
                </p>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Başvuru
            </p>

            <nav className="space-y-3 text-sm font-medium text-slate-600">
              {actionLinks.map((link) => (
                <p key={link.href}>
                  <a href={link.href} className="transition hover:text-slate-900">
                    {link.label}
                  </a>
                </p>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              İletişim
            </p>

            <div className="space-y-3 text-sm font-medium text-slate-600">
              <p>Instagram: @mindora.live</p>
              <p>Mail: mindora.live@gmail.com</p>
            </div>

            <div className="mt-6 rounded-lg border border-slate-200/80 p-5 text-xs leading-6 text-slate-500">
              Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
              verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da
              112 ile iletişime geç.
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-slate-200/80 p-5 text-xs leading-6 text-slate-500">
          Mindora, fiziksel bir ofise bağlı olmadan tamamen online yürütülen bir
          psikolojik destek eşleştirme hizmetidir. Danışan ve uzman iletişimi
          yalnızca platform üzerinden, yukarıdaki resmi kanallardan yürütülür.
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-slate-200/80 pt-6 text-xs font-medium text-slate-400 md:flex-row md:items-center">
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
