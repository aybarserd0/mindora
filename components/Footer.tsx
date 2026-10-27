import Link from 'next/link'

const columns = [
  {
    title: 'Danışanlar için',
    links: [
      { label: 'Ücretsiz ön eşleşme', href: '/eslesme' },
      { label: 'Psikologlar', href: '/uzmanlar' },
      { label: 'Diyetisyenler', href: '/diyetisyen' },
      { label: 'Kişisel antrenörler', href: '/kisisel-antrenor' },
      { label: 'Psikolojik testler', href: '/psikolojik-testler' },
      { label: 'Sık sorulan sorular', href: '/sss' },
      { label: 'Danışan girişi', href: '/danisan-girisi' },
    ],
  },
  {
    title: 'Uzmanlar için',
    links: [
      { label: 'Psikolog başvurusu', href: '/uzman-basvuru' },
      { label: 'Diyetisyen başvurusu', href: '/uzman-basvuru?meslek=diyetisyen' },
      { label: 'Antrenör başvurusu', href: '/uzman-basvuru?meslek=antrenor' },
      { label: 'Süpervizyon', href: '/supervizyon' },
      { label: 'Uzman girişi', href: '/expert/login' },
    ],
  },
  {
    title: 'Mindora',
    links: [
      { label: 'Hakkımızda', href: '/hakkimizda' },
      { label: 'mindora.live@gmail.com', href: 'mailto:mindora.live@gmail.com' },
      { label: 'Instagram: @mindora.live', href: 'https://instagram.com/mindora.live' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-pine-950 text-pine-100">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg object-cover" />
              <span className="font-display text-2xl font-semibold tracking-tight text-white">
                mindora
              </span>
            </Link>
            <p className="mt-5 text-[0.95rem] leading-7 text-pine-200">
              Psikolog, diyetisyen ve kişisel antrenör desteği arayanları belgeleri doğrulanmış uzmanlarla online olarak buluşturuyoruz.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="font-display text-base font-semibold text-white">{column.title}</h2>
              <ul className="mt-4 space-y-3 text-[0.95rem]">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-pine-200 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-pine-800 bg-pine-900/60 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <p className="max-w-2xl text-[0.95rem] leading-7 text-pine-100">
            Mindora bir acil durum hizmeti değildir. Kendine ya da başkasına zarar
            verme riski varsa hemen 112&apos;yi ara veya en yakın acil servise başvur.
          </p>
          <a
            href="tel:112"
            className="mt-4 inline-flex shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-pine-950 sm:mt-0"
          >
            112&apos;yi ara
          </a>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-pine-800 pt-6 text-sm text-pine-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Mindora</p>
          <p>Görüşmeler yalnızca platform üzerinden, online olarak yapılır.</p>
        </div>
      </div>
    </footer>
  )
}
