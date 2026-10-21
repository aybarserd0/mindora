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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 rounded-xl bg-pine-800 p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Uzmanlar için
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Mindora uzman ağına katıl.
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Online psikolojik destek vermek, daha fazla danışana ulaşmak ve
              dijital terapi sürecini daha düzenli yürütmek isteyen uzmanlar için
              Mindora uzman ağı oluşturuluyor.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={psychologistFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white px-8 py-4 text-center font-semibold text-slate-900 transition-all duration-200 ease-out hover:bg-slate-100"
              >
                Psikolog başvurusu yap
              </a>

              <a
                href="/uzmanlar"
                className="rounded-lg border border-white/20 px-8 py-4 text-center font-semibold text-white transition-all duration-200 ease-out hover:bg-white/10"
              >
                Uzman ağını incele
              </a>
            </div>
          </div>

          <div className="space-y-4">
            {benefits.map((item) => (
              <div key={item.title} className="rounded-lg bg-white/10 p-5">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-400">
            Başvuru süreci
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
            3 adımda Mindora uzman ağına başvur.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              style={{ animationDelay: `${index * 80}ms` }}
              className="animate-fade-in-up rounded-xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-200 ease-out hover:border-slate-300"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-pine-800 text-lg font-semibold text-white">
                {index + 1}
              </div>

              <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Kimler başvurabilir?
            </p>

            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Etik, güvenli ve düzenli online destek vermek isteyen uzmanlar.
            </h2>
          </div>

          <div className="space-y-4">
            {requirements.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200/80 bg-slate-50 p-5 font-medium text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Psikolog başvurusu hakkında sorular
          </h2>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:border-slate-300"
            >
              <h3 className="text-lg font-bold text-slate-900">{faq.q}</h3>
              <p className="mt-2 leading-7 text-slate-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm md:p-14">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Mindora uzman ağına başvur.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-500">
            Başvuru formunu doldur, uygun görülmesi halinde onboarding sürecini
            birlikte başlatalım.
          </p>

          <a
            href={psychologistFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-full bg-pine-800 px-9 py-4 font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900"
          >
            Başvuru formuna git
          </a>
        </div>
      </section>
    </main>
  );
}