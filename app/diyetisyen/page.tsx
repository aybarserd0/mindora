import type { Metadata } from 'next'
import ServiceLanding, { type ServiceLandingContent } from '@/components/marketing/ServiceLanding'
import { PHOTOS } from '@/components/marketing/Photo'

const description =
  'Belgeleri kontrol edilmiş diyetisyenlerle online görüş. Hedefini anlat, sana uygun diyetisyeni ücretsiz önerelim; ücret baştan belli, abonelik yok.'

export const metadata: Metadata = {
  title: 'Online Diyetisyen',
  description,
  alternates: { canonical: '/diyetisyen' },
  openGraph: { title: 'Online Diyetisyen | Mindora', description, url: '/diyetisyen', siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
}

// Onaylı uzman şeridi gerçek veriyle gelir; en fazla bir saat bayat kalabilir
export const revalidate = 3600

const content: ServiceLandingContent = {
  profession: 'dietitian',
  title: 'Beslenmeni hayatına uyan bir düzene birlikte oturtalım.',
  lead: 'Hedefini ve günlük temponu anlat, sana uygun diyetisyeni biz önerelim. Görüşmeler online; ücret baştan belli, abonelik yok.',
  heroPhoto: PHOTOS.healthyBowl,
  heroNote: 'Diploması kontrol edildi',
  steps: [
    { title: 'Kısa formu doldur', text: 'Hedefini, günlük düzenini ve ne zaman görüşebileceğini anlat.' },
    { title: 'Sana uygun diyetisyeni önerelim', text: 'Alanına ve saatlerine uyan, diploması kontrol edilmiş bir diyetisyen öneririz. Kabul etmek zorunda değilsin.' },
    { title: 'İlk görüşmeni planla', text: 'Uygun saati seç, ödeme adımından önce toplam ücreti açıkça gör.' },
    { title: 'Kontrollerle ilerle', text: 'Beslenme planın Mindora içinde paylaşılır; kontrol görüşmeleriyle birlikte güncellenir.' },
  ],
  sidePhoto: PHOTOS.breakfastPlate,
  sideTitle: 'Yasaklar listesi değil, sürdürebileceğin bir düzen.',
  sideText:
    'İyi bir beslenme planı işine, sevdiğin yemeklere ve günlük tempona göre şekillenir. Diyetisyenin seni tanıyarak başlar, kontrollerle birlikte planı güncellersiniz.',
  sideBullets: [
    'İlk görüşmede alışkanlıklarını, hedefini ve önceliklerini konuşursunuz',
    'Planın ve önerileri Mindora mesajlaşması üzerinden dosya olarak paylaşılır',
    'Kontrol görüşmelerinde planı birlikte gözden geçirirsiniz',
    'Görüntülü görüşmeler kaydedilmez, mesajların yalnızca ikinizin arasında kalır',
  ],
  features: [
    { icon: 'shield', title: 'Diploması kontrol edildi', text: 'Beslenme ve Diyetetik mezuniyeti, e-Devlet belgesiyle tek tek doğrulanır.' },
    { icon: 'tag', title: 'Ücret baştan belli', text: 'Abonelik ya da paket dayatması yok; ödemeden önce ne ödeyeceğini görürsün.' },
    { icon: 'noRecord', title: 'Görüşmeler kaydedilmez', text: 'Görüntülü görüşmeler Mindora tarafından kaydedilmez.' },
    { icon: 'calendar', title: 'Bulunduğun yerden', text: 'Mutfak masandan, iş arasında ya da akşam evde; ulaşım derdi yok.' },
  ],
  crossLink: {
    title: 'Yemekle ilişkin duygular seni zorluyor mu?',
    text: 'Stresle ya da duygularla gelen yeme isteği sık yaşanan bir durum. Bunu bir psikologla konuşmak da iyi bir başlangıç olabilir.',
    label: 'Psikolog eşleşmesine geç',
    profession: 'psychologist',
  },
  faqs: [
    { q: 'Online diyetisyen görüşmesi nasıl ilerler?', a: 'İlk görüşmede diyetisyenin alışkanlıklarını, hedefini ve günlük düzenini dinler. Sonrasında beslenme planın Mindora içinde paylaşılır; kontrol görüşmeleriyle planı birlikte güncellersiniz.' },
    { q: 'Ön eşleşme ücretli mi?', a: 'Hayır. Formu doldurmak ücretsizdir ve görüşme satın alma zorunluluğu getirmez.' },
    { q: 'Diyetisyenler nasıl kontrol ediliyor?', a: 'Her diyetisyenin Beslenme ve Diyetetik mezuniyeti, e-Devlet barkodlu mezun belgesiyle doğrulanmadan profil yayına alınmaz.' },
    { q: 'Bir sağlık durumum var, yine de başvurabilir miyim?', a: 'Evet. Formda yalnızca bunu belirtmen yeterli; ayrıntıları ilk görüşmede diyetisyeninle konuşursun. Doktorunun önerilerini de görüşmeye getirmen faydalı olur.' },
  ],
  disclaimer:
    'Mindora acil sağlık hizmeti değildir. Diyetisyen görüşmeleri hekim muayenesi ve tedavisinin yerine geçmez; bir sağlık sorunun varsa doktorunla birlikte ilerle.',
}

export default function DiyetisyenPage() {
  return <ServiceLanding content={content} />
}
