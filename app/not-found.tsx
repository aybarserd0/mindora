import Link from 'next/link'
import Header from '@/components/Header'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header />

      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl items-center px-5 py-16">
        <div className="grid w-full gap-8 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
          <div className="rounded-xl bg-pine-800 p-8 text-white md:p-10">
            <p className="text-sm font-semibold text-slate-400">
              Sayfa bulunamadı
            </p>
            <h1 className="mt-5 text-7xl font-bold tracking-tight md:text-8xl">
              404
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Aradığın sayfa kaldırılmış, taşınmış ya da bağlantı hatalı yazılmış olabilir.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold text-slate-400">
              Mindora
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Seni doğru sayfaya yönlendirelim.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500">
              Mindora’da online psikolojik destek sürecine başlamak, uzmanları incelemek
              ya da sık sorulan sorulara göz atmak için aşağıdaki bağlantıları kullanabilirsin.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/"
                className="rounded-lg bg-pine-800 px-6 py-4 text-center text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900"
              >
                Ana sayfaya dön
              </Link>
              <Link
                href="/eslesme"
                className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-center text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
              >
                Ücretsiz ön eşleşme başlat
              </Link>
              <Link
                href="/uzmanlar"
                className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-center text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
              >
                Uzmanları incele
              </Link>
              <Link
                href="/sss"
                className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-center text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
              >
                Sık sorulan sorular
              </Link>
            </div>

            <div className="mt-8 rounded-lg border border-slate-200/80 p-5">
              <p className="text-sm font-semibold text-slate-900">Önemli not</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa
                lütfen 112 ile iletişime geç ya da en yakın sağlık kuruluşuna başvur.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
