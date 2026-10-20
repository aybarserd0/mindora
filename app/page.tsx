import Header from '@/components/Header';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Homepage stays statically served for speed, but the approved-expert count
// is real (not hardcoded) — this just caps how stale it can get between
// deploys.
export const revalidate = 3600;

const MIN_EXPERT_COUNT_TO_DISPLAY = 3;

async function getApprovedExpertCount() {
  try {
    const supabase = getSupabaseAdmin();

    const { count, error } = await supabase
      .from('experts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    if (error || typeof count !== 'number') return null;

    return count;
  } catch {
    return null;
  }
}

export default async function Home() {
  const approvedExpertCount = await getApprovedExpertCount();

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

  const heroTrustBadges = ["KVKK Uyumlu", "Doğrulanmış Uzmanlar", "Ücretsiz Ön Eşleşme"];

  const previewTags = ["Kaygı ve stres", "Özgüven", "İlişki problemleri"];

  const expertCountLabel =
    approvedExpertCount !== null && approvedExpertCount >= MIN_EXPERT_COUNT_TO_DISPLAY
      ? `${approvedExpertCount}+ onaylı uzman`
      : "Titizlikle incelenen uzman kadrosu";

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header />

      <section className="relative overflow-hidden border-b border-slate-200/80 bg-slate-50">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,black,transparent)]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {expertCountLabel}
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 md:text-6xl">
              Psikolojik desteğe doğru uzmanla, güvenli şekilde başla.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
              Mindora; uzman eşleşmesi, online randevu, güvenli ödeme, mesajlaşma
              ve video görüşme sürecini tek platformda birleştirir.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/eslesme"
                className="inline-block rounded-lg bg-slate-900 px-8 py-4 text-center text-base font-semibold text-white transition hover:bg-slate-800"
              >
                Hemen ücretsiz eşleş
              </a>

              <a
                href="/uzmanlar"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-8 py-4 text-center text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Uzmanları incele
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
              {heroTrustBadges.map((badge) => (
                <span key={badge} className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="text-slate-400">✓</span>
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div
              aria-hidden="true"
              className="absolute inset-x-6 -bottom-4 top-6 -z-10 rotate-2 rounded-2xl border border-slate-200 bg-white"
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.06]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Ürün önizleme
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  UP
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">Uzman Psikolog</p>
                  <p className="text-xs text-slate-500">Mindora tarafından onaylı</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  Doğrulanmış
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {previewTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-slate-500">Uygun zaman</span>
                  <span className="font-semibold text-slate-900">Hafta sonu</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-slate-500">Görüşme türü</span>
                  <span className="font-semibold text-slate-900">Online</span>
                </div>
              </div>

              <a
                href="/eslesme"
                className="mt-6 block rounded-lg bg-slate-900 px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Bu profille eşleş
              </a>

              <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
                Örnek arayüz — gerçek eşleşmen ihtiyacına göre yapılır.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Nasıl çalışır?
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
            3 adımda online destek sürecine başla.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-sm"
            >
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Neden Mindora?
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
              Destek almaya başlamayı kolaylaştırır.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {reasons.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Ücretlendirme
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Şeffaf ücretlendirme, gizli hiçbir ek ücret yok.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-500">
              Seans ücreti, eşleştiğin uzmana göre değişir ve ödeme adımına
              geçmeden önce açıkça gösterilir. Ödeme yalnızca sen onayladıktan
              sonra alınır.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { title: "Ön eşleşme her zaman ücretsiz", text: "Form doldurmak ve uzman önerisi almak seans satın alma zorunluluğu oluşturmaz." },
              { title: "Ücret ödemeden önce görünür", text: "Uzmana özel seans ücreti, ödeme ekranına geçmeden önce net şekilde gösterilir." },
              { title: "Esnek planlama", text: "Randevu saatini ihtiyacına göre, uzmanın uygunluğu dahilinde sen belirlersin." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-slate-200/80 px-5 py-4"
              >
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Güvenlik ve gizlilik
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
              Bilgilerin korunarak, kontrollü şekilde işlenir.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Şifreli bağlantı",
                text: "Platformdaki tüm veri trafiği (mesajlaşma dahil) şifreli bağlantı (HTTPS/TLS) üzerinden iletilir.",
              },
              {
                title: "Sınırlı erişim",
                text: "Bir görüşmeye yalnızca ilgili danışan ve uzman; destek/güvenlik amacıyla yetkili Mindora ekibi erişebilir.",
              },
              {
                title: "KVKK odaklı işleme",
                text: "Paylaştığın bilgiler yalnızca eşleşme ve yönlendirme sürecinde, amacıyla sınırlı şekilde değerlendirilir.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-xl bg-slate-900 p-8 text-white md:p-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Destek alanları
              </p>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                Hangi konuda destek alacağını birlikte netleştirelim.
              </h2>
            </div>

            <div>
              <p className="text-lg leading-8 text-slate-300">
                Bazen problemin adını koymak bile zor olabilir. Mindora,
                ihtiyacını anlamaya ve seni uygun destek sürecine yönlendirmeye
                yardımcı olur.
              </p>

              <a
                href="/eslesme"
                className="mt-6 inline-block rounded-lg bg-white px-8 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Destek almaya başla
              </a>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {areas.map((area) => (
              <div
                key={area}
                className="rounded-lg border border-white/10 px-5 py-4 text-sm font-medium text-slate-200"
              >
                {area}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Platform deneyimi
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
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
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Uzmanlar için
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Mindora uzman ağına katıl.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-slate-500">
              Online danışan yönlendirmesi almak, uzmanlık alanına uygun
              kişilerle buluşmak ve dijital danışmanlık sürecini daha düzenli
              yürütmek isteyen uzmanlar için başvuru süreci açıktır.
            </p>

            <a
              href="/uzman-basvuru"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-8 py-4 font-semibold text-white transition hover:bg-slate-800"
            >
              Uzman olarak başvur
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
              Sık sorulan sorular
            </h2>
            <p className="mt-4 text-slate-500">
              Başlamadan önce bilmen gereken kısa cevaplar.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-900">{faq.q}</h3>
                <p className="mt-2 leading-7 text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a href="/sss" className="font-semibold text-slate-900 underline underline-offset-4">
              Tüm sık sorulan soruları görüntüle
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm md:p-14">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Kendin için ilk adımı bugün at.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-500">
            Kısa bilgilerini paylaş, sana uygun psikolojik destek sürecini
            birlikte planlayalım.
          </p>

          <div className="mt-8">
            <a
              href="/eslesme"
              className="inline-block rounded-lg bg-slate-900 px-9 py-4 font-semibold text-white transition hover:bg-slate-800"
            >
              Ücretsiz eşleş
            </a>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-xs leading-6 text-slate-400">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
            verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112
            ile iletişime geç.
          </p>
        </div>
      </section>

    </main>
  );
}
