import Header from '@/components/Header'
import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import FaqAccordion from './FaqAccordion'

const SITE_URL = getSiteUrl()

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
    ],
  },
  {
    category: 'Ücretlendirme',
    description: 'Seans ücreti, ödeme zamanı ve gizli ücret olup olmadığı hakkında.',
    items: [
      {
        q: 'Seans ücreti ne kadar?',
        a: 'Seans ücreti eşleştiğin uzmana göre değişir ve ödeme adımına geçmeden önce açıkça gösterilir. Ön eşleşme aşaması ücretsizdir.',
      },
      {
        q: 'Ödeme dışında ek/gizli bir ücret var mı?',
        a: 'Hayır. Gösterilen seans ücreti dışında ek bir ücret talep edilmez. Ödeme yalnızca sen onayladıktan sonra, açıkça gösterilen tutar üzerinden alınır.',
      },
      {
        q: 'Randevumu değiştirebilir miyim?',
        a: 'Randevu saatini uzmanın uygunluğu dahilinde ihtiyacına göre planlayabilirsin. Değişiklik talepleri için Mindora ekibiyle iletişime geçebilirsin.',
      },
    ],
  },
  {
    category: 'Gizlilik ve veri güvenliği',
    description: 'Paylaşılan bilgiler, teknik güvenlik yaklaşımı ve önemli sınırlar.',
    items: [
      {
        q: 'Bilgilerim gizli mi?',
        a: 'Paylaştığın bilgiler yalnızca ön eşleşme ve yönlendirme süreci için kullanılır. Amaç, sana uygun destek sürecini daha doğru planlamaktır.',
      },
      {
        q: 'Seans içi mesajlarımı kim görebilir?',
        a: 'Bir görüşmeye yalnızca ilgili danışan ve uzman; destek/güvenlik amacıyla yetkili Mindora ekibi erişebilir. Tüm veri trafiği şifreli bağlantı (HTTPS/TLS) üzerinden iletilir.',
      },
      {
        q: 'Verilerim KVKK kapsamında nasıl işleniyor?',
        a: 'Bilgilerin, toplama amacıyla sınırlı şekilde ve yalnızca eşleşme/yönlendirme süreci için işlenir; üçüncü taraflarla pazarlama amacıyla paylaşılmaz.',
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
    <main className="min-h-screen bg-white text-slate-900">
      <Header />
      <JsonLd />

      <section className="border-b border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center md:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Sık Sorulan Sorular
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Mindora’ya başlamadan önce aklına takılanlar.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-500">
            Ön eşleşme, online görüşme, gizlilik, ücretlendirme ve uzman
            başvurusu hakkında en çok merak edilen soruları burada topladık.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-lg bg-slate-900 px-8 py-4 text-center font-semibold text-white transition hover:bg-slate-800"
            >
              Ücretsiz ön eşleşme başlat
            </a>

            <a
              href="/uzmanlar"
              className="rounded-lg border border-slate-200 bg-white px-8 py-4 text-center font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Uzmanları incele
            </a>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2 md:grid-cols-4">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200/80 bg-white px-5 py-4 text-center text-sm font-medium text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <FaqAccordion groups={FAQ_GROUPS} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="rounded-xl bg-slate-900 p-8 text-white md:p-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                İlk adım
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                Aklındaki soru netleştiyse uygun destek sürecini birlikte planlayalım.
              </h2>
            </div>

            <div>
              <p className="text-lg leading-8 text-slate-300">
                Kısa formu doldur, destek ihtiyacını paylaş ve sana uygun online
                psikolojik destek süreci için ücretsiz ön eşleşmeyi başlat.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/eslesme"
                  className="rounded-lg bg-white px-8 py-4 text-center font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Ücretsiz ön eşleşme başlat
                </a>

                <a
                  href="/psikolojik-testler"
                  className="rounded-lg border border-white/15 px-8 py-4 text-center font-semibold text-white transition hover:bg-white/10"
                >
                  Testleri incele
                </a>
              </div>

              <p className="mt-6 text-xs leading-6 text-slate-400">
                Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
                verme riski varsa lütfen 112 ile iletişime geç ya da en yakın
                sağlık kuruluşuna başvur.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
