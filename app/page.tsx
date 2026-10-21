import Link from 'next/link'
import Header from '@/components/Header'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// Ana sayfa statik sunulur; onaylı uzman sayısı gerçek veridir ve en fazla
// bir saat bayat kalabilir.
export const revalidate = 3600

const MIN_EXPERT_COUNT_TO_DISPLAY = 3

async function getApprovedExpertCount() {
  try {
    const supabase = getSupabaseAdmin()

    const { count, error } = await supabase
      .from('experts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')

    if (error || typeof count !== 'number') return null

    return count
  } catch {
    return null
  }
}

// Değerler /eslesme formundaki seçeneklerle birebir aynı olmalı
const topics = [
  { label: 'Kaygı ve stres', value: 'Kaygı / stres' },
  { label: 'İlişki ve aile', value: 'İlişki / aile' },
  { label: 'Özgüven', value: 'Özgüven' },
  { label: 'Motivasyon', value: 'Motivasyon' },
  { label: 'Depresif hisler', value: 'Depresif hisler' },
  { label: 'Tükenmişlik', value: 'Tükenmişlik' },
  { label: 'Henüz adını koyamadım', value: 'Diğer' },
]

const steps = [
  {
    title: 'Birkaç soruyu yanıtla',
    text: 'Neyle uğraştığını, ne zaman müsait olduğunu ve nasıl bir uzman istediğini anlat. Yaklaşık üç dakika sürer.',
  },
  {
    title: 'Sana uygun uzmanı öneriyoruz',
    text: 'Yanıtlarına göre alanında çalışan, belgeleri doğrulanmış bir psikolog öneriyoruz. Kabul etmek zorunda değilsin.',
  },
  {
    title: 'Online görüşmeye başla',
    text: 'Ücreti görerek ödemeyi yap; mesajlaşma ve görüntülü görüşme Mindora içinde ilerlesin.',
  },
]

const reasons = [
  {
    title: 'Kimi seçeceğini bilmen gerekmiyor',
    text: 'Yüzlerce profil arasında kaybolmak yerine ihtiyacını anlatıyorsun, eşleşmeyi biz öneriyoruz.',
  },
  {
    title: 'Belgeleri incelenmiş psikologlar',
    text: 'Her uzmanın diploması ve unvanı platforma alınmadan önce tek tek kontrol edilir.',
  },
  {
    title: 'Ücret baştan belli',
    text: 'Seans ücreti ödeme adımından önce açıkça görünür. Ön eşleşme her zaman ücretsizdir.',
  },
  {
    title: 'Her şey tek yerde',
    text: 'Randevu, ödeme, mesajlaşma ve görüntülü görüşme için başka bir uygulamaya geçmen gerekmez.',
  },
]

const privacyFacts = [
  {
    title: 'Görüşmeler kaydedilmez',
    text: 'Görüntülü seanslar Mindora tarafından kaydedilmez, yalnızca iletim için işlenir.',
  },
  {
    title: 'Erişim sınırlı',
    text: 'Bir görüşmeyi yalnızca sen ve uzmanın görebilir. Ekibimiz yalnızca şikayet veya güvenlik durumunda erişir.',
  },
  {
    title: 'Şifreli bağlantı',
    text: 'Mesajlaşma dahil tüm trafik şifreli bağlantı (TLS) üzerinden iletilir.',
  },
]

const faqs = [
  {
    q: 'Ön eşleşme ücretli mi?',
    a: 'Hayır. Formu doldurmak ve uzman önerisi almak ücretsizdir, seans satın alma zorunluluğu oluşturmaz.',
  },
  {
    q: 'Görüşmeler nasıl yapılıyor?',
    a: 'Tamamen online. Mindora içindeki görüntülü görüşme odasına tarayıcından katılırsın, ayrı bir uygulama gerekmez.',
  },
  {
    q: 'Önerilen uzman bana uymazsa ne olur?',
    a: 'Öneriyi kabul etmek zorunda değilsin. İlk görüşmeden sonra uyum olmadığını düşünürsen yeni bir öneri isteyebilirsin.',
  },
  {
    q: 'Mindora acil durumlarda yardımcı olur mu?',
    a: 'Hayır, Mindora bir acil durum hizmeti değildir. Kendine veya başkasına zarar verme riski varsa 112’yi ara ya da en yakın acil servise başvur.',
  },
]

export default async function Home() {
  const approvedExpertCount = await getApprovedExpertCount()
  const showExpertCount =
    approvedExpertCount !== null && approvedExpertCount >= MIN_EXPERT_COUNT_TO_DISPLAY

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      {/* Hero: ürünün ilk adımı doğrudan burada başlar */}
      <section className="border-b border-slate-200">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16 lg:pb-28 lg:pt-24">
          <div>
            <h1 className="max-w-[13ch] text-[2.75rem] font-semibold leading-[1.02] text-slate-900 sm:text-6xl lg:text-[5.25rem]">
              Kiminle konuşacağını bilmeden de başlayabilirsin.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              Neyle uğraştığını anlat, sana uygun psikoloğu biz önerelim.
              Görüşmeler online, ücret baştan belli.
            </p>
            {showExpertCount ? (
              <p className="mt-6 text-sm text-slate-500">
                Şu anda {approvedExpertCount} psikolog, belgeleri doğrulanmış olarak hizmet veriyor.
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">
              Şu sıralar seni en çok ne yoruyor?
            </h2>
            <p className="mt-2 text-[0.95rem] text-slate-500">
              Birini seç, formun geri kalanını birlikte dolduralım.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2.5">
              {topics.map((topic, index) => (
                <li
                  key={topic.value}
                  className="animate-rise-in"
                  style={{ animationDelay: `${120 + index * 55}ms` }}
                >
                  <Link
                    href={`/eslesme?konu=${encodeURIComponent(topic.value)}`}
                    className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-4 py-2.5 text-[0.95rem] font-medium text-slate-800 transition-colors hover:border-pine-600 hover:bg-pine-50 hover:text-pine-900"
                  >
                    {topic.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-500">
                Ücretsiz, yaklaşık 3 dakika.
                <br className="hidden sm:block" /> Seans almak zorunda değilsin.
              </p>
              <Link
                href="/eslesme"
                className="inline-flex justify-center rounded-full bg-pine-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pine-900"
              >
                Formu aç
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Nasıl işler: gerçek bir sıra olduğu için numaralı */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
        <h2 className="max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
          Üç adımda ilk görüşmene
        </h2>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-slate-900 pt-6">
              <span className="font-display text-sm font-semibold text-pine-700">
                {index + 1}. adım
              </span>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-3 max-w-sm leading-7 text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Neden Mindora */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Destek aramanın en zor kısmı, doğru kişiyi bulmak.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-slate-600">
              Mindora bu kısmı senin için kolaylaştırmak için var.
            </p>
          </div>

          <dl className="divide-y divide-slate-200 border-y border-slate-200">
            {reasons.map((reason) => (
              <div key={reason.title} className="grid gap-2 py-7 sm:grid-cols-[0.9fr_1.1fr] sm:gap-8">
                <dt className="font-display text-lg font-semibold text-slate-900">{reason.title}</dt>
                <dd className="leading-7 text-slate-600">{reason.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Gizlilik */}
      <section className="bg-pine-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            Anlattıkların seninle uzmanın arasında kalır.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {privacyFacts.map((fact) => (
              <div key={fact.title}>
                <h3 className="text-lg font-semibold text-white">{fact.title}</h3>
                <p className="mt-3 leading-7 text-pine-200">{fact.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Psikologlar için */}
      <section className="bg-lilac-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Psikolog musun? Danışanını da süpervizörünü de burada bul.
            </h2>
            <p className="mt-5 max-w-lg leading-7 text-slate-600">
              Mindora&apos;da danışan alabilir, kıdemli meslektaşlarından online
              süpervizyon alabilir ve süpervizyon saatlerini tek bir yerde kayıt
              altında tutabilirsin.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link
              href="/uzman-basvuru"
              className="inline-flex justify-center rounded-full bg-lilac-700 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-lilac-800"
            >
              Uzman olarak başvur
            </Link>
            <Link
              href="/supervizyon"
              className="inline-flex justify-center rounded-full border border-lilac-300 bg-white px-6 py-3.5 font-semibold text-lilac-800 transition-colors hover:border-lilac-500"
            >
              Süpervizyonu incele
            </Link>
          </div>
        </div>
      </section>

      {/* SSS */}
      <section className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
        <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Sık sorulanlar</h2>
        <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-semibold text-slate-900">
                {faq.q}
                <span
                  aria-hidden="true"
                  className="text-2xl font-normal leading-none text-slate-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
        <Link
          href="/sss"
          className="mt-8 inline-block font-semibold text-pine-800 underline decoration-pine-300 underline-offset-4 hover:decoration-pine-700"
        >
          Tüm soruları gör
        </Link>
      </section>

      {/* Kapanış */}
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-7xl rounded-3xl bg-pine-800 px-6 py-16 text-center text-white sm:px-12 lg:py-20">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">
            İlk adım üç dakika.
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-pine-100">
            Ne hissettiğini tam anlatamasan da olur. Formu doldur, gerisini birlikte netleştirelim.
          </p>
          <Link
            href="/eslesme"
            className="mt-9 inline-flex rounded-full bg-white px-7 py-3.5 font-semibold text-pine-900 transition-colors hover:bg-pine-50"
          >
            Ücretsiz eşleşmeyi başlat
          </Link>
        </div>
      </section>
    </main>
  )
}
