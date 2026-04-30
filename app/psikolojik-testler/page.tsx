import Header from "@/components/Header";

export default function PsikolojikTestler() {
  const tests = [
    {
      title: "Kaygı Testi",
      text: "Kaygı düzeyini anlamana yardımcı kısa bir farkındalık testi.",
    },
    {
      title: "Stres Testi",
      text: "Günlük stres seviyeni değerlendirmek için hazırlanmış kısa test.",
    },
    {
      title: "Depresif Duygu Durumu Testi",
      text: "Son dönemdeki ruh halini fark etmene yardımcı olur.",
    },
    {
      title: "Özgüven Testi",
      text: "Kendine güven ve öz değerlendirme alanında farkındalık sağlar.",
    },
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
            Kendini daha iyi anlamak için kısa testler.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Bu testler tanı koymaz. Sadece farkındalık kazanman ve destek
            ihtiyacını daha iyi anlaman için hazırlanmıştır.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {tests.map((test) => (
            <div
              key={test.title}
              className="rounded-[2rem] bg-white/70 p-8 shadow-sm ring-1 ring-black/5"
            >
              <h2 className="text-2xl font-black">{test.title}</h2>
              <p className="mt-3 leading-7 text-neutral-600">{test.text}</p>

              <button className="mt-6 rounded-2xl bg-black px-6 py-3 font-bold text-white">
                Yakında
              </button>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-[2rem] bg-black p-8 text-center text-white md:p-14">
          <h2 className="text-4xl font-black">
            Test sonucuna göre destek almak ister misin?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-300">
            Kısa formu doldur, sana uygun psikolojik destek süreci için ön
            eşleşmeyi başlat.
          </p>

          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScwAz1rbyfY_4xveOv9fhreITIw8KzE_f6B3r5-x6SUXP91yA/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-2xl bg-white px-9 py-4 font-bold text-black"
          >
            Ücretsiz ön eşleşme başlat
          </a>
        </div>
      </section>
    </main>
  );
}