import Header from "@/components/Header";

export default function PsikologBasvuru() {
  const psychologistFormUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSdsXpqdlNwcKmSc8a08_cO1Q2L_Qr0Zrm7O_h0BnqPFUJMfsA/viewform";

  const benefits = [
    {
      title: "Uygun danışan yönlendirmesi",
      text: "Uzmanlık alanına, çalışma yaklaşımına ve uygunluk durumuna göre daha doğru danışanlarla buluşma imkanı.",
    },
    {
      title: "Esnek online çalışma",
      text: "Online görüşme yapısına uygun şekilde kendi zaman planına göre çalışma fırsatı.",
    },
    {
      title: "Daha düzenli süreç",
      text: "Başvuru, ön görüşme, yönlendirme ve iletişim süreçlerinin daha anlaşılır ilerlemesi.",
    },
    {
      title: "Etik ve güvenli yaklaşım",
      text: "Danışan gizliliğini, uzman yeterliliğini ve güvenli çalışma prensiplerini merkeze alan yapı.",
    },
  ];

  const steps = [
    {
      title: "Başvuru formunu doldur",
      text: "Eğitim, deneyim, uzmanlık alanları ve çalışma tercihlerini bizimle paylaş.",
    },
    {
      title: "Başvurun değerlendirilsin",
      text: "Mindora ekibi başvurunu inceler ve uygun görülmesi halinde kısa bir tanışma süreci planlar.",
    },
    {
      title: "Danışanlarla buluş",
      text: "Profilin hazırlanır ve uygun danışan yönlendirme sürecine dahil olursun.",
    },
  ];

  const requirements = [
    "Psikoloji / PDR lisans veya ilgili uzmanlık geçmişi",
    "Online görüşme yürütmeye uygun çalışma düzeni",
    "Etik ilkelere ve danışan gizliliğine bağlılık",
    "Düzenli iletişim ve randevu takibi yapabilme",
  ];

  const faqs = [
    {
      q: "Başvuru yapmak ücretli mi?",
      a: "Hayır. Mindora uzman ağına başvuru yapmak ücretsizdir.",
    },
    {
      q: "Başvurudan sonra ne olur?",
      a: "Bilgilerin değerlendirilir. Uygun görülmesi halinde seninle iletişime geçilerek tanışma ve onboarding süreci planlanır.",
    },
    {
      q: "Danışan yönlendirmesi garanti mi?",
      a: "Başvuru kabulü danışan garantisi anlamına gelmez. Yönlendirmeler danışan ihtiyacı ve uzmanlık alanı uyumuna göre yapılır.",
    },
    {
      q: "Görüşmeler online mı olacak?",
      a: "Mindora başlangıçta online psikolojik destek sürecine odaklanır.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400">
              Uzmanlar için
            </p>

            <h1 className="mt-4 text-5xl font-black leading-tight md:text-6xl">
              Mindora uzman ağına katıl.
            </h1>

            <p className="mt-5 text-lg leading-8 text-neutral-300">
              Online psikolojik destek vermek, daha fazla danışana ulaşmak ve
              dijital terapi sürecini daha düzenli yürütmek isteyen uzmanlar için
              Mindora uzman ağı oluşturuluyor.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={psychologistFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-white px-8 py-4 text-center font-bold text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
              >
                Psikolog başvurusu yap
              </a>

              <a
                href="/uzmanlar"
                className="rounded-2xl border border-white/20 px-8 py-4 text-center font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Uzman ağını incele
              </a>
            </div>
          </div>

          <div className="space-y-4">
            {benefits.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white/10 p-5">
                <h3 className="font-black text-white">{item.title}</h3>
                <p className="mt-2 leading-7 text-neutral-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Başvuru süreci
          </p>

          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            3 adımda Mindora uzman ağına başvur.
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
              Kimler başvurabilir?
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Etik, güvenli ve düzenli online destek vermek isteyen uzmanlar.
            </h2>
          </div>

          <div className="space-y-4">
            {requirements.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-[#f6f1ea] p-5 font-bold text-neutral-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-black md:text-5xl">
            Psikolog başvurusu hakkında sorular
          </h2>
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
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Mindora uzman ağına başvur.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Başvuru formunu doldur, uygun görülmesi halinde onboarding sürecini
            birlikte başlatalım.
          </p>

          <a
            href={psychologistFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-2xl bg-black px-9 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Başvuru formuna git
          </a>
        </div>
      </section>
    </main>
  );
}