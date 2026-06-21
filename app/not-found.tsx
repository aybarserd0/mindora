import Link from 'next/link'
import Header from '@/components/Header'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl items-center px-5 py-16">
        <div className="grid w-full gap-8 rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-[0_24px_70px_rgba(15,15,15,0.06)] md:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
          <div className="rounded-[2rem] bg-black p-8 text-white md:p-10">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-white/45">
              Sayfa bulunamadı
            </p>
            <h1 className="mt-5 text-7xl font-black tracking-tight md:text-8xl">
              404
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">
              Aradığın sayfa kaldırılmış, taşınmış ya da bağlantı hatalı yazılmış olabilir.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
              Mindora
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Seni doğru sayfaya yönlendirelim.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-neutral-600">
              Mindora’da online psikolojik destek sürecine başlamak, uzmanları incelemek
              ya da sık sorulan sorulara göz atmak için aşağıdaki bağlantıları kullanabilirsin.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/"
                className="rounded-2xl bg-black px-6 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
              >
                Ana sayfaya dön
              </Link>
              <Link
                href="/eslesme"
                className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-6 py-4 text-center text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
              >
                Ücretsiz ön eşleşme başlat
              </Link>
              <Link
                href="/uzmanlar"
                className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-6 py-4 text-center text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
              >
                Uzmanları incele
              </Link>
              <Link
                href="/sss"
                className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-6 py-4 text-center text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
              >
                Sık sorulan sorular
              </Link>
            </div>

            <div className="mt-8 rounded-3xl bg-[#f7f2eb] p-5 ring-1 ring-black/5">
              <p className="text-sm font-black text-black">Önemli not</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
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
