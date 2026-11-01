import Link from 'next/link'
import Header from '@/components/Header'
import { ThreadLine } from '@/components/marketing/Mocks'

const links = [
  { href: '/eslesme', title: 'Ücretsiz ön eşleşme', text: 'Psikolog, diyetisyen ya da antrenör; sana uygun uzmanı birlikte bulalım.' },
  { href: '/uzmanlar', title: 'Onaylı uzmanlar', text: 'Belgeleri kontrol edilmiş psikolog, diyetisyen ve antrenörleri incele.' },
  { href: '/psikolojik-testler', title: 'Farkındalık testleri', text: 'İki dakikada nasıl hissettiğine bak.' },
  { href: '/sss', title: 'Sık sorulan sorular', text: 'Ücret, gizlilik ve süreç hakkında.' },
]

export default function NotFound() {
  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />

      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(50%_60%_at_80%_10%,var(--color-lilac-100),transparent_70%),radial-gradient(40%_50%_at_10%_90%,var(--color-pine-100),transparent_70%)]" />
        <ThreadLine className="absolute inset-0 h-full w-full opacity-70" d="M-20 520 C 220 260, 460 600, 720 320 S 1100 80, 1400 240" length={1700} />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <p className="font-display text-7xl font-semibold text-lilac-300 sm:text-8xl">404</p>
          <h1 className="mt-4 max-w-[18ch] text-[2.5rem] font-semibold leading-[1.05] sm:text-6xl">
            Bu sayfa kaybolmuş, ama sen doğru yerdesin.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Bağlantı taşınmış ya da yanlış yazılmış olabilir. Aradığın şey büyük ihtimalle aşağıdakilerden biri.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <p className="font-display text-lg font-semibold text-slate-900">{link.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{link.text}</p>
                <span aria-hidden="true" className="mt-4 inline-block text-pine-700 transition-transform group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>

          <p className="mt-12 max-w-2xl text-xs leading-6 text-slate-500">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa lütfen 112 ile
            iletişime geç ya da en yakın sağlık kuruluşuna başvur.
          </p>
        </div>
      </section>
    </main>
  )
}
