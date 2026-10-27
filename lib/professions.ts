/**
 * Mindora'nın sunduğu üç hizmet: psikolog, diyetisyen ve kişisel antrenör.
 * Meslekle ilgili tüm metin ve kurallar buradan okunur; koda gömülmez.
 * Veritabanında experts.profession ve client_applications.profession bu kodları tutar.
 */

export const PROFESSIONS = ['psychologist', 'dietitian', 'trainer'] as const
export type Profession = (typeof PROFESSIONS)[number]

export const DEFAULT_PROFESSION: Profession = 'psychologist'

export const DOCUMENT_KEYS = ['diploma', 'license', 'certificate', 'identity'] as const
export type DocumentKey = (typeof DOCUMENT_KEYS)[number]

const IDENTITY_DOC = { title: 'Kimlik doğrulama', description: 'Gerekli görülürse kimlik belgeni yükleyebilirsin.', required: false }

type ProfessionConfig = {
  code: Profession
  /** URL'deki ?meslek= değeri */
  slug: string
  label: string
  plural: string
  /** "uygun ___ önerelim" gibi cümlelerde, belirtme hâli */
  accusative: string
  /** "___nla eşleştin" ve "___nun saatleri" gibi e-posta cümleleri için */
  yourWith: string
  yourOf: string
  /** Hizmetin tanıtım sayfası */
  landingHref: string
  /** Iyzico ödeme kaydında görünen hizmet adı */
  serviceName: string
  /** Bu meslekte süpervizyon modülü açık mı */
  supervision: boolean
  client: {
    heading: string
    lead: string
    topicLabel: string
    topics: string[]
    durationLabel: string
    durations: string[]
    previousLabel: string
    preferenceLabel: string
    preferences: string[]
    notePlaceholder: string
    /** Mesleğe özel ek seçim sorusu (ör. antrenmanın nerede yapılacağı) */
    settingQuestion?: { label: string; options: string[] }
    /** Sağlık ön sorusu (yalnızca evet/hayır; ayrıntı formda istenmez) */
    healthQuestion?: { label: string; hint: string }
    safetyNote: string
    trustItems: { title: string; text: string }[]
  }
  /** Uzmanın doğrulama için yükleyeceği belgeler (anahtarlar veritabanında aynı kalır) */
  documents: Record<DocumentKey, { title: string; description: string; required: boolean }>
  /** Uzman profilinde "çalışma yaklaşımı" alanının ipucu */
  approachHint: string
  expert: {
    heroTitle: string
    heroLead: string
    titlePlaceholder: string
    areas: string[]
    credentials: string[]
    pricePlaceholder: string
  }
}

const HEALTH_HINT = 'Ayrıntıları ilk görüşmede uzmanınla konuşursun; burada yazmana gerek yok.'

export const PROFESSION_CONFIG: Record<Profession, ProfessionConfig> = {
  psychologist: {
    code: 'psychologist',
    slug: 'psikolog',
    label: 'Psikolog',
    plural: 'Psikologlar',
    accusative: 'psikoloğu',
    yourWith: 'Psikoloğunla',
    yourOf: 'Psikoloğunun',
    landingHref: '/',
    serviceName: 'Psikolojik Destek Seansı',
    supervision: true,
    approachHint: 'Terapi yaklaşımın (BDT, şema, psikodinamik gibi), seans tarzın ve çalışma biçimin.',
    documents: {
      diploma: { title: 'Psikoloji diploması', description: 'Psikoloji lisans diplomanı ya da e-Devlet barkodlu mezun belgeni yükle.', required: true },
      license: { title: 'Unvan belgesi', description: 'Klinik psikolog unvanın varsa klinik psikoloji yüksek lisans diploması; yoksa lisans mezun belgen.', required: true },
      certificate: { title: 'Terapi eğitim sertifikaları', description: 'BDT, şema, EMDR gibi eğitim sertifikaların. İsteğe bağlı.', required: false },
      identity: IDENTITY_DOC,
    },
    client: {
      heading: 'Doğru psikoloğu aramak senin işin olmasın.',
      lead: 'Yüzlerce profil arasında kaybolma. Ne yaşadığını birkaç cümleyle anlat; belgeleri kontrol edilmiş psikologlar arasından sana uygun olanları biz önerelim.',
      topicLabel: 'Seni en çok zorlayan konu nedir?',
      topics: ['Kaygı / stres', 'İlişki / aile', 'Özgüven', 'Motivasyon', 'Depresif hisler', 'Tükenmişlik', 'Diğer'],
      durationLabel: 'Bu durum ne zamandır devam ediyor?',
      durations: ['Birkaç hafta', 'Birkaç ay', 'Uzun süredir', 'Net bilmiyorum'],
      previousLabel: 'Daha önce destek aldın mı?',
      preferenceLabel: 'Psikolog tercihin var mı?',
      preferences: ['Kadın psikolog', 'Erkek psikolog', 'Fark etmez'],
      notePlaceholder: 'İstersen destek almak istediğin konuyu birkaç cümleyle anlatabilirsin.',
      safetyNote:
        'Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112 ile iletişime geç.',
      trustItems: [
        { title: 'Tamamen ücretsiz', text: 'Formu doldurmak seans satın alma zorunluluğu getirmez.' },
        { title: 'Kontrol edilmiş uzmanlar', text: 'Önerdiğimiz herkesin belgeleri incelendi.' },
        { title: 'Süpervizyon desteği', text: 'Psikologlarımız zor vakalarda kıdemli meslektaşlarına danışabilir.' },
        { title: 'Kayıt yok', text: 'Görüntülü seanslar kaydedilmez.' },
      ],
    },
    expert: {
      heroTitle: 'Danışanını düşün. Gerisini platform düşünsün.',
      heroLead:
        "Mindora'da sana uygun danışanlar gelir, takvim ve ödeme kendiliğinden işler. Zor bir vakada da yalnız kalmazsın: kıdemli bir meslektaşa danışmak birkaç tık uzağında.",
      titlePlaceholder: 'Örn: Klinik Psikolog, Psikolog',
      areas: ['Kaygı / stres', 'İlişki / aile', 'Depresif hisler', 'Özgüven', 'Motivasyon', 'Tükenmişlik', 'Sınav ve gelecek kaygısı', 'Diğer'],
      credentials: ['Psikoloji lisans diploması (klinik psikologlar için klinik psikoloji yüksek lisansı)', 'e-Devlet barkodlu mezun belgesi'],
      pricePlaceholder: 'Örn: 1500 TL',
    },
  },
  dietitian: {
    code: 'dietitian',
    slug: 'diyetisyen',
    label: 'Diyetisyen',
    plural: 'Diyetisyenler',
    accusative: 'diyetisyeni',
    yourWith: 'Diyetisyeninle',
    yourOf: 'Diyetisyeninin',
    landingHref: '/diyetisyen',
    serviceName: 'Diyetisyen Görüşmesi',
    supervision: false,
    approachHint: 'Beslenme yaklaşımın, kontrol görüşmelerini nasıl planladığın ve planları nasıl hazırladığın.',
    documents: {
      diploma: { title: 'Beslenme ve Diyetetik diploması', description: 'Beslenme ve Diyetetik lisans diplomanı yükle.', required: true },
      license: { title: 'e-Devlet mezun belgesi', description: "e-Devlet'ten aldığın barkodlu mezun belgesi; barkoddan doğrulanır.", required: true },
      certificate: { title: 'Ek eğitim sertifikaları', description: 'Sporcu beslenmesi, klinik beslenme gibi sertifikaların. İsteğe bağlı.', required: false },
      identity: IDENTITY_DOC,
    },
    client: {
      heading: 'Sana uygun diyetisyeni birlikte bulalım.',
      lead: 'Hedefini ve günlük düzenini anlat; belgeleri kontrol edilmiş diyetisyenler arasından sana uygun olanı biz önerelim. Görüşmeler online, ücret baştan belli.',
      topicLabel: 'Hangi konuda destek almak istiyorsun?',
      topics: [
        'Kilo vermek',
        'Kilo almak',
        'Sağlıklı ve düzenli beslenmek',
        'Sporcu beslenmesi',
        'Hamilelik / emzirme dönemi',
        'Bir sağlık durumuna uygun beslenme',
        'Diğer',
      ],
      durationLabel: 'Bu hedefle ne zamandır ilgileniyorsun?',
      durations: ['Yeni başlıyorum', 'Birkaç aydır', 'Uzun süredir', 'Net bilmiyorum'],
      previousLabel: 'Daha önce bir diyetisyenle çalıştın mı?',
      preferenceLabel: 'Diyetisyen tercihin var mı?',
      preferences: ['Kadın diyetisyen', 'Erkek diyetisyen', 'Fark etmez'],
      notePlaceholder: 'İstersen günlük düzenini, iş temponu ya da sevmediğin yiyecekleri yazabilirsin.',
      healthQuestion: {
        label: 'Diyetisyeninin bilmesi gereken bir sağlık durumu (hastalık, düzenli ilaç, hamilelik gibi) var mı?',
        hint: HEALTH_HINT,
      },
      safetyNote:
        'Mindora acil sağlık hizmeti değildir. Yemekle ilişkin seni çok zorlayan duygular ya da düşünceler yaşıyorsan bir psikologla başlamak da iyi bir seçenek olabilir.',
      trustItems: [
        { title: 'Tamamen ücretsiz', text: 'Formu doldurmak görüşme satın alma zorunluluğu getirmez.' },
        { title: 'Diploması kontrol edilmiş', text: 'Önerdiğimiz her diyetisyenin mezuniyet belgesi incelendi.' },
        { title: 'Ücret baştan belli', text: 'Abonelik yok; ödemeden önce ne ödeyeceğini görürsün.' },
        { title: 'Kayıt yok', text: 'Görüntülü görüşmeler kaydedilmez.' },
      ],
    },
    expert: {
      heroTitle: 'Danışanlarına odaklan. Takvim ve ödeme bizde.',
      heroLead:
        "Mindora'da hedefine uygun danışanlar gelir; randevu, ödeme, mesajlaşma ve görüntülü görüşme tek yerden işler. Beslenme planlarını dosya olarak paylaşabilirsin.",
      titlePlaceholder: 'Örn: Diyetisyen, Uzman Diyetisyen',
      areas: ['Kilo yönetimi', 'Sporcu beslenmesi', 'Hamilelik / emzirme', 'Çocuk ve ergen beslenmesi', 'Diyabet / insülin direnci', 'Bağırsak sağlığı', 'Vejetaryen / vegan beslenme', 'Diğer'],
      credentials: ['Beslenme ve Diyetetik lisans diploması', 'e-Devlet barkodlu mezun belgesi'],
      pricePlaceholder: 'Örn: 1000 TL',
    },
  },
  trainer: {
    code: 'trainer',
    slug: 'antrenor',
    label: 'Kişisel Antrenör',
    plural: 'Kişisel Antrenörler',
    accusative: 'antrenörü',
    yourWith: 'Antrenörünle',
    yourOf: 'Antrenörünün',
    landingHref: '/kisisel-antrenor',
    serviceName: 'Kişisel Antrenörlük Seansı',
    supervision: false,
    approachHint: 'Antrenman yaklaşımın; salon ve ev programlarını nasıl hazırladığın, takibi nasıl yaptığın.',
    documents: {
      diploma: { title: 'Diploma ya da antrenörlük belgesi', description: 'Spor bilimleri / antrenörlük eğitimi diploması ya da federasyon antrenör belgeni yükle.', required: true },
      license: { title: 'MYK / federasyon belgesi', description: 'Varsa MYK mesleki yeterlilik belgen ya da ikinci bir antrenörlük belgen. Diploman varsa isteğe bağlı.', required: false },
      certificate: { title: 'Ek sertifikalar', description: 'Fonksiyonel antrenman, pilates, ilk yardım gibi sertifikaların. İsteğe bağlı.', required: false },
      identity: IDENTITY_DOC,
    },
    client: {
      heading: 'Sana uygun antrenörü birlikte bulalım.',
      lead: 'Hedefini, seviyeni ve ne zaman çalışabileceğini anlat; belgeleri kontrol edilmiş antrenörler arasından sana uygun olanı biz önerelim. İster evde ister salonda çalış; programın ve takibin online.',
      topicLabel: 'Hedefin nedir?',
      topics: [
        'Kilo vermek / yağ yakmak',
        'Kas kazanmak / güçlenmek',
        'Genel form ve kondisyon',
        'Esneklik ve duruş',
        'Salon programı',
        'Evde antrenman düzeni',
        'Spora yeni başlıyorum',
        'Diğer',
      ],
      durationLabel: 'Şu an ne kadar hareketlisin?',
      durations: ['Neredeyse hiç', 'Haftada 1–2 gün', 'Haftada 3 gün ve üzeri', 'Düzenli spor yapıyorum'],
      previousLabel: 'Daha önce bir antrenörle çalıştın mı?',
      preferenceLabel: 'Antrenör tercihin var mı?',
      preferences: ['Kadın antrenör', 'Erkek antrenör', 'Fark etmez'],
      notePlaceholder: 'İstersen gittiğin salonu ya da evdeki ekipmanını (dambıl, bant, mat), varsa geçmiş bir sakatlığını yazabilirsin.',
      settingQuestion: { label: 'Antrenmanlarını nerede yapacaksın?', options: ['Salonda', 'Evde', 'İkisi de'] },
      healthQuestion: {
        label: 'Doktorunun egzersizini kısıtladığı ya da dikkat etmen gereken bir sağlık durumun var mı?',
        hint: `${HEALTH_HINT} Emin değilsen başlamadan önce doktoruna danışmanı öneririz.`,
      },
      safetyNote:
        'Mindora acil sağlık hizmeti değildir. Antrenman sırasında göğüs ağrısı, baş dönmesi ya da nefes darlığı yaşarsan hemen dur ve gerekirse 112 ile iletişime geç.',
      trustItems: [
        { title: 'Tamamen ücretsiz', text: 'Formu doldurmak antrenman satın alma zorunluluğu getirmez.' },
        { title: 'Belgesi kontrol edilmiş', text: 'Antrenörlerimizin diploması veya antrenörlük belgesi incelendi.' },
        { title: 'Evde ya da salonda', text: 'Canlı görüntülü antrenman ya da salonda uygulayacağın program.' },
        { title: 'Ücret baştan belli', text: 'Abonelik yok; ödemeden önce ne ödeyeceğini görürsün.' },
      ],
    },
    expert: {
      heroTitle: 'Antrenmana odaklan. Danışan ve ödeme bizde.',
      heroLead:
        "Mindora'da hedefine uygun danışanlar gelir; randevu, ödeme, mesajlaşma ve görüntülü görüşme tek yerden işler. Evde canlı antrenman yaptırabilir ya da salon programı hazırlayıp takip edebilirsin.",
      titlePlaceholder: 'Örn: Kişisel Antrenör, Spor Bilimci',
      areas: ['Yağ yakımı', 'Kas kazanımı / güç', 'Kondisyon', 'Esneklik / mobilite', 'Salon programı', 'Evde antrenman', 'Yeni başlayanlar', 'Kadınlara özel antrenman', 'Diğer'],
      credentials: [
        'Spor bilimleri / antrenörlük eğitimi lisans diploması, federasyon antrenör belgesi ya da MYK belgesi',
        'Yalnızca online alınmış sertifikalar tek başına yeterli değildir',
        'Antrenörler diyet listesi hazırlamaz; beslenme konuları diyetisyenlere yönlendirilir',
      ],
      pricePlaceholder: 'Örn: 800 TL',
    },
  },
}

export function isProfession(value: unknown): value is Profession {
  return typeof value === 'string' && (PROFESSIONS as readonly string[]).includes(value)
}

/** Veritabanından gelen değeri güvenle mesleğe çevirir (boş/eski kayıtlar psikolog sayılır). */
export function toProfession(value: unknown): Profession {
  return isProfession(value) ? value : DEFAULT_PROFESSION
}

/** ?meslek=diyetisyen gibi URL değerini mesleğe çevirir. */
export function professionFromSlug(value: string | string[] | undefined | null): Profession {
  const v = Array.isArray(value) ? value[0] : value
  const match = PROFESSIONS.find((p) => PROFESSION_CONFIG[p].slug === v || p === v)
  return match ?? DEFAULT_PROFESSION
}

export function professionLabel(value: unknown) {
  return PROFESSION_CONFIG[toProfession(value)].label
}

export function matchHref(profession: Profession, extra?: Record<string, string>) {
  const params = new URLSearchParams()
  if (profession !== DEFAULT_PROFESSION) params.set('meslek', PROFESSION_CONFIG[profession].slug)
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v)
  const qs = params.toString()
  return qs ? `/eslesme?${qs}` : '/eslesme'
}

export function expertApplyHref(profession: Profession) {
  return profession === DEFAULT_PROFESSION ? '/uzman-basvuru' : `/uzman-basvuru?meslek=${PROFESSION_CONFIG[profession].slug}`
}

export function documentInfo(profession: unknown, key: string) {
  const docs = PROFESSION_CONFIG[toProfession(profession)].documents
  return (docs as Record<string, { title: string; description: string; required: boolean }>)[key] ?? null
}
