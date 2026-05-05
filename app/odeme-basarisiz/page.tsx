export default function OdemeBasarisizPage() {
  return (
    <main className="min-h-screen bg-red-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-4xl">
          ❌
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Ödeme Başarısız</h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ödeme işlemi tamamlanamadı. Kart bilgilerinizi kontrol ederek tekrar
          deneyebilir veya farklı bir kart kullanabilirsiniz.
        </p>

        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-left text-sm text-red-900">
          <p className="font-semibold">Ne yapmalısınız?</p>
          <p className="mt-1">
            Ödeme linkiniz varsa tekrar açıp deneyin. Sorun devam ederse
            Mindora ekibiyle iletişime geçin.
          </p>
        </div>

        <div className="mt-7 space-y-3">
          <a
            href="/"
            className="block rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Ana Sayfaya Dön
          </a>

          <a
            href="/uzmanlar"
            className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Uzmanları Gör
          </a>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Kartınızdan çekim yapıldıysa ama bu ekranı görüyorsanız, ödeme kaydı
          admin panelinden kontrol edilmelidir.
        </p>
      </section>
    </main>
  )
}