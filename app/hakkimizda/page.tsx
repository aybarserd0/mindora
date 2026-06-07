import Header from "@/components/Header";

export default function Hakkimizda() {
  const values = [
    {
      title: "Sade başlangıç",
      text: "Psikolojik destek arayan kişinin ilk adımı daha anlaşılır, güvenli ve yorucu olmayan bir süreçle atmasını hedefleriz.",
    },
    {
      title: "Kişiye uygun yönlendirme",
      text: "Herkese aynı çözüm yerine kişinin ihtiyacını, beklentisini, uygun zamanını ve uzman tercihini dikkate alırız.",
    },
    {
      title: "Gizlilik odaklı yaklaşım",
      text: "Paylaşılan bilgilerin yalnızca ön eşleşme, yönlendirme ve iletişim süreci için değerlendirilmesini önemseriz.",
    },
  ];

  const process = [
    {
      title: "İhtiyacı anlarız",
      text: "Danışanın destek almak istediği konu kısa ön eşleşme formu üzerinden değerlendirilir.",
    },
    {
      title: "Uygunluğu değerlendiririz",
      text: "Destek konusu, uzman tercihi, uygun zaman ve beklenti gibi bilgiler birlikte ele alınır.",
    },
    {
      title: "Başlangıcı planlarız",
      text: "Uygun uzmanla online görüşme, güvenli ödeme, chat ve video görüşme süreci organize edilir.",
    },
    {
      title: "Süreci sade tutarız",
      text: "Danışan ve uzman için anlaşılır, erişilebilir ve güvenli bir dijital deneyim hedeflenir.",
    },
  ];

  const supportAreas = [
    "Kaygı",
    "Stres",
    "İlişki problemleri",
    "Özgüven",
    "Aile içi iletişim",
    "Motivasyon",
    "Tükenmişlik",
    "Gelecek kaygısı",
  ];

  const platformItems = [
    "Ücretsiz ön eşleşme başvurusu",
    "Uzman profilleri ve yönlendirme süreci",
    "Güvenli ödeme sonrası erişim",
    "Online chat ve video görüşme akışı",
  ];

  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Hakkımızda
          </p>

          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Mindora, psikolojik desteğe başlamayı kolaylaştırır.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
            Doğru psikolojik desteğe ulaşmak bazen karmaşık, yorucu ve belirsiz
            görünebilir. Mindora, bu ilk adımı daha sade, güvenli ve anlaşılır
            hale getirmek için tasarlanmış online bir eşleşme platformudur.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-2xl bg-black px-8 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Ücretsiz ön eşleşme başlat
            </a>

            <a
              href="/uzmanlar"
              className="rounded-2xl border border-black/10 bg-white/70 px-8 py-4 text-center font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzmanları incele
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="grid gap-4 rounded-[2rem] bg-white/75 p-6 text-center shadow-sm ring-1 ring-black/5 md:grid-cols-4 md:p-8">
          <div>
            <p className="text-3xl font-black">Online</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">destek süreci</p>
          </div>
          <div>
            <p className="text-3xl font-black">Güvenli</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">erişim akışı</p>
          </div>
          <div>
            <p className="text-3xl font-black">Sade</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">danışan deneyimi</p>
          </div>
          <div>
            <p className="text-3xl font-black">Kişiye özel</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">ön eşleşme</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-[2rem] bg-white/75 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
              Biz kimiz?
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Doğru uzmanla doğru başlangıcı buluşturan dijital platform.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-neutral-700">
            <p>
              Mindora, psikolojik destek almak isteyen kişilerin ihtiyaçlarını
              anlamayı ve onları uygun uzmanlarla buluşturmayı hedefleyen online
              bir ön eşleşme platformudur.
            </p>

            <p>
              Amacımız; destek almak isteyen kişinin konusuna, uzman tercihine,
              bütçesine, zamanına ve beklentisine göre daha kontrollü bir
              başlangıç yapmasına yardımcı olmaktır.
            </p>

            <p>
              Süreci sade tutmaya çalışıyoruz: başvuru, değerlendirme, randevu,
              ödeme, chat ve video görüşme akışı tek platform üzerinden ilerler.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Değerlerimiz
          </p>

          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Sürecin merkezinde güven, sadelik ve uygun yönlendirme var.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {values.map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] bg-white/75 p-7 shadow-sm ring-1 ring-black/5"
            >
              <h3 className="text-2xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
              Nasıl çalışıyoruz?
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Önce ihtiyacı anlıyor, sonra uygun başlangıcı planlıyoruz.
            </h2>

            <a
              href="/eslesme"
              className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
            >
              Eşleşme formunu doldur
            </a>
          </div>

          <div className="space-y-4">
            {process.map((item, index) => (
              <div key={item.title} className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm font-black text-neutral-400">
                  ADIM {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-black text-white">{item.title}</h3>
                <p className="mt-2 leading-7 text-neutral-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-[2rem] bg-white/75 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
              Platform deneyimi
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Danışan ve uzman için tek akışta online süreç.
            </h2>

            <p className="mt-5 text-lg leading-8 text-neutral-600">
              Mindora yalnızca bir tanıtım sitesi değil; eşleşme, ödeme, chat,
              randevu ve video görüşme süreçlerini bir araya getiren dijital bir
              danışmanlık altyapısıdır.
            </p>
          </div>

          <div className="space-y-3">
            {platformItems.map((item) => (
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

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-[2rem] bg-white/75 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
              Destek alanları
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Farklı ihtiyaçlar için daha doğru yönlendirme.
            </h2>

            <p className="mt-5 text-lg leading-8 text-neutral-600">
              Hangi konuda destek almak istediğini net bilmiyor olabilirsin.
              Mindora, ilk form yanıtların üzerinden ihtiyaç alanını daha
              anlaşılır hale getirmeyi amaçlar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {supportAreas.map((area) => (
              <div
                key={area}
                className="rounded-2xl bg-[#f7f2eb] p-5 text-center font-bold text-neutral-700 ring-1 ring-black/5"
              >
                {area}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
              Danışanlar ve uzmanlar için
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Mindora iki taraf için de düzenli bir deneyim sunar.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-white/10 p-6">
              <h3 className="text-xl font-black">Danışanlar için</h3>
              <p className="mt-3 leading-7 text-neutral-300">
                Uygun uzmanı bulma, randevu alma, ödeme yapma ve online görüşme
                sürecini daha sade hale getirir.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-6">
              <h3 className="text-xl font-black">Uzmanlar için</h3>
              <p className="mt-3 leading-7 text-neutral-300">
                Online danışan yönlendirmesi, görüşme planlama ve dijital süreç
                yönetimi için düzenli bir altyapı sağlar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            İlk adım
          </p>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            Sana uygun destek sürecini birlikte planlayalım.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Kısa ön eşleşme formunu doldur. Bilgilerin yalnızca sana uygun
            yönlendirme yapmak için değerlendirilir.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-2xl bg-black px-9 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Ücretsiz ön eşleşme başlat
            </a>

            <a
              href="/uzman-basvuru"
              className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-9 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzman olarak başvur
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-8">
        <div className="rounded-[2rem] bg-black p-8 text-white md:p-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
              Önemli not
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Mindora acil kriz hattı değildir.
            </h2>

            <p className="mt-5 text-lg leading-8 text-neutral-300">
              Kendine veya bir başkasına zarar verme riski varsa lütfen en yakın
              sağlık kuruluşuna başvur ya da 112 ile iletişime geç. Mindora,
              psikolojik destek sürecine başlamayı kolaylaştıran bir ön eşleşme
              ve online danışmanlık platformudur.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
