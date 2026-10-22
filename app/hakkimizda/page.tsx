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

  const expertCriteria = [
    {
      title: "Kimlik ve diploma doğrulama",
      text: "Uzman başvurusu yapan her psikolog, kimlik ve eğitim belgelerini Mindora ekibine yükler; belgeler incelenmeden profil yayınlanmaz.",
    },
    {
      title: "Alan ve deneyim uygunluğu",
      text: "Uzmanlık alanları, deneyim düzeyi ve çalışma yaklaşımı başvuru sürecinde değerlendirilir.",
    },
    {
      title: "Sürekli değerlendirme",
      text: "Tamamlanan seanslar sonrası alınan geri bildirimler, uzman profilinin güncel kalitesini takip etmek için kullanılır.",
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
    <main className="min-h-screen bg-white text-slate-900">
      <Header />

      <section className="border-b border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center md:py-28">
          <p className="text-sm font-semibold text-slate-400">
            Hakkımızda
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Mindora, psikolojik desteğe başlamayı kolaylaştırır.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-500">
            Doğru psikolojik desteğe ulaşmak bazen karmaşık, yorucu ve belirsiz
            görünebilir. Mindora, bu ilk adımı daha sade, güvenli ve anlaşılır
            hale getirmek için tasarlanmış online bir eşleşme platformudur.
          </p>

          <div className="mt-10">
            <a
              href="/eslesme"
              className="inline-block rounded-full bg-pine-800 px-8 py-4 text-center font-semibold text-white transition hover:bg-pine-900"
            >
              Ücretsiz ön eşleşme başlat
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Biz kimiz?
            </p>

            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Doğru uzmanla doğru başlangıcı buluşturan dijital platform.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-slate-500">
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

      <section className="border-y border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-400">
              Değerlerimiz
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
              Sürecin merkezinde güven, sadelik ve uygun yönlendirme var.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {values.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-400">
            Uzman seçim kriterlerimiz
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
            Bir profil yayınlanmadan önce nasıl bir süreçten geçer?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-500">
            Uzman ağımıza katılım, klinik standartları ve danışan güvenliğini
            önceliklendiren bir inceleme sürecinden geçer.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {expertCriteria.map((item, index) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-sm"
            >
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-pine-800 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 leading-7 text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-xl bg-pine-800 p-8 text-white md:p-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Nasıl çalışıyoruz?
              </p>

              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                Önce ihtiyacı anlıyor, sonra uygun başlangıcı planlıyoruz.
              </h2>

              <a
                href="/eslesme"
                className="mt-8 inline-block rounded-lg bg-white px-8 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Eşleşme formunu doldur
              </a>
            </div>

            <div className="space-y-4">
              {process.map((item, index) => (
                <div key={item.title} className="rounded-lg border border-white/10 p-5">
                  <p className="text-xs font-semibold text-slate-400">
                    Adım {index + 1}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 leading-7 text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Platform deneyimi
            </p>

            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Danışan ve uzman için tek akışta online süreç.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-500">
              Mindora yalnızca bir tanıtım sitesi değil; eşleşme, ödeme, chat,
              randevu ve video görüşme süreçlerini bir araya getiren dijital bir
              danışmanlık altyapısıdır.
            </p>
          </div>

          <div className="space-y-3">
            {platformItems.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200/80 px-5 py-4 font-medium text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Destek alanları
            </p>

            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Farklı ihtiyaçlar için daha doğru yönlendirme.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-500">
              Hangi konuda destek almak istediğini net bilmiyor olabilirsin.
              Mindora, ilk form yanıtların üzerinden ihtiyaç alanını daha
              anlaşılır hale getirmeyi amaçlar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {supportAreas.map((area) => (
              <div
                key={area}
                className="rounded-lg border border-slate-200/80 p-5 text-center font-medium text-slate-600"
              >
                {area}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Danışanlar ve uzmanlar için
              </p>

              <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
                Mindora iki taraf için de düzenli bir deneyim sunar.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Danışanlar için</h3>
                <p className="mt-3 leading-7 text-slate-500">
                  Uygun uzmanı bulma, randevu alma, ödeme yapma ve online görüşme
                  sürecini daha sade hale getirir.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Uzmanlar için</h3>
                <p className="mt-3 leading-7 text-slate-500">
                  Online danışan yönlendirmesi, görüşme planlama ve dijital süreç
                  yönetimi için düzenli bir altyapı sağlar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-6 rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              İletişim
            </p>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 md:text-3xl">
              Bize buradan ulaşabilirsin.
            </h2>
            <p className="mt-4 leading-7 text-slate-500">
              Mindora, fiziksel bir ofise bağlı olmadan tamamen online yürütülen
              bir hizmettir. Danışan ve uzman iletişimi yalnızca platform
              üzerinden, aşağıdaki resmi kanallarla yürütülür.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200/80 px-5 py-4">
              <p className="text-xs font-semibold text-slate-400">E-posta</p>
              <p className="mt-1 font-medium text-slate-900">mindora.live@gmail.com</p>
            </div>
            <div className="rounded-lg border border-slate-200/80 px-5 py-4">
              <p className="text-xs font-semibold text-slate-400">Instagram</p>
              <p className="mt-1 font-medium text-slate-900">@mindora.live</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm md:p-14">
          <p className="text-sm font-semibold text-slate-400">
            İlk adım
          </p>

          <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
            Sana uygun destek sürecini birlikte planlayalım.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-500">
            Kısa ön eşleşme formunu doldur. Bilgilerin yalnızca sana uygun
            yönlendirme yapmak için değerlendirilir.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-full bg-pine-800 px-9 py-4 font-semibold text-white transition hover:bg-pine-900"
            >
              Ücretsiz ön eşleşme başlat
            </a>

            <a
              href="/uzman-basvuru"
              className="rounded-lg border border-slate-200 bg-white px-9 py-4 font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Uzman olarak başvur
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="rounded-xl bg-pine-800 p-8 text-white md:p-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-slate-400">
              Önemli not
            </p>

            <h2 className="mt-4 text-3xl font-bold md:text-4xl">
              Mindora acil kriz hattı değildir.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
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
