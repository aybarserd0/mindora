export default function Home() {
  const steps = [
    {
      title: "Kısa bilgilerini paylaş",
      text: "İhtiyacını, beklentini, uygun zamanını ve uzman tercihlerini birkaç dakikada paylaş.",
    },
    {
      title: "60 dakika içinde dönüş yapalım",
      text: "Yanıtlarına göre destek konusu, bütçe, zaman ve tercihlerin dikkate alınarak sana uygun psikolog önerisi hazırlanır.",
    },
    {
      title: "Online görüşmeye başla",
      text: "Uygun uzmanla güvenli ve sade bir başlangıç yaparak destek sürecine adım at.",
    },
  ];

  const reasons = [
    {
      title: "Kişiye özel eşleşme",
      text: "Herkese aynı yönlendirme yerine ihtiyacına, konuna ve beklentine göre daha uygun bir başlangıç hedeflenir.",
    },
    {
      title: "Gizlilik odaklı süreç",
      text: "Paylaştığın bilgiler yalnızca ön eşleşme ve yönlendirme süreci için değerlendirilir.",
    },
    {
      title: "Online ve erişilebilir",
      text: "Bulunduğun yerden, sana uygun zamanda psikolojik destek sürecine başlayabilirsin.",
    },
    {
      title: "Gerçek insan desteği",
      text: "Hazır algoritmalar yerine başvurunu gerçek insanlar değerlendirir ve daha doğru bir eşleşme hedeflenir.",
    },
  ];

  const experts = [
    {
      title: "Kaygı & Stres",
      text: "Yoğun düşünceler, sınav/iş stresi, gelecek kaygısı ve duygu düzenleme süreçleri.",
    },
    {
      title: "İlişki & Aile",
      text: "İletişim problemleri, ilişki döngüleri, aile içi çatışmalar ve sınır koyma.",
    },
    {
      title: "Özgüven & Motivasyon",
      text: "Kendini ifade etme, karar verme, erteleme ve kişisel gelişim alanları.",
    },
  ];

  const testimonials = [
    {
      name: "Ece K.",
      text: "İlk kez destek alacağım için çekiniyordum. Sürecin sade olması başlamak için güven verdi.",
    },
    {
      name: "Mert A.",
      text: "Kime başvuracağımı bilmiyordum. İhtiyacıma göre yönlendirme fikri çok rahatlattı.",
    },
    {
      name: "Derya S.",
      text: "Online olması ve önce kısa bir ön eşleşme yapılması benim için büyük kolaylık oldu.",
    },
  ];

  const faqs = [
    {
      q: "Ön eşleşme ücretli mi?",
      a: "Hayır. Mindora’da ön eşleşme süreci ücretsizdir.",
    },
    {
      q: "Bilgileri gönderdikten sonra ne olacak?",
      a: "Bilgilerin değerlendirilir ve sana uygun yönlendirme için dönüş yapılır.",
    },
    {
      q: "Görüşmeler online mı?",
      a: "Evet. Süreç online ilerler ve uygun saatine göre planlanır.",
    },
    {
      q: "Bilgilerim gizli mi?",
      a: "Paylaştığın bilgiler yalnızca eşleşme süreci için kullanılır.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#f6f1ea]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mindora"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold tracking-tight">Mindora</span>
          </a>

          <div className="hidden items-center gap-7 text-sm font-medium text-neutral-600 md:flex">
            <a href="/hakkimizda" className="transition hover:text-black">
              Hakkımızda
            </a>
            <a href="/uzmanlar" className="transition hover:text-black">
              Uzmanlarımız
            </a>
            <a href="/psikolojik-testler" className="transition hover:text-black">
              Testler
            </a>
            <a href="/uzman-basvuru" className="transition hover:text-black">
              Psikolog Başvuru
            </a>
            <a href="/sss" className="transition hover:text-black">
              SSS
            </a>
            <a
              href="/admin/uzman-basvurulari"
              className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
            >
              Admin
            </a>
          </div>

          <a
            href="/eslesme"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Hemen ücretsiz eşleş
          </a>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:pt-24">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm">
            Online ön eşleşme platformu
          </div>

          <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
            Sana uygun psikolojik desteğe daha kolay başla.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-700 md:text-xl">
            Kısa bilgilerini paylaş, ihtiyacına göre sana uygun psikolog
            önerisini hazırlayalım. İlk eşleşme ücretsizdir; seans satın alma
            zorunluluğu yoktur.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-2xl bg-black px-8 py-4 text-center font-bold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Hemen ücretsiz eşleş
            </a>

            <a
              href="/uzmanlar"
              className="rounded-2xl border border-black/10 bg-white/60 px-8 py-4 text-center font-bold text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzmanları gör
            </a>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-sm font-bold text-neutral-700 sm:grid-cols-4">
            <span className="rounded-full bg-white/70 px-4 py-2 text-center shadow-sm">
              Ücretsiz eşleşme
            </span>
            <span className="rounded-full bg-white/70 px-4 py-2 text-center shadow-sm">
              Sana özel öneri
            </span>
            <span className="rounded-full bg-white/70 px-4 py-2 text-center shadow-sm">
              Online görüşme
            </span>
            <span className="rounded-full bg-white/70 px-4 py-2 text-center shadow-sm">
              Manuel değerlendirme
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] bg-black p-3 shadow-2xl">
            <div className="rounded-[1.5rem] bg-white p-6">
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-5">
                <img
                  src="/logo.png"
                  alt="Mindora"
                  className="h-11 w-11 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm text-neutral-500">Mindora eşleşme süreci</p>
                  <h3 className="font-bold">
                    Uygun başlangıcı birlikte planlayalım
                  </h3>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold">Destek konusu</p>
                  <div className="rounded-2xl bg-[#f6f1ea] px-4 py-3 text-sm text-neutral-600">
                    Kaygı, ilişki, stres, özgüven...
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Uzman tercihi</p>
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                    <span className="rounded-xl bg-black px-3 py-3 text-center text-white">
                      Kadın
                    </span>
                    <span className="rounded-xl bg-neutral-100 px-3 py-3 text-center">
                      Erkek
                    </span>
                    <span className="rounded-xl bg-neutral-100 px-3 py-3 text-center">
                      Fark etmez
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Uygun zaman</p>
                  <div className="rounded-2xl bg-[#f6f1ea] px-4 py-3 text-sm text-neutral-600">
                    Hafta içi akşam / hafta sonu
                  </div>
                </div>

                <a
                  href="/eslesme"
                  className="block rounded-2xl bg-black px-5 py-4 text-center font-bold text-white transition hover:bg-neutral-800"
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

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="grid gap-4 rounded-[2rem] bg-white/70 p-6 text-center shadow-sm ring-1 ring-black/5 md:grid-cols-3 md:p-8">
          <div>
            <p className="text-3xl font-black">Ücretsiz</p>
            <p className="mt-1 text-sm text-neutral-600">ilk eşleşme</p>
          </div>
          <div>
            <p className="text-3xl font-black">2 seçenek</p>
            <p className="mt-1 text-sm text-neutral-600">uzman önerisi</p>
          </div>
          <div>
            <p className="text-3xl font-black">Online</p>
            <p className="mt-1 text-sm text-neutral-600">görüşme süreci</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Neden Mindora?
          </p>
          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Destek almaya başlamayı kolaylaştırıyoruz.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {reasons.map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] bg-white/70 p-7 shadow-sm ring-1 ring-black/5"
            >
              <h3 className="text-xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            3 adımda başla
          </p>
          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Süreç sade ve anlaşılır.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[2rem] bg-white/70 p-7 shadow-sm ring-1 ring-black/5"
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

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-white/70 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
              Mindora nedir?
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Psikolojik desteğe başlamayı kolaylaştıran bir eşleşme platformu.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-neutral-700">
            <p>
              Mindora, doğru desteği arayan kişileri ihtiyaçlarına uygun
              uzmanlarla buluşturmayı hedefleyen online ön eşleşme platformudur.
            </p>
            <p>
              Başlangıçta süreci manuel ve dikkatli yürütüyoruz. Böylece kişinin
              destek konusu, uzman tercihi, zamanı ve beklentisi daha sağlıklı
              değerlendirilir.
            </p>
            <a href="/hakkimizda" className="inline-block font-bold text-black underline">
              Hakkımızda sayfasına git
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-black p-8 text-white md:p-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400">
                Uzman eşleşme alanları
              </p>
              <h2 className="mt-4 text-4xl font-black md:text-5xl">
                Sana uygun destek alanını birlikte netleştirelim.
              </h2>
            </div>

            <div>
              <p className="text-lg leading-8 text-neutral-300">
                Hangi konuda destek almak istediğini bilmiyor olabilirsin.
                Yanıtların üzerinden ihtiyaç alanın daha anlaşılır hale getirilir.
              </p>

              <a
                href="/uzmanlar"
                className="mt-6 inline-block rounded-2xl bg-white px-8 py-4 font-bold text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
              >
                Uzmanlarımızı incele
              </a>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {experts.map((item) => (
              <div key={item.title} className="rounded-3xl bg-white/10 p-6">
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 text-neutral-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Kullanıcı deneyimi
          </p>
          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Başlamayı kolaylaştıran sade süreç.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-[2rem] bg-white/70 p-7 shadow-sm ring-1 ring-black/5"
            >
              <p className="leading-7 text-neutral-700">“{item.text}”</p>
              <p className="mt-5 font-black">{item.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-white/70 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
              Uzmanlar için
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Mindora uzman ağına katıl.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-neutral-700">
              Online danışan yönlendirmesi almak, uzmanlık alanına uygun
              kişilerle buluşmak ve Mindora ekosisteminde yer almak isteyen
              psikologlar için başvuru süreci açıktır.
            </p>

            <a
              href="/uzman-basvuru"
              className="mt-6 inline-block rounded-2xl bg-black px-8 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Uzman olarak başvur
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-black md:text-5xl">
            Sık sorulan sorular
          </h2>
          <p className="mt-4 text-neutral-600">
            Başlamadan önce aklına gelebilecek kısa cevaplar.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5"
            >
              <h3 className="text-lg font-black">{faq.q}</h3>
              <p className="mt-2 leading-7 text-neutral-600">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a href="/sss" className="font-bold text-black underline">
            Tüm sık sorulan soruları görüntüle
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Kendin için ilk adımı at.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Kısa bilgilerini paylaş, sana uygun psikolog önerisi için ilk adımı
            atalım.
          </p>

          <a
            href="/eslesme"
            className="mt-8 inline-block rounded-2xl bg-black px-9 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Hemen ücretsiz eşleş
          </a>

          <p className="mx-auto mt-6 max-w-3xl text-xs leading-6 text-neutral-500">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
            verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112
            ile iletişime geç.
          </p>
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-10">
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
            <p className="mb-3 font-black text-black">Sayfalar</p>
            <div className="space-y-2">
              <p><a href="/hakkimizda">Hakkımızda</a></p>
              <p><a href="/uzmanlar">Uzmanlarımız</a></p>
              <p><a href="/psikolojik-testler">Psikolojik Testler</a></p>
              <p><a href="/sss">SSS</a></p>
            </div>
          </div>

          <div>
            <p className="mb-3 font-black text-black">Başvuru</p>
            <div className="space-y-2">
              <p><a href="/eslesme">Danışan eşleşmesi</a></p>
              <p><a href="/uzman-basvuru">Uzman başvurusu</a></p>
            </div>
          </div>

          <div>
            <p className="mb-3 font-black text-black">Yönetim</p>
            <div className="space-y-2">
              <p><a href="/admin/uzman-basvurulari">Admin paneli</a></p>
              <p>Instagram: @mindora.live</p>
              <p>Mail: mindora.live@gmail.com</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}