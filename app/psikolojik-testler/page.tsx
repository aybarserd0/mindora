import Header from "@/components/Header";

export default function PsikolojikTestler() {
  const tests = [
    {
      title: "Kaygı Farkındalık Testi",
      text: "Yoğun düşünceler, endişe ve gerginlik düzeyini fark etmene yardımcı kısa bir test.",
      status: "Yakında",
    },
    {
      title: "Stres Farkındalık Testi",
      text: "Günlük yaşam, okul, iş ve ilişki kaynaklı stresini daha iyi anlaman için hazırlanıyor.",
      status: "Yakında",
    },
    {
      title: "Depresif Duygu Durumu Testi",
      text: "Son dönemdeki enerji, motivasyon ve ruh hali değişimlerini fark etmene yardımcı olur.",
      status: "Yakında",
    },
    {
      title: "Özgüven Farkındalık Testi",
      text: "Kendini ifade etme, karar alma ve öz değerlendirme alanlarında farkındalık sağlar.",
      status: "Yakında",
    },
  ];

  const notes = [
    "Bu testler tanı koymaz.",
    "Sonuçlar yalnızca farkındalık amacı taşır.",
    "Acil kriz durumlarında 112 ile iletişime geçilmelidir.",
  ];

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Psikolojik Testler
          </p>

          <h1 className="mt-4 text-5xl font-black leading-tight md:text-6xl">
            Kendini daha iyi anlamak için kısa farkındalık testleri.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Mindora testleri, destek ihtiyacını daha net fark etmene yardımcı
            olmak için hazırlanır. Bu testler profesyonel tanı yerine geçmez.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {notes.map((note) => (
              <span
                key={note}
                className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 shadow-sm ring-1 ring-black/5"
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {tests.map((test) => (
            <div
              key={test.title}
              className="rounded-[2rem] bg-white/70 p-8 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-black">{test.title}</h2>

                <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs font-bold text-neutral-600">
                  {test.status}
                </span>
              </div>

              <p className="mt-4 leading-7 text-neutral-600">{test.text}</p>

              <div className="mt-6 rounded-2xl bg-[#f6f1ea] p-5 text-sm leading-6 text-neutral-600">
                Test aktif olduğunda kısa sorularla ilerleyecek ve sonucuna göre
                destek sürecine başlamak istersen seni eşleşme sayfasına
                yönlendirecek.
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400">
              Testten sonra ne olacak?
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Sonuca göre değil, ihtiyacına göre destek planlanır.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-neutral-300">
              Testler yalnızca farkındalık sağlar. Asıl eşleşme; destek almak
              istediğin konu, uzman tercihin, uygun zamanın ve beklentin
              değerlendirilerek yapılır.
            </p>

            <a
              href="/eslesme"
              className="mt-8 inline-block rounded-2xl bg-white px-9 py-4 font-bold text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
            >
              Ücretsiz ön eşleşme başlat
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}