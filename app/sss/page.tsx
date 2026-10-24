import Header from '@/components/Header'
import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import Link from 'next/link'
import FaqAccordion from './FaqAccordion'
import PageHero from '@/components/marketing/PageHero'
import CtaBand from '@/components/marketing/CtaBand'
import { ThreadLine } from '@/components/marketing/Mocks'

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
    category: 'Uzmanlar ve süpervizyon',
    description: 'Mindora’daki psikologların nasıl seçildiği ve nasıl desteklendiği.',
    items: [
      {
        q: 'Uzmanlar nasıl kontrol ediliyor?',
        a: 'Her psikoloğun diploması ve unvanı, danışan kabul etmeden önce Mindora ekibi tarafından tek tek kontrol edilir.',
      },
      {
        q: '"Süpervizyonlu Uzman" rozeti ne anlama geliyor?',
        a: 'Son üç ayda kıdemli bir meslektaşıyla düzenli süpervizyon görüşmesi yapmış psikologların profilinde görünür. Süpervizyon, terapistin zor vakalarda deneyimli birinden destek almasıdır.',
      },
      {
        q: 'Süpervizyonda benim bilgilerim paylaşılıyor mu?',
        a: 'Hayır. Vaka; adın, iletişim bilgilerin, şehrin, işyerin gibi seni tanıtan hiçbir bilgi olmadan anlatılır. Mindora bu tür bilgileri otomatik olarak işaretler ve süpervizör yalnızca anonim vaka kartını görebilir.',
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
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />
      <JsonLd />

      <PageHero
        title="Başlamadan önce aklına takılanlar."
        lead="Ön eşleşme, görüşmeler, ücretler, gizlilik ve uzmanlarımız hakkında en çok sorulan soruları topladık. Cevabını bulamazsan bize yazabilirsin."
        visual={
          <>
            <ThreadLine className="absolute inset-0 h-full w-full" d="M30 340 C 140 200, 260 380, 360 220 S 520 60, 560 90" length={800} />
            <div className="relative z-10 w-full max-w-sm space-y-3">
              {['Ön eşleşme ücretli mi?', 'Görüşmeler kaydediliyor mu?', 'Uzmanlar nasıl kontrol ediliyor?'].map((q, i) => (
                <div
                  key={q}
                  className="animate-drift rounded-2xl bg-white px-5 py-4 shadow-lg ring-1 ring-slate-200/70"
                  style={{ ['--drift-delay' as string]: `${i * 0.8}s`, ['--tilt' as string]: `${i % 2 ? 1.5 : -1.5}deg`, marginLeft: `${i * 24}px` }}
                >
                  <p className="font-display text-base font-semibold text-slate-900">{q}</p>
                  <p className="mt-1 text-sm text-slate-500">{['Hayır, her zaman ücretsiz.', 'Hayır, görüntülü seanslar kaydedilmez.', 'Diploma ve unvan tek tek kontrol edilir.'][i]}</p>
                </div>
              ))}
            </div>
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/eslesme" className="inline-flex justify-center rounded-full bg-pine-800 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-pine-900">
            Ücretsiz eşleşmeyi başlat
          </Link>
          <a href="mailto:mindora.live@gmail.com" className="inline-flex justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-800 transition-colors hover:border-slate-400">
            Bize yaz
          </a>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
        <FaqAccordion groups={FAQ_GROUPS} />
      </section>

      <CtaBand
        title="Sorun netleştiyse, ilk adım üç dakika."
        text="Kısa formu doldur, sana uygun psikoloğu önerelim."
        primary={{ label: 'Ücretsiz eşleşmeyi başlat', href: '/eslesme' }}
        secondary={{ label: 'Testleri incele', href: '/psikolojik-testler' }}
      />
    </main>
  )
}
