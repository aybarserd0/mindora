export default function OdemeBasariliPage() {
  return (
    <main className="min-h-screen bg-green-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl">
          ✅
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Ödeme Başarılı</h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ödemeniz başarıyla alındı. Seans süreci için uzmanınız veya Mindora
          ekibi sizinle en kısa sürede iletişime geçecektir.
        </p>

        <div className="mt-6 rounded-2xl bg-green-50 p-4 text-left text-sm text-green-900">
          <p className="font-semibold">Sonraki adım</p>
          <p className="mt-1">
            Eşleştiğiniz uzman ödeme bilgisini aldı. Randevu/seans planlaması
            için iletişim kurulacaktır.
          </p>
        </div>

        <div className="mt-7 space-y-3">
          <a
            href="/"
            className="block rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
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
          Sorularınız için Mindora ekibiyle iletişime geçebilirsiniz.
        </p>
      </section>
    </main>
  )
}