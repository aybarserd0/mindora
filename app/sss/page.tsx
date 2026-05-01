import Header from "@/components/Header";

export default function SSS() {
  const faqs = [
    {
      category: "Başlangıç",
      items: [
        {
          q: "Ön eşleşme ücretli mi?",
          a: "Hayır. Mindora’da ön eşleşme süreci ücretsizdir. Formu doldurmak seans satın alma zorunluluğu oluşturmaz.",
        },
        {
          q: "Formu doldurduktan sonra ne olacak?",
          a: "Bilgilerin değerlendirilir. Destek konusu, tercihlerin ve uygun zamanına göre sana dönüş yapılır.",
        },
        {
          q: "Ne kadar sürede dönüş alırım?",
          a: "Başvurular yoğunluğa göre değerlendirilir. Hedefimiz en kısa sürede uygun yönlendirme için iletişime geçmektir.",
        },
      ],
    },
    {
      category: "Görüşme süreci",
      items: [
        {
          q: "Görüşmeler online mı?",
          a: "Evet. Mindora başlangıçta online psikolojik destek sürecine odaklanır.",
        },
        {
          q: "Hangi uzmanla görüşeceğime nasıl karar veriliyor?",
          a: "Formdaki yanıtların; destek almak istediğin konu, uzman tercihin, uygun zamanın ve beklentin dikkate alınarak değerlendirilir.",
        },
        {
          q: "Seans ücreti ne kadar?",
          a: "Seans ücreti uzman ve planlama netleştikten sonra açıkça paylaşılır. Ön eşleşme aşaması ücretsizdir.",
        },
      ],
    },
    {
      category: "Gizlilik ve güven",
      items: [
        {
          q: "Bilgilerim gizli mi?",
          a: "Paylaştığın bilgiler yalnızca ön eşleşme ve yönlendirme süreci için kullanılır.",
        },
        {
          q: "Mindora acil destek hattı mı?",
          a: "Hayır. Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa 112 ile iletişime geçmelisin.",
        },
      ],
    },
    {
      category: "Uzman başvurusu",
      items: [
        {
          q: "Psikologlar Mindora’ya nasıl katılabilir?",
          a: "Psikologlar, psikolog başvuru formunu doldurarak Mindora uzman ağına katılmak için ilk adımı atabilir.",
        },
        {
          q: "Uzman başvurusu ücretli mi?",
          a: "Hayır. Mindora uzman ağına başvuru yapmak ücretsizdir.",
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            SSS
          </p>

          <h1 className="mt-4 text-5xl font-black leading-tight md:text-6xl">
            Sık sorulan sorular
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
            Mindora’ya başlamadan önce aklına gelebilecek soruların kısa ve
            anlaşılır cevapları.
          </p>
        </div>

        <div className="mt-14 space-y-12">
          {faqs.map((group) => (
            <div key={group.category}>
              <h2 className="mb-5 text-2xl font-black">{group.category}</h2>

              <div className="space-y-4">
                {group.items.map((faq) => (
                  <div
                    key={faq.q}
                    className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5"
                  >
                    <h3 className="text-lg font-black">{faq.q}</h3>
                    <p className="mt-2 leading-7 text-neutral-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-black p-8 text-center text-white md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Aklındaki soru netleştiyse ilk adımı at.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-300">
            Kısa formu doldur, sana uygun psikolojik destek süreci için ön
            eşleşmeyi başlat.
          </p>

          <a
               href="/eslesme"
               className="mt-8 inline-block rounded-2xl bg-white px-9 py-4 font-bold text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
            >
              Ücretsiz ön eşleşme başlat
          </a>
        </div>
      </section>
    </main>
  );
}