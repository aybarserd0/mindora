import Header from '@/components/Header'
import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import Link from 'next/link'
import FaqAccordion from './FaqAccordion'
import PageHero from '@/components/marketing/PageHero'
import { PHOTOS } from '@/components/marketing/Photo'
import CtaBand from '@/components/marketing/CtaBand'
import { ThreadLine } from '@/components/marketing/Mocks'

const SITE_URL = getSiteUrl()

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular | Mindora',
  description:
    'Mindora hakkında sık sorulan sorular: ücretsiz ön eşleşme, online psikolog, diyetisyen ve kişisel antrenör görüşmeleri, gizlilik, ücretlendirme ve uzman başvurusu.',
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
      'Mindora’da psikolog, diyetisyen ya da kişisel antrenörle başlamadan önce bilmen gerekenler.',
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
        q: 'Mindora’da hangi uzmanlar var?',
        a: 'Psikolog, diyetisyen ve kişisel antrenör. Hepsi belgeleri kontrol edildikten sonra danışan kabul eder. İstersen birden fazla alan için ayrı ayrı başvurabilirsin.',
      },
      {
        q: 'Ön eşleşme ücretli mi?',
        a: 'Hayır. Ön eşleşme her üç alanda da ücretsizdir. Formu doldurmak görüşme satın alma zorunluluğu oluşturmaz.',
      },
      {
        q: 'Formu doldurduktan sonra ne olacak?',
        a: 'Bilgilerin değerlendirilir. Seçtiğin alana, hedefine, tercihlerine ve uygun zamanına göre sana uygun uzmanı önerip dönüş yaparız.',
      },
      {
        q: 'Ne kadar sürede dönüş alırım?',
        a: 'Başvurular yoğunluğa göre değerlendirilir. Hedefimiz en kısa sürede uygun yönlendirme için iletişime geçmektir.',
      },
    ],
  },
  {
    category: 'Görüşme süreci',
    description: 'Online görüşme, uzman seçimi ve planlama hakkında bilgiler.',
    items: [
      {
        q: 'Görüşmeler online mı?',
        a: 'Evet. Psikolog, diyetisyen ve antrenör görüşmeleri Mindora içindeki görüntülü görüşme odasında yapılır; ayrı bir uygulama gerekmez.',
      },
      {
        q: 'Hangi uzmanla görüşeceğime nasıl karar veriliyor?',
        a: 'Formdaki yanıtların; seçtiğin alan, hedefin ya da destek konusu, uzman tercihin ve uygun zamanın dikkate alınarak değerlendirilir. Öneriyi kabul etmek zorunda değilsin.',
      },
      {
        q: 'Planlar ve programlar nasıl paylaşılıyor?',
        a: 'Beslenme planları, antrenman programları ya da uzmanının paylaşmak istediği her şey Mindora mesajlaşması içinde dosya olarak paylaşılır.',
      },
    ],
  },
  {
    category: 'Diyetisyen ve kişisel antrenör',
    description: 'Beslenme ve antrenman desteği almak isteyenler için.',
    items: [
      {
        q: 'Diyetisyen görüşmesi nasıl ilerler?',
        a: 'İlk görüşmede diyetisyenin alışkanlıklarını, hedefini ve günlük düzenini dinler. Beslenme planın Mindora içinde paylaşılır; kontrol görüşmeleriyle birlikte güncellenir.',
      },
      {
        q: 'Antrenörle salonda da çalışabilir miyim?',
        a: 'Evet. Antrenörün evde görüntülü görüşmeyle canlı antrenman yaptırabilir ya da salonda uygulayacağın bir program hazırlayıp takibini online yapabilir.',
      },
      {
        q: 'Bir sağlık durumum ya da sakatlığım var.',
        a: 'Formda bunu belirtmen yeterli; ayrıntıları ilk görüşmede uzmanınla konuşursun. Diyetisyen ve antrenör görüşmeleri hekim muayenesinin yerine geçmez; emin değilsen başlamadan önce doktoruna danış.',
      },
      {
        q: 'Antrenör diyet listesi verir mi?',
        a: 'Hayır. Beslenme planı diyetisyenlerin alanıdır. Antrenmanını beslenmeyle desteklemek istersen bir diyetisyenle de eşleşebilirsin.',
      },
    ],
  },
  {
    category: 'Ücretlendirme',
    description: 'Görüşme ücreti, ödeme zamanı ve iade hakkında.',
    items: [
      {
        q: 'Görüşme ücreti ne kadar?',
        a: 'Ücret eşleştiğin uzmana göre değişir ve ödeme adımına geçmeden önce açıkça gösterilir. Ön eşleşme aşaması ücretsizdir.',
      },
      {
        q: 'Ödeme dışında ek/gizli bir ücret var mı?',
        a: 'Hayır. Gösterilen ücret dışında ek bir ücret talep edilmez. Abonelik yoktur; ödeme yalnızca sen onayladıktan sonra, açıkça gösterilen tutar üzerinden alınır.',
      },
      {
        q: 'Randevumu iptal edersem ücretim iade edilir mi?',
        a: 'Görüşmeye 24 saatten fazla varken iptal edersen ücretin tamamı iade edilir. Randevu saatini uzmanının uygunluğuna göre yeniden planlayabilirsin.',
      },
    ],
  },
  {
    category: 'Gizlilik ve veri güvenliği',
    description: 'Paylaşılan bilgiler, teknik güvenlik yaklaşımı ve önemli sınırlar.',
    items: [
      {
        q: 'Bilgilerim gizli mi?',
        a: 'Paylaştığın bilgiler yalnızca ön eşleşme ve görüşme süreci için kullanılır. Bir uzmana anlattıkların, senin onayın olmadan başka bir uzmanla paylaşılmaz.',
      },
      {
        q: 'Mesajlarımı kim görebilir?',
        a: 'Bir görüşmeye yalnızca ilgili danışan ve uzman; destek/güvenlik amacıyla yetkili Mindora ekibi erişebilir. Tüm veri trafiği şifreli bağlantı (HTTPS/TLS) üzerinden iletilir.',
      },
      {
        q: 'Verilerim KVKK kapsamında nasıl işleniyor?',
        a: 'Bilgilerin, toplama amacıyla sınırlı şekilde ve yalnızca eşleşme/görüşme süreci için işlenir; üçüncü taraflarla pazarlama amacıyla paylaşılmaz.',
      },
      {
        q: 'Mindora acil destek hattı mı?',
        a: 'Hayır. Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski ya da acil bir sağlık sorunu varsa 112 ile iletişime geçmeli veya en yakın sağlık kuruluşuna başvurmalısın.',
      },
      {
        q: 'Test sonuçları tanı koyar mı?',
        a: 'Hayır. Mindora’daki testler yalnızca farkındalık amacı taşır. Tanı, değerlendirme ve tedavi süreci uzman görüşü gerektirir.',
      },
    ],
  },
  {
    category: 'Uzmanlar ve süpervizyon',
    description: 'Mindora’daki uzmanların nasıl seçildiği ve nasıl desteklendiği.',
    items: [
      {
        q: 'Uzmanlar nasıl kontrol ediliyor?',
        a: 'Psikologların ve diyetisyenlerin diploması e-Devlet barkodlu belgeyle; antrenörlerin spor bilimleri diploması, federasyon antrenör belgesi ya da MYK belgesi danışan kabul etmeden önce tek tek kontrol edilir.',
      },
      {
        q: '"Süpervizyonlu Uzman" rozeti ne anlama geliyor?',
        a: 'Son üç ayda kıdemli bir meslektaşıyla düzenli süpervizyon görüşmesi yapmış psikologların profilinde görünür. Süpervizyon, psikoloğun zor vakalarda deneyimli birinden destek almasıdır.',
      },
      {
        q: 'Süpervizyonda benim bilgilerim paylaşılıyor mu?',
        a: 'Hayır. Vaka; adın, iletişim bilgilerin, şehrin, işyerin gibi seni tanıtan hiçbir bilgi olmadan anlatılır. Mindora bu tür bilgileri otomatik olarak işaretler ve süpervizör yalnızca anonim vaka kartını görebilir.',
      },
    ],
  },
  {
    category: 'Uzman başvurusu',
    description: 'Mindora’ya katılmak isteyen psikolog, diyetisyen ve antrenörler için.',
    items: [
      {
        q: 'Mindora’ya kimler uzman olarak katılabilir?',
        a: 'Psikologlar, diyetisyenler ve kişisel antrenörler. Uzman başvuru formunda mesleğini seçip bilgilerini paylaşarak ilk adımı atabilirsin.',
      },
      {
        q: 'Uzman başvurusu ücretli mi?',
        a: 'Hayır. Mindora uzman ağına başvuru yapmak ücretsizdir. Başvurular belge kontrolünden sonra sonuçlandırılır.',
      },
    ],
  },
]

const TRUST_ITEMS = [
  'Ücretsiz ön eşleşme',
  'Görüşme zorunluluğu yok',
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
        photo={PHOTOS.leaves}
        title="Başlamadan önce aklına takılanlar."
        lead="Psikolog, diyetisyen ve kişisel antrenör görüşmeleri; ön eşleşme, ücretler ve gizlilik hakkında en çok sorulan soruları topladık. Cevabını bulamazsan bize yazabilirsin."
        visual={
          <>
            <ThreadLine className="absolute inset-0 h-full w-full" d="M30 340 C 140 200, 260 380, 360 220 S 520 60, 560 90" length={800} />
            <div className="relative z-10 w-full max-w-sm space-y-3">
              {['Hangi uzmanlar var?', 'Görüşmeler kaydediliyor mu?', 'Uzmanlar nasıl kontrol ediliyor?'].map((q, i) => (
                <div
                  key={q}
                  className="animate-drift rounded-2xl bg-white px-5 py-4 shadow-lg ring-1 ring-slate-200/70"
                  style={{ ['--drift-delay' as string]: `${i * 0.8}s`, ['--tilt' as string]: `${i % 2 ? 1.5 : -1.5}deg`, marginLeft: `${i * 24}px` }}
                >
                  <p className="font-display text-base font-semibold text-slate-900">{q}</p>
                  <p className="mt-1 text-sm text-slate-500">{['Psikolog, diyetisyen ve kişisel antrenör.', 'Hayır, görüntülü görüşmeler kaydedilmez.', 'Diploma ve belgeler tek tek kontrol edilir.'][i]}</p>
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
        text="Alanını seç, kısa formu doldur; sana uygun uzmanı önerelim."
        primary={{ label: 'Ücretsiz eşleşmeyi başlat', href: '/eslesme' }}
        secondary={{ label: 'Testleri incele', href: '/psikolojik-testler' }}
      />
    </main>
  )
}
