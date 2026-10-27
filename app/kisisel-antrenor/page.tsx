import type { Metadata } from 'next'
import ServiceLanding, { type ServiceLandingContent } from '@/components/marketing/ServiceLanding'
import { PHOTOS } from '@/components/marketing/Photo'

const description =
  'Belgesi kontrol edilmiş kişisel antrenörlerle online çalış: evde canlı antrenman ya da salon programı. Hedefini anlat, sana uygun antrenörü ücretsiz önerelim.'

export const metadata: Metadata = {
  title: 'Online Kişisel Antrenör',
  description,
  alternates: { canonical: '/kisisel-antrenor' },
  openGraph: { title: 'Online Kişisel Antrenör | Mindora', description, url: '/kisisel-antrenor', siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
}

// Onaylı uzman şeridi gerçek veriyle gelir; en fazla bir saat bayat kalabilir
export const revalidate = 3600

const content: ServiceLandingContent = {
  profession: 'trainer',
  title: 'Evde ya da salonda, sana göre bir antrenman düzeni.',
  lead: 'Hedefini, seviyeni ve nerede çalışacağını anlat; sana uygun kişisel antrenörü biz önerelim. Evde görüntülü antrenman yapabilir ya da salonda uygulayacağın bir program alabilirsin.',
  heroPhoto: PHOTOS.homeWorkout,
  heroNote: 'Antrenörlük belgesi kontrol edildi',
  steps: [
    { title: 'Kısa formu doldur', text: 'Hedefini, hareket düzeyini, evde mi salonda mı çalışacağını anlat.' },
    { title: 'Sana uygun antrenörü önerelim', text: 'Hedefine ve saatlerine uyan, belgesi kontrol edilmiş bir antrenör öneririz. Kabul etmek zorunda değilsin.' },
    { title: 'İlk antrenmanını planla', text: 'Uygun saati seç, ödeme adımından önce toplam ücreti açıkça gör.' },
    { title: 'Evde ya da salonda başla', text: 'Evdeysen antrenörün görüntülü görüşmede seni izler. Salondaysan programın Mindora içinde paylaşılır, kontrol görüşmelerinde birlikte güncellenir.' },
  ],
  sidePhoto: PHOTOS.dumbbells,
  sideTitle: 'Salonda da evde de yanında bir antrenör.',
  sideText:
    'Antrenörün gittiğin salona ya da evdeki ekipmana, seviyene ve zamanına göre bir program hazırlar. Evde görüntülü antrenmanda hareketlerini izler; salonda çektiğin kısa videolar üzerinden tekniğini düzeltir.',
  sideBullets: [
    'İlk görüşmede hedefini, seviyeni ve varsa geçmiş sakatlıklarını konuşursunuz',
    'Salon programın gün gün, set ve tekrar sayılarıyla Mindora mesajlaşması üzerinden paylaşılır',
    'Salonda çektiğin hareket videolarına antrenörün geri bildirim verir',
    'Evde canlı antrenmanlar görüntülü görüşmeyle yapılır, görüşmeler kaydedilmez',
    'Antrenörler beslenme listesi hazırlamaz; beslenme için diyetisyenlerimizle eşleşebilirsin',
  ],
  features: [
    { icon: 'shield', title: 'Belgesi kontrol edildi', text: 'Spor bilimleri diploması, federasyon antrenör belgesi ya da MYK belgesi incelenir.' },
    { icon: 'tag', title: 'Ücret baştan belli', text: 'Abonelik ya da paket dayatması yok; ödemeden önce ne ödeyeceğini görürsün.' },
    { icon: 'calendar', title: 'Sana uyan düzende', text: 'Kendi salonunda kendi saatinde ya da evde canlı; ikisini birlikte de yürütebilirsin.' },
    { icon: 'noRecord', title: 'Görüşmeler kaydedilmez', text: 'Görüntülü antrenmanlar Mindora tarafından kaydedilmez.' },
  ],
  crossLink: {
    title: 'Beslenme desteği de ister misin?',
    text: 'Antrenmanını bir diyetisyenle desteklemek istersen, diploması kontrol edilmiş diyetisyenlerimizle de eşleşebilirsin.',
    label: 'Diyetisyen eşleşmesine geç',
    profession: 'dietitian',
  },
  faqs: [
    { q: 'Online antrenman nasıl işliyor?', a: 'İki yolu var. Evde çalışıyorsan antrenörünle görüntülü görüşmede buluşursun; o seni izler ve hareketlerini düzeltir. Salona gidiyorsan antrenörün sana bir program hazırlar, kontrol görüşmeleri ve hareket videoların üzerinden ilerlemeni takip eder.' },
    { q: 'Kendi salonuma gitmeye devam edebilir miyim?', a: 'Evet. Antrenörün programı gittiğin salondaki ekipmana göre hazırlar. Mindora bir salon değildir; antrenmanı kendi salonunda yaparsın.' },
    { q: 'Hiç spor yapmadım, uygun mu?', a: 'Evet. Formda hareket düzeyini seçmen yeterli; yeni başlayanlarla çalışan bir antrenör öneririz.' },
    { q: 'Evde çalışacağım, ekipman gerekiyor mu?', a: 'Şart değil. Birçok program yalnızca vücut ağırlığıyla yapılır. Elindeki ekipmanı formda yazarsan antrenörün programı buna göre hazırlar.' },
    { q: 'Bir sağlık durumum ya da sakatlığım var.', a: 'Formda bunu belirtmen yeterli; ayrıntıları ilk görüşmede antrenörünle konuşursun. Emin değilsen başlamadan önce doktoruna danışmanı öneririz.' },
  ],
  disclaimer:
    'Mindora acil sağlık hizmeti değildir. Antrenman sırasında göğüs ağrısı, baş dönmesi ya da nefes darlığı yaşarsan hemen dur ve gerekirse 112 ile iletişime geç.',
}

export default function KisiselAntrenorPage() {
  return <ServiceLanding content={content} />
}
