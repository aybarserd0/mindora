import Header from "@/components/Header";

export default function Hakkimizda() {
  const values = [
    {
      title: "Kolay başlangıç",
      text: "Destek almak isteyen kişinin ilk adımı daha sade, anlaşılır ve korkutucu olmayan bir süreçle atmasını hedefleriz.",
    },
    {
      title: "Kişiye uygun yönlendirme",
      text: "Herkese aynı çözüm yerine kişinin ihtiyacını, beklentisini ve uygun zamanını dikkate alırız.",
    },
    {
      title: "Gizlilik ve güven",
      text: "Paylaşılan bilgilerin yalnızca ön eşleşme ve yönlendirme süreci için değerlendirilmesini önemseriz.",
    },
  ];

  const process = [
    "Danışanın ihtiyacı kısa form üzerinden anlaşılır.",
    "Destek konusu, uzman tercihi ve uygun zaman değerlendirilir.",
    "Uygun uzmanla online görüşme süreci planlanır.",
    "Süreç boyunca sade, anlaşılır ve güvenli iletişim hedeflenir.",
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

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Hakkımızda
          </p>

          <h1 className="mt-4 text-5xl font-black leading-tight md:text-6xl">
            Mindora, psikolojik desteğe başlamayı kolaylaştırır.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
            Doğru psikolojik desteğe ulaşmak bazen zor, karmaşık ve yorucu
            görünebilir. Mindora, bu ilk adımı daha sade, güvenli ve anlaşılır
            hale getirmek için kuruldu.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 rounded-[2rem] bg-white/70 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
              Biz kimiz?
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Doğru uzmanla doğru başlangıcı buluşturan eşleşme platformu.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-neutral-700">
            <p>
              Mindora, psikolojik destek almak isteyen kişilerin ihtiyaçlarını
              anlayarak onları uygun uzmanlarla buluşturmayı hedefleyen online
              ön eşleşme platformudur.
            </p>

            <p>
              Amacımız, kişinin destek almak istediği konuya, uzman tercihine,
              bütçesine ve uygun zamanına göre daha kontrollü bir başlangıç
              yapmasına yardımcı olmaktır.
            </p>

            <p>
              Başlangıçta süreci manuel yürütmemizin sebebi, her danışanın
              ihtiyacını daha dikkatli değerlendirmek ve rastgele yönlendirme
              yerine daha anlamlı bir eşleşme sağlamaktır.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Değerlerimiz
          </p>

          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Sürecin merkezinde güven ve sadelik var.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {values.map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] bg-white/70 p-7 shadow-sm ring-1 ring-black/5"
            >
              <h3 className="text-2xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400">
              Nasıl çalışıyoruz?
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Önce ihtiyacı anlıyor, sonra uygun başlangıcı planlıyoruz.
            </h2>
          </div>

          <div className="space-y-4">
            {process.map((item, index) => (
              <div key={item} className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm font-bold text-neutral-400">
                  ADIM {index + 1}
                </p>
                <p className="mt-2 font-bold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-white/70 p-8 shadow-sm ring-1 ring-black/5 md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
              Destek alanları
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Farklı ihtiyaçlar için doğru yönlendirme.
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
                className="rounded-2xl bg-[#f6f1ea] p-5 text-center font-bold text-neutral-700"
              >
                {area}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-black p-8 text-white md:p-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400">
              Önemli not
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Mindora acil kriz hattı değildir.
            </h2>

            <p className="mt-5 text-lg leading-8 text-neutral-300">
              Kendine veya bir başkasına zarar verme riski varsa lütfen en yakın
              sağlık kuruluşuna başvur ya da 112 ile iletişime geç. Mindora,
              psikolojik destek sürecine başlamayı kolaylaştıran bir ön eşleşme
              platformudur.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}