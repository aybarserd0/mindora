import Header from '@/components/Header'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindora-delta.vercel.app'

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular | Mindora',
  description:
    'Mindora hakkında sık sorulan sorular: ücretsiz ön eşleşme, online psikolojik destek süreci, gizlilik, ücretlendirme, testler ve uzman başvurusu.',
  alternates: {
    canonical: '/sss',
    languages: {
      'tr-TR': '/sss',
    },
  },
  openGraph: {
    title: 'Sık Sorulan Sorular | Mindora',
    description:
      'Mindora’da ön eşleşme, online görüşme, gizlilik ve uzman başvurusu hakkında en çok merak edilen sorular.',
    url: '/sss',
    siteName: 'Mindora',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sık Sorulan Sorular | Mindora',
    description:
      'Mindora’da online psikolojik destek sürecine başlamadan önce bilmeniz gerekenler.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const FAQ_GROUPS = [
  {
    category: 'Başlangıç',
    description: 'Mindora’ya ilk kez gelen danışanların en çok merak ettiği konular.',
    items: [
      {
        q: 'Ön eşleşme ücretli mi?',
        a: 'Hayır. Mindora’da ön eşleşme süreci ücretsizdir. Formu doldurmak seans satın alma zorunluluğu oluşturmaz.',
      },
      {
        q: 'Formu doldurduktan sonra ne olacak?',
        a: 'Bilgilerin değerlendirilir. Destek konusu, tercihlerin ve uygun zamanına göre sana uygun başlangıç için dönüş yapılır.',
      },
      {
        q: 'Ne kadar sürede dönüş alırım?',
        a: 'Başvurular yoğunluğa göre değerlendirilir. Hedefimiz en kısa sürede uygun yönlendirme için iletişime geçmektir.',
      },
    ],
  },
  {
    category: 'Görüşme süreci',
    description: 'Online görüşme, uzman seçimi ve seans planlaması hakkında bilgiler.',
    items: [
      {
        q: 'Görüşmeler online mı?',
        a: 'Evet. Mindora başlangıçta online psikolojik destek sürecine odaklanır. Görüşme süreci uygun uzman ve planlama netleştikten sonra ilerler.',
      },
      {
        q: 'Hangi uzmanla görüşeceğime nasıl karar veriliyor?',
        a: 'Formdaki yanıtların; destek almak istediğin konu, uzman tercihin, uygun zamanın ve beklentin dikkate alınarak değerlendirilir.',
      },
      {
        q: 'Seans ücreti ne kadar?',
        a: 'Seans ücreti uzman ve planlama netleştikten sonra açıkça paylaşılır. Ön eşleşme aşaması ücretsizdir.',
      },
    ],
  },
  {
    category: 'Gizlilik ve güven',
    description: 'Paylaşılan bilgiler, güvenlik yaklaşımı ve önemli sınırlar.',
    items: [
      {
        q: 'Bilgilerim gizli mi?',
        a: 'Paylaştığın bilgiler yalnızca ön eşleşme ve yönlendirme süreci için kullanılır. Amaç, sana uygun destek sürecini daha doğru planlamaktır.',
      },
      {
        q: 'Mindora acil destek hattı mı?',
        a: 'Hayır. Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa 112 ile iletişime geçmeli ya da en yakın sağlık kuruluşuna başvurmalısın.',
      },
      {
        q: 'Test sonuçları tanı koyar mı?',
        a: 'Hayır. Mindora’daki testler yalnızca farkındalık amacı taşır. Tanı, değerlendirme ve tedavi süreci uzman görüşü gerektirir.',
      },
    ],
  },
  {
    category: 'Uzman başvurusu',
    description: 'Mindora uzman ağına katılmak isteyen psikologlar için bilgiler.',
    items: [
      {
        q: 'Psikologlar Mindora’ya nasıl katılabilir?',
        a: 'Psikologlar, uzman başvuru formunu doldurarak Mindora uzman ağına katılmak için ilk adımı atabilir.',
      },
      {
        q: 'Uzman başvurusu ücretli mi?',
        a: 'Hayır. Mindora uzman ağına başvuru yapmak ücretsizdir. Başvurular değerlendirme sürecinden sonra sonuçlandırılır.',
      },
    ],
  },
]

const TRUST_ITEMS = [
  'Ücretsiz ön eşleşme',
  'Seans zorunluluğu yok',
  'Gizlilik odaklı süreç',
  'Online destek akışı',
]

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getAllFaqItems() {
  return FAQ_GROUPS.flatMap((group) => group.items)
}

function JsonLd() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getAllFaqItems().map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Sık Sorulan Sorular',
        item: `${SITE_URL}/sss`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c'),
        }}
      />
    </>
  )
}

export default function SSS() {
  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />
      <JsonLd />

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Sık Sorulan Sorular
          </p>

          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Mindora’ya başlamadan önce aklına takılanlar.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Ön eşleşme, online görüşme, gizlilik, ücretlendirme ve uzman
            başvurusu hakkında en çok merak edilen soruları burada topladık.
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

        <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 md:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-white/75 px-5 py-4 text-center text-sm font-black text-neutral-700 shadow-sm ring-1 ring-black/5"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-6 lg:grid-cols-[0.32fr_0.68fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[2rem] bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
                Kategoriler
              </p>

              <div className="mt-5 space-y-2">
                {FAQ_GROUPS.map((group) => (
                  <a
                    key={group.category}
                    href={`#${slugify(group.category)}`}
                    className="block rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm font-black text-neutral-700 transition hover:bg-white"
                  >
                    {group.category}
                  </a>
                ))}
              </div>

              <div className="mt-6 rounded-3xl bg-black p-5 text-white">
                <p className="font-black">Sorun burada yok mu?</p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  Ön eşleşme formunda eklemek istediğin not alanından durumunu
                  kısaca paylaşabilirsin.
                </p>
                <a
                  href="/eslesme"
                  className="mt-4 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-neutral-200"
                >
                  Forma git
                </a>
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            {FAQ_GROUPS.map((group) => (
              <section
                key={group.category}
                id={slugify(group.category)}
                className="scroll-mt-28 rounded-[2rem] bg-white/75 p-6 shadow-sm ring-1 ring-black/5 md:p-8"
              >
                <div className="mb-6">
                  <h2 className="text-3xl font-black">{group.category}</h2>
                  <p className="mt-2 leading-7 text-neutral-600">
                    {group.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {group.items.map((faq) => (
                    <article
                      key={faq.q}
                      className="rounded-3xl bg-[#f7f2eb] p-6 ring-1 ring-black/5"
                    >
                      <h3 className="text-lg font-black">{faq.q}</h3>
                      <p className="mt-3 leading-7 text-neutral-600">{faq.a}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
              İlk adım
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Aklındaki soru netleştiyse uygun destek sürecini birlikte planlayalım.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-neutral-300">
              Kısa formu doldur, destek ihtiyacını paylaş ve sana uygun online
              psikolojik destek süreci için ücretsiz ön eşleşmeyi başlat.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/eslesme"
                className="rounded-2xl bg-white px-8 py-4 text-center font-black text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
              >
                Ücretsiz ön eşleşme başlat
              </a>

              <a
                href="/psikolojik-testler"
                className="rounded-2xl border border-white/15 bg-white/10 px-8 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Testleri incele
              </a>
            </div>

            <p className="mt-6 text-xs leading-6 text-neutral-400">
              Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
              verme riski varsa lütfen 112 ile iletişime geç ya da en yakın
              sağlık kuruluşuna başvur.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
