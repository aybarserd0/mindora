import type { Metadata } from 'next'
import ServiceLanding, { type ServiceLandingContent } from '@/components/marketing/ServiceLanding'
import { PHOTOS } from '@/components/marketing/Photo'

const description =
  'Belgesi kontrol edilmiş kişisel antrenörlerle evinden online antrenman. Hedefini anlat, sana uygun antrenörü ücretsiz önerelim; ücret baştan belli.'

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
  title: 'Salona gitmeden, sana göre bir antrenman düzeni.',
  lead: 'Hedefini, seviyeni ve ne zaman çalışabileceğini anlat; sana uygun kişisel antrenörü biz önerelim. Antrenmanlar görüntülü görüşmeyle, evinden.',
  heroPhoto: PHOTOS.homeWorkout,
  heroNote: 'Antrenörlük belgesi kontrol edildi',
  steps: [
    { title: 'Kısa formu doldur', text: 'Hedefini, şu anki hareket düzeyini ve uygun saatlerini anlat.' },
    { title: 'Sana uygun antrenörü önerelim', text: 'Hedefine ve saatlerine uyan, belgesi kontrol edilmiş bir antrenör öneririz. Kabul etmek zorunda değilsin.' },
    { title: 'İlk antrenmanını planla', text: 'Uygun saati seç, ödeme adımından önce toplam ücreti açıkça gör.' },
    { title: 'Evinden antrenman yap', text: 'Antrenörün görüntülü görüşmede seni izler, hareketlerini düzeltir; programın Mindora içinde paylaşılır.' },
  ],
  sidePhoto: PHOTOS.dumbbells,
  sideTitle: 'Bir mat ve birkaç metrekare yeter.',
  sideText:
    'Antrenörün elindeki ekipmana, seviyene ve zamanına göre bir program hazırlar. Görüntülü antrenmanda hareketlerini izler, gerektiğinde düzeltir.',
  sideBullets: [
    'İlk görüşmede hedefini, seviyeni ve varsa geçmiş sakatlıklarını konuşursunuz',
    'Program ve videolar Mindora mesajlaşması üzerinden dosya olarak paylaşılır',
    'Antrenmanlar görüntülü görüşmeyle yapılır, görüşmeler kaydedilmez',
    'Antrenörler beslenme listesi hazırlamaz; beslenme için diyetisyenlerimizle eşleşebilirsin',
  ],
  features: [
    { icon: 'shield', title: 'Belgesi kontrol edildi', text: 'Spor bilimleri diploması, federasyon antrenör belgesi ya da MYK belgesi incelenir.' },
    { icon: 'tag', title: 'Ücret baştan belli', text: 'Abonelik ya da paket dayatması yok; ödemeden önce ne ödeyeceğini görürsün.' },
    { icon: 'calendar', title: 'Sana uyan saatte', text: 'Sabah işe gitmeden ya da akşam evde; salon saatlerine bağlı değilsin.' },
    { icon: 'noRecord', title: 'Görüşmeler kaydedilmez', text: 'Görüntülü antrenmanlar Mindora tarafından kaydedilmez.' },
  ],
  crossLink: {
    title: 'Beslenme desteği de ister misin?',
    text: 'Antrenmanını bir diyetisyenle desteklemek istersen, diploması kontrol edilmiş diyetisyenlerimizle de eşleşebilirsin.',
    label: 'Diyetisyen eşleşmesine geç',
    profession: 'dietitian',
  },
  faqs: [
    { q: 'Online antrenman nasıl işliyor?', a: 'Antrenörünle görüntülü görüşmede buluşursun; o seni izler, hareketlerini düzeltir ve tempoyu ayarlar. Programın ve videolar Mindora içinde paylaşılır.' },
    { q: 'Hiç spor yapmadım, uygun mu?', a: 'Evet. Formda hareket düzeyini seçmen yeterli; yeni başlayanlarla çalışan bir antrenör öneririz.' },
    { q: 'Ekipman gerekiyor mu?', a: 'Şart değil. Birçok program yalnızca vücut ağırlığıyla yapılır. Elindeki ekipmanı formda yazarsan antrenörün programı buna göre hazırlar.' },
    { q: 'Bir sağlık durumum ya da sakatlığım var.', a: 'Formda bunu belirtmen yeterli; ayrıntıları ilk görüşmede antrenörünle konuşursun. Emin değilsen başlamadan önce doktoruna danışmanı öneririz.' },
  ],
  disclaimer:
    'Mindora acil sağlık hizmeti değildir. Antrenman sırasında göğüs ağrısı, baş dönmesi ya da nefes darlığı yaşarsan hemen dur ve gerekirse 112 ile iletişime geç.',
}

export default function KisiselAntrenorPage() {
  return <ServiceLanding content={content} />
}
