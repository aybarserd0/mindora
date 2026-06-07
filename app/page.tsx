import Header from '@/components/Header';

export default function Home() {
  const steps = [
    {
      title: "İhtiyacını paylaş",
      text: "Destek almak istediğin konuyu, uygun zamanını ve uzman tercihlerini birkaç dakikada bizimle paylaş.",
    },
    {
      title: "Uygun uzmanla eşleş",
      text: "Yanıtların değerlendirilir ve ihtiyacına en uygun online psikolojik destek süreci planlanır.",
    },
    {
      title: "Güvenli şekilde başla",
      text: "Online görüşme, mesajlaşma ve randevu sürecini Mindora üzerinden sade bir şekilde yönet.",
    },
  ];

  const reasons = [
    {
      title: "Doğru başlangıç",
      text: "Kime başvuracağını bilemediğinde, ihtiyacına göre daha doğru bir ilk yönlendirme yapılmasını hedefler.",
    },
    {
      title: "Gizlilik odaklı",
      text: "Paylaştığın bilgiler yalnızca eşleşme ve yönlendirme süreci için değerlendirilir.",
    },
    {
      title: "Online erişim",
      text: "Bulunduğun yerden, sana uygun zamanda online psikolojik destek sürecine başlayabilirsin.",
    },
    {
      title: "Sade süreç",
      text: "Uzman seçimi, randevu, ödeme, chat ve video görüşme tek akışta ilerler.",
    },
  ];

  const areas = [
    "Kaygı ve stres",
    "İlişki problemleri",
    "Özgüven",
    "Motivasyon",
    "Tükenmişlik",
    "Aile içi iletişim",
    "Sınav kaygısı",
    "Duygu düzenleme",
  ];

  const faqs = [
    {
      q: "Ön eşleşme ücretli mi?",
      a: "Hayır. Mindora’da ilk ön eşleşme süreci ücretsizdir.",
    },
    {
      q: "Görüşmeler online mı?",
      a: "Evet. Süreç online ilerler ve uygun saatine göre planlanır.",
    },
    {
      q: "Seans satın almak zorunda mıyım?",
      a: "Hayır. Ön eşleşme başvurusu seans satın alma zorunluluğu oluşturmaz.",
    },
    {
      q: "Mindora acil destek hattı mı?",
      a: "Hayır. Acil risk durumlarında 112 veya en yakın sağlık kuruluşuna başvurulmalıdır.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 shadow-sm">
            Güvenli online psikolojik destek platformu
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[1.03] tracking-tight md:text-6xl lg:text-7xl">
            Psikolojik desteğe doğru uzmanla, güvenli şekilde başla.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700 md:text-xl">
            Mindora; uzman eşleşmesi, online randevu, güvenli ödeme, mesajlaşma
            ve video görüşme sürecini tek platformda birleştirir.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-2xl bg-black px-8 py-4 text-center text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Hemen ücretsiz eşleş
            </a>

            <a
              href="/uzmanlar"
              className="rounded-2xl border border-black/10 bg-white/70 px-8 py-4 text-center text-base font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzmanları incele
            </a>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 text-sm font-bold text-neutral-700 md:grid-cols-4">
            <span className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm ring-1 ring-black/5">
              Ücretsiz ön eşleşme
            </span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm ring-1 ring-black/5">
              Online seans
            </span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm ring-1 ring-black/5">
              Güvenli ödeme
            </span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm ring-1 ring-black/5">
              Gizlilik odaklı
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] bg-black p-3 shadow-2xl">
            <div className="rounded-[1.6rem] bg-white p-6">
              <div className="border-b border-neutral-100 pb-5">
                <p className="text-sm font-bold text-neutral-500">
                  Mindora eşleşme ekranı
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Sana uygun desteği birlikte bulalım.
                </h2>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-black">Destek konusu</p>
                  <div className="rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm text-neutral-600">
                    Kaygı, stres, ilişki, özgüven...
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-black">Uygun zaman</p>
                  <div className="rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm text-neutral-600">
                    Hafta içi akşam / hafta sonu
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-black">Süreç</p>
                  <div className="grid grid-cols-3 gap-2 text-xs font-black">
                    <span className="rounded-xl bg-black px-3 py-3 text-center text-white">
                      Eşleş
                    </span>
                    <span className="rounded-xl bg-neutral-100 px-3 py-3 text-center">
                      Öde
                    </span>
                    <span className="rounded-xl bg-neutral-100 px-3 py-3 text-center">
                      Görüş
                    </span>
                  </div>
                </div>

                <a
                  href="/eslesme"
                  className="block rounded-2xl bg-black px-5 py-4 text-center font-black text-white transition hover:bg-neutral-800"
                >
                  Eşleşmeye başla
                </a>

                <p className="text-center text-xs leading-5 text-neutral-500">
                  Başvuru yapmak seans satın alma zorunluluğu oluşturmaz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12">
        <div className="grid gap-4 rounded-[2rem] bg-white/75 p-6 text-center shadow-sm ring-1 ring-black/5 md:grid-cols-4 md:p-8">
          <div>
            <p className="text-3xl font-black">Ücretsiz</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              ön eşleşme
            </p>
          </div>
          <div>
            <p className="text-3xl font-black">Online</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              görüşme süreci
            </p>
          </div>
          <div>
            <p className="text-3xl font-black">Güvenli</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              ödeme ve erişim
            </p>
          </div>
          <div>
            <p className="text-3xl font-black">Sade</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              danışan deneyimi
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Nasıl çalışır?
          </p>
          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            3 adımda online destek sürecine başla.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[2rem] bg-white/75 p-7 shadow-sm ring-1 ring-black/5"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg font-black text-white">
                {index + 1}
              </div>
              <h3 className="text-2xl font-black">{step.title}</h3>
              <p className="mt-3 leading-7 text-neutral-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Neden Mindora?
          </p>
          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Destek almaya başlamayı kolaylaştırır.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {reasons.map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] bg-white/75 p-7 shadow-sm ring-1 ring-black/5"
            >
              <h3 className="text-xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-[2rem] bg-black p-8 text-white md:p-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
                Destek alanları
              </p>
              <h2 className="mt-4 text-4xl font-black md:text-5xl">
                Hangi konuda destek alacağını birlikte netleştirelim.
              </h2>
            </div>

            <div>
              <p className="text-lg leading-8 text-neutral-300">
                Bazen problemin adını koymak bile zor olabilir. Mindora,
                ihtiyacını anlamaya ve seni uygun destek sürecine yönlendirmeye
                yardımcı olur.
              </p>

              <a
                href="/eslesme"
                className="mt-6 inline-block rounded-2xl bg-white px-8 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
              >
                Destek almaya başla
              </a>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {areas.map((area) => (
              <div
                key={area}
                className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-bold text-white"
              >
                {area}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-white/75 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
              Platform deneyimi
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Randevu, ödeme, chat ve video görüşme tek yerde.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              "Uzmanlarla online randevu süreci",
              "Güvenli ödeme sonrası erişim",
              "Danışan ve uzman için özel görüşme bağlantıları",
              "Chat ve video görüşme akışı",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-[#f7f2eb] px-5 py-4 font-bold text-neutral-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-white/75 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
              Uzmanlar için
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Mindora uzman ağına katıl.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-neutral-700">
              Online danışan yönlendirmesi almak, uzmanlık alanına uygun
              kişilerle buluşmak ve dijital danışmanlık sürecini daha düzenli
              yürütmek isteyen uzmanlar için başvuru süreci açıktır.
            </p>

            <a
              href="/uzman-basvuru"
              className="mt-6 inline-block rounded-2xl bg-black px-8 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Uzman olarak başvur
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-black md:text-5xl">
            Sık sorulan sorular
          </h2>
          <p className="mt-4 text-neutral-600">
            Başlamadan önce bilmen gereken kısa cevaplar.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-3xl bg-white/75 p-6 shadow-sm ring-1 ring-black/5"
            >
              <h3 className="text-lg font-black">{faq.q}</h3>
              <p className="mt-2 leading-7 text-neutral-600">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a href="/sss" className="font-black text-black underline">
            Tüm sık sorulan soruları görüntüle
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Kendin için ilk adımı bugün at.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Kısa bilgilerini paylaş, sana uygun psikolojik destek sürecini
            birlikte planlayalım.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-2xl bg-black px-9 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Ücretsiz eşleş
            </a>

            <a
              href="/uzmanlar"
              className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-9 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzmanları incele
            </a>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-xs leading-6 text-neutral-500">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
            verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112
            ile iletişime geç.
          </p>
        </div>
      </section>

      <footer className="border-t border-black/10 px-5 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 text-sm text-neutral-600 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Mindora"
                className="h-9 w-9 rounded-xl object-cover"
              />
              <div>
                <p className="font-black text-black">Mindora</p>
                <p>Zihnine iyi gelen yer.</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 font-black text-black">Platform</p>
            <div className="space-y-2">
              <p>
                <a href="/uzmanlar">Uzmanlar</a>
              </p>
              <p>
                <a href="/psikolojik-testler">Psikolojik Testler</a>
              </p>
              <p>
                <a href="/hakkimizda">Hakkımızda</a>
              </p>
              <p>
                <a href="/sss">SSS</a>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 font-black text-black">Başvuru</p>
            <div className="space-y-2">
              <p>
                <a href="/eslesme">Danışan eşleşmesi</a>
              </p>
              <p>
                <a href="/uzman-basvuru">Uzman başvurusu</a>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 font-black text-black">İletişim</p>
            <div className="space-y-2">
              <p>Instagram: @mindora.live</p>
              <p>Mail: mindora.live@gmail.com</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}