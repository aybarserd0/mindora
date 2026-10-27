import Link from 'next/link'
import Header from '@/components/Header'
import Reveal from '@/components/marketing/Reveal'
import StepsShowcase from '@/components/marketing/StepsShowcase'
import Comparison from '@/components/marketing/Comparison'
import Photo, { PHOTOS } from '@/components/marketing/Photo'
import ExpertStrip from '@/components/marketing/ExpertStrip'
import {
  CalendarMock,
  CaseRedactionMock,
  ChatMock,
  Chip,
  FloatingNote,
  IconBadge,
  Icons,
  MatchCardMock,
  ThreadLine,
  TopicPickerMock,
  Avatar,
} from '@/components/marketing/Mocks'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PROFESSIONS, PROFESSION_CONFIG, matchHref } from '@/lib/professions'

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
      .neq('account_type', 'supervision_only')
    if (error || typeof count !== 'number') return null
    return count
  } catch {
    return null
  }
}

// Hero'daki hizmet seçimi
const heroServices = [
  { profession: 'psychologist' as const, hint: 'Kaygı, ilişkiler, tükenmişlik' },
  { profession: 'dietitian' as const, hint: 'Kilo, düzenli ve sağlıklı beslenme' },
  { profession: 'trainer' as const, hint: 'Salon ya da ev programı, kondisyon' },
]

const services = [
  {
    title: 'Psikolog',
    text: 'Kaygı, ilişkiler, tükenmişlik ya da adını koyamadığın bir his. Süpervizyonla desteklenen psikologlarla konuş.',
    cta: 'Psikologları incele',
    href: '/uzmanlar',
    photo: PHOTOS.laptopCall,
    tone: 'pine' as const,
  },
  {
    title: 'Diyetisyen',
    text: 'Yasak listesi değil, hayatına uyan bir beslenme düzeni. Diploması kontrol edilmiş diyetisyenlerle çalış.',
    cta: 'Diyetisyenleri incele',
    href: '/diyetisyen',
    photo: PHOTOS.healthyBowl,
    tone: 'none' as const,
  },
  {
    title: 'Kişisel antrenör',
    text: 'Evde canlı antrenman ya da salonda uygulayacağın bir program. Seviyene ve zamanına göre, takibi online.',
    cta: 'Antrenörleri incele',
    href: '/kisisel-antrenor',
    photo: PHOTOS.homeWorkout,
    tone: 'none' as const,
  },
]

const promises = [
  { icon: Icons.spark, text: 'Ücretsiz ön eşleşme' },
  { icon: Icons.shield, text: 'Belgeleri tek tek doğrulanmış uzmanlar' },
  { icon: Icons.people, text: 'Psikolog, diyetisyen ve antrenör tek yerde' },
  { icon: Icons.noRecord, text: 'Kaydedilmeyen görüşmeler' },
]

const comparisonRows = [
  {
    topic: 'Uzman seçimi',
    others: 'Uzun bir profil listesinde kimin sana uygun olduğunu tek başına tahmin edersin.',
    mindora: 'Neye ihtiyacın olduğunu anlatırsın; psikolog, diyetisyen ya da antrenör, alanında çalışan ve saatleri uyan uzmanı biz öneririz.',
  },
  {
    topic: 'Kalite',
    others: 'Uzman platforma bir kez kabul edilir, sonrasında nasıl çalıştığı görünmez.',
    mindora: 'Her uzman kendi mesleğinin belgesiyle doğrulanır. Psikologlar ayrıca zor vakalarını kıdemli meslektaşlarıyla düzenli olarak değerlendirebilir.',
  },
  {
    topic: 'Belgeler',
    others: 'Unvanlar çoğu zaman beyana dayanır.',
    mindora: 'Psikoloji ve diyetetik diplomaları, antrenörlük belgeleri; uzman danışan kabul etmeden önce tek tek kontrol edilir.',
  },
  {
    topic: 'Ücret',
    others: 'Paketler, abonelikler ve sonradan fark edilen ücretler.',
    mindora: 'Görüşme ücreti ödeme adımından önce açıkça görünür. Abonelik yok, gizli ücret yok.',
  },
  {
    topic: 'Görüşme kaydı',
    others: 'Görüşmelerin kaydedilip kaydedilmediği net değildir.',
    mindora: 'Görüntülü görüşmeler kaydedilmez. Sadece sen ve uzmanın oradasınız.',
  },
]

const faqs = [
  {
    q: 'Ön eşleşme ücretli mi?',
    a: 'Hayır. Formu doldurmak ve uzman önerisi almak ücretsizdir, görüşme satın alma zorunluluğu oluşturmaz.',
  },
  {
    q: 'Hangi alanlarda uzman var?',
    a: 'Psikolog, diyetisyen ve kişisel antrenör. Formun başında hangisine ihtiyacın olduğunu seçersin; istersen birden fazlası için ayrı ayrı başvurabilirsin.',
  },
  {
    q: 'Uzmanlar nasıl kontrol ediliyor?',
    a: 'Psikologların ve diyetisyenlerin diploması e-Devlet barkodlu belgeyle, antrenörlerin diploması ya da antrenörlük belgesi tek tek incelenir. Belgesi doğrulanmayan profil yayına alınmaz.',
  },
  {
    q: '"Süpervizyonlu Uzman" ne demek?',
    a: 'Son üç ayda kıdemli bir meslektaşıyla düzenli süpervizyon görüşmesi yapmış psikolog demek. Süpervizyonda vakalar adın ve seni tanıtan hiçbir bilgi olmadan konuşulur.',
  },
  {
    q: 'Önerilen uzman bana uymazsa ne olur?',
    a: 'Öneriyi kabul etmek zorunda değilsin. İlk görüşmeden sonra uyum olmadığını düşünürsen yeni bir öneri isteyebilirsin.',
  },
  {
    q: 'Görüşmeler nasıl yapılıyor?',
    a: 'Tamamen online. Mindora içindeki görüntülü görüşme odasına tarayıcından katılırsın, ayrı bir uygulama gerekmez ve görüşme kaydedilmez. Antrenörünle salonda uygulayacağın bir program üzerinden de çalışabilirsin.',
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
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />

      {/* HERO */}
      <section className="relative border-b border-slate-200">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_10%,var(--color-lilac-100),transparent_70%),radial-gradient(50%_50%_at_70%_95%,var(--color-pine-100),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-28 lg:pt-20">
          <div>
            <h1 className="max-w-[14ch] text-[2.7rem] font-semibold leading-[1.02] text-slate-900 sm:text-6xl lg:text-[4.9rem]">
              Zihnin, beslenmen ve bedenin için doğru uzman.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              Psikolog, diyetisyen ya da kişisel antrenör: neye ihtiyacın olduğunu anlat, belgeleri
              kontrol edilmiş uzmanlar arasından sana uygun olanı biz önerelim. Online görüş, ücreti baştan gör.
            </p>

            <div className="mt-9">
              <p className="text-sm font-medium text-slate-700">Ne için destek arıyorsun?</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {heroServices.map((item, index) => (
                  <li key={item.profession} className="animate-rise-in" style={{ animationDelay: `${150 + index * 80}ms` }}>
                    <Link
                      href={matchHref(item.profession)}
                      className="flex h-full flex-col rounded-2xl border border-slate-300 bg-white/80 px-4 py-3 backdrop-blur transition-colors hover:border-pine-600 hover:bg-pine-50"
                    >
                      <span className="font-display text-base font-semibold text-slate-900">{PROFESSION_CONFIG[item.profession].label}</span>
                      <span className="mt-0.5 text-xs leading-5 text-slate-500">{item.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/eslesme"
                  className="inline-flex justify-center rounded-full bg-pine-800 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-pine-900"
                >
                  Ücretsiz eşleşmeyi başlat
                </Link>
                <p className="text-sm text-slate-500">Yaklaşık 3 dakika. Görüşme almak zorunda değilsin.</p>
              </div>
              {showExpertCount ? (
                <p className="mt-5 text-sm text-slate-500">
                  Şu anda {approvedExpertCount} uzman, belgeleri doğrulanmış olarak hizmet veriyor.
                </p>
              ) : null}
            </div>
          </div>

          {/* Ürün kompozisyonu */}
          <div className="relative mx-auto w-full max-w-xl pb-32 sm:pb-24">
            <Photo
              photo={PHOTOS.laptopCall}
              priority
              className="ml-auto aspect-[4/5] w-[90%] rounded-[2.5rem] shadow-2xl sm:w-[84%]"
            />
            <div className="animate-drift absolute bottom-0 left-0 z-10 w-[88%] sm:w-[72%]" style={{ ['--tilt' as string]: '-1.5deg' }}>
              <MatchCardMock />
            </div>
            <FloatingNote className="-left-2 top-8 z-20 sm:left-0" tilt="-3deg" delay="1.5s" icon={<IconBadge>{Icons.spark}</IconBadge>}>
              Diyetisyen · Dyt. Elif K.
            </FloatingNote>
            <FloatingNote className="-right-2 top-1/3 z-20 hidden sm:flex" tilt="2deg" delay="0.6s" icon={<IconBadge tone="lilac">{Icons.calendar}</IconBadge>}>
              Antrenör · Salon programı hazır
            </FloatingNote>
            <p className="absolute -bottom-7 right-2 text-xs text-slate-400">Temsili fotoğraf. Kart örnek arayüzdür.</p>
          </div>
        </div>

        <div className="relative border-t border-slate-200 bg-white/70 backdrop-blur">
          <ul className="mx-auto grid max-w-7xl gap-x-8 gap-y-4 px-5 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {promises.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-[0.95rem] font-medium text-slate-700">
                <IconBadge>{p.icon}</IconBadge>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* HİZMETLER */}
      <section className="mx-auto max-w-7xl px-5 pt-20 lg:pt-28">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Üç alan, tek platform.</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Zihnin, beslenmen ya da bedenin için; belgesi kontrol edilmiş uzmanlarla online çalış.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.title} delay={i * 80}>
              <Link
                href={service.href}
                className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-white ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Photo photo={service.photo} tone={service.tone} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[16/10] w-full" />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-2xl font-semibold text-slate-900">{service.title}</h3>
                  <p className="mt-2 flex-1 leading-7 text-slate-600">{service.text}</p>
                  <span className="mt-5 inline-flex items-center gap-1 font-semibold text-pine-800">
                    {service.cta}
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* NASIL İŞLER */}
      <section id="nasil" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 lg:pt-28">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">İlk görüşmene dört adım</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Hangi alanda olursa olsun aynı yol: kimseyi aramadan, sıra beklemeden.</p>
        </Reveal>
        <div className="mt-6">
          <StepsShowcase
            steps={[
              {
                title: 'Alanını seç, birkaç soruyu yanıtla',
                text: 'Psikolog, diyetisyen ya da antrenör. Neye ihtiyacın olduğunu, ne zaman müsait olduğunu ve nasıl bir uzmanla rahat edeceğini anlat.',
                visual: <TopicPickerMock />,
              },
              {
                title: 'Sana uygun uzmanı öneriyoruz',
                text: 'Alanında çalışan, belgeleri doğrulanmış ve saatleri sana uyan bir uzman öneriyoruz. Kabul etmek zorunda değilsin.',
                visual: <MatchCardMock />,
              },
              {
                title: 'Saatini seç, ücretini gör',
                text: 'Uzmanının müsait saatlerinden birini seç. Ödeme adımına geçmeden önce toplam ücreti açıkça görürsün.',
                visual: <CalendarMock />,
              },
              {
                title: 'Bulunduğun yerden görüş',
                text: 'Görüşme saatinde tarayıcından katıl. Beslenme planın ya da antrenman programın Mindora içinde paylaşılır; görüşmeler kaydedilmez.',
                visual: (
                  <div className="relative w-full max-w-md">
                    <Photo photo={PHOTOS.tableCall} className="aspect-[4/3] w-full rounded-3xl shadow-xl" sizes="(min-width: 1024px) 40vw, 100vw" />
                    <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg">
                      <IconBadge>{Icons.noRecord}</IconBadge>
                      Görüşme kaydedilmez
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>

      <ExpertStrip profession="all" />

      {/* FARKLAR */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <Reveal>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
              İlk adım zaten zor. Platform bunu zorlaştırmamalı.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-6">
            <Reveal className="relative overflow-hidden rounded-[2rem] bg-pine-900 p-8 text-white lg:col-span-4 lg:row-span-2 lg:p-10">
              <Photo photo={PHOTOS.forestWalk} tone="none" sizes="(min-width: 1024px) 60vw, 100vw" position="50% 60%" cover />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-pine-950/90 via-pine-900/70 to-pine-900/20" />
              <h3 className="relative max-w-md text-2xl font-semibold sm:text-3xl">Doğru kişiyi aramak sende değil, bizde.</h3>
              <p className="relative mt-4 max-w-md leading-7 text-pine-100">
                Yüzlerce profil arasında kaybolmazsın. Psikolog, diyetisyen ya da antrenör; anlattıklarına
                göre alanı, yaklaşımı ve saatleri sana uyan uzmanı öneririz, uymazsa yenisini.
              </p>
              <div className="relative mt-10 flex justify-end">
                <MatchCardMock className="translate-y-6 rotate-[-2deg] sm:mr-4" />
              </div>
            </Reveal>

            <Reveal delay={80} className="rounded-[2rem] bg-slate-50 p-7 ring-1 ring-slate-200 lg:col-span-2">
              <IconBadge>{Icons.shield}</IconBadge>
              <h3 className="mt-5 text-xl font-semibold">Belgesi görülmüş uzmanlar</h3>
              <p className="mt-2 leading-7 text-slate-600">Her uzmanın diploması ya da mesleki belgesi, danışan kabul etmeden önce tek tek kontrol edilir.</p>
            </Reveal>

            <Reveal delay={140} className="rounded-[2rem] bg-slate-50 p-7 ring-1 ring-slate-200 lg:col-span-2">
              <IconBadge>{Icons.tag}</IconBadge>
              <h3 className="mt-5 text-xl font-semibold">Ücret baştan belli</h3>
              <p className="mt-2 leading-7 text-slate-600">Abonelik yok, paket dayatması yok. Ödemeden önce ne ödeyeceğini görürsün.</p>
            </Reveal>

            <Reveal delay={80} className="rounded-[2rem] bg-lilac-50 p-7 ring-1 ring-lilac-100 lg:col-span-3">
              <IconBadge tone="lilac">{Icons.people}</IconBadge>
              <h3 className="mt-5 text-xl font-semibold">Psikologlarımız yalnız çalışmıyor</h3>
              <p className="mt-2 leading-7 text-slate-600">
                Psikologlarımız zor vakalarını kıdemli meslektaşlarıyla düzenli olarak değerlendirebilir.
              </p>
              <a href="#supervizyon" className="mt-4 inline-block font-semibold text-lilac-800 underline decoration-lilac-300 underline-offset-4">
                Nasıl işlediğini gör
              </a>
            </Reveal>

            <Reveal delay={140} className="rounded-[2rem] bg-slate-900 p-7 text-white lg:col-span-3">
              <IconBadge>{Icons.noRecord}</IconBadge>
              <h3 className="mt-5 text-xl font-semibold">Görüşmeler kaydedilmez</h3>
              <p className="mt-2 leading-7 text-slate-300">
                Görüntülü görüşmeler Mindora tarafından kaydedilmez. Konuştukların o odada kalır.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SÜPERVİZYON */}
      <section id="supervizyon" className="relative scroll-mt-20 overflow-hidden bg-lilac-950 text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(50%_60%_at_15%_20%,rgb(125_103_184/0.45),transparent_70%),radial-gradient(40%_50%_at_90%_80%,rgb(67_120_102/0.4),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-28">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wide text-lilac-200">Psikologlar için kalite güvencesi</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">Psikoloğunun da danıştığı biri var.</h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-lilac-100">
              İyi terapistler zor vakalarda yalnız kalmaz; deneyimli bir meslektaşla düşünür. Buna
              süpervizyon denir. Mindora bunu platformun doğal bir parçası yaptı.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                ['Kimliğin hiç paylaşılmaz', 'Vaka; adın, telefonun, işyerin gibi seni tanıtan her şey çıkarılarak konuşulur. Sistem bunları otomatik olarak yakalar.'],
                ['Kalite görünür olur', 'Düzenli süpervizyon alan psikologların profilinde "Süpervizyonlu Uzman" rozeti çıkar.'],
                ['Kayıt yok', 'Süpervizyon görüşmeleri de kaydedilmez, vaka kartları seans bittikten sonra silinir.'],
              ].map(([title, text]) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-lilac-200">
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold text-white">{title}</span>
                    <span className="mt-1 block leading-7 text-lilac-100">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120} className="relative flex min-h-[520px] items-center justify-center">
            <ThreadLine className="absolute inset-0 h-full w-full" d="M40 80 C 200 40, 260 240, 360 260 S 520 420, 560 470" length={800} />
            <div className="relative z-10 w-full max-w-md">
              <CaseRedactionMock className="text-slate-900" />
            </div>
            <div className="animate-drift absolute bottom-0 right-0 z-20 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl sm:-right-4" style={{ ['--drift-delay' as string]: '1s' }}>
              <Avatar initials="SÜ" size="sm" />
              <div>
                <p className="text-sm font-semibold">Kıdemli süpervizör</p>
                <p className="text-xs text-slate-500">Yalnızca anonim kartı görür</p>
              </div>
            </div>
            <div className="animate-drift absolute left-0 top-2 z-20 sm:-left-4" style={{ ['--drift-delay' as string]: '2s', ['--tilt' as string]: '-3deg' }}>
              <Chip tone="lilac" icon={Icons.people}>Süpervizyonlu Uzman</Chip>
            </div>
          </Reveal>
        </div>
      </section>

      {/* KARŞILAŞTIRMA */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">Neden başka bir platform değil de Mindora?</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Farkı en çok fark edeceğin yerler.</p>
        </Reveal>
        <div className="mt-12">
          <Comparison rows={comparisonRows} />
        </div>
      </section>

      {/* GİZLİLİK */}
      <section className="bg-pine-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <Reveal>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight sm:text-5xl">Paylaştıkların seninle uzmanın arasında kalır.</h2>
            <dl className="mt-10 grid gap-8 sm:grid-cols-2">
              {[
                ['Sınırlı erişim', 'Bir görüşmeyi yalnızca sen ve uzmanın görebilirsiniz. Ekibimiz yalnızca şikayet veya güvenlik durumunda, kayıt altına alınarak erişir.'],
                ['Şifreli bağlantı', 'Mesajlaşma dahil tüm trafik şifreli bağlantı üzerinden iletilir.'],
                ['Kayıtsız görüşme', 'Görüntülü görüşmeler kaydedilmez.'],
                ['Senin kararın', 'Görüşme almak, uzmanı kabul etmek ya da bırakmak her zaman senin elinde.'],
              ].map(([title, text]) => (
                <div key={title}>
                  <dt className="font-display text-lg font-semibold">{title}</dt>
                  <dd className="mt-2 leading-7 text-pine-200">{text}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={120} className="flex justify-center">
            <ChatMock />
          </Reveal>
        </div>
      </section>

      {/* UZMANLAR İÇİN */}
      <section className="bg-lilac-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <Reveal className="order-2 flex justify-center lg:order-1">
            <CalendarMock />
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">Psikolog, diyetisyen ya da antrenör müsün? Danışanların burada.</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
              Sana uygun danışanlar gelir; takvim, ödeme, mesajlaşma ve görüntülü görüşme tek panelde.
              Psikologlar kıdemli meslektaşlarından online süpervizyon da alabilir.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {PROFESSIONS.map((p) => (
                <Link
                  key={p}
                  href={p === 'psychologist' ? '/uzman-basvuru' : `/uzman-basvuru?meslek=${PROFESSION_CONFIG[p].slug}`}
                  className="inline-flex justify-center rounded-full bg-lilac-700 px-5 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-lilac-800"
                >
                  {PROFESSION_CONFIG[p].label} başvurusu
                </Link>
              ))}
            </div>
            <Link href="/supervizyon" className="mt-5 inline-block font-semibold text-lilac-800 underline decoration-lilac-300 underline-offset-4">
              Psikologlar için süpervizyonu incele
            </Link>
          </Reveal>
        </div>
      </section>

      {/* SSS */}
      <section className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
        <Reveal>
          <h2 className="text-3xl font-semibold sm:text-4xl">Sık sorulanlar</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-semibold text-slate-900">
                {faq.q}
                <span aria-hidden="true" className="text-2xl font-normal leading-none text-slate-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
        <Link href="/sss" className="mt-8 inline-block font-semibold text-pine-800 underline decoration-pine-300 underline-offset-4 hover:decoration-pine-700">
          Tüm soruları gör
        </Link>
      </section>

      {/* KAPANIŞ */}
      <section className="px-5 pb-24">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-pine-800 px-6 py-16 text-center text-white sm:px-12 lg:py-24">
          <Photo photo={PHOTOS.forestLight} tone="none" sizes="100vw" cover />
          <div aria-hidden="true" className="absolute inset-0 bg-pine-900/75" />
          <ThreadLine className="absolute inset-0 h-full w-full opacity-60" d="M-20 300 C 200 80, 420 360, 640 160 S 1000 40, 1300 220" length={1500} />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight sm:text-6xl">İlk adım üç dakika.</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-pine-100">
              Ne istediğini tam anlatamasan da olur. Alanını seç, formu doldur; gerisini birlikte netleştirelim.
            </p>
            <Link href="/eslesme" className="mt-9 inline-flex rounded-full bg-white px-8 py-4 font-semibold text-pine-900 transition-colors hover:bg-pine-50">
              Ücretsiz eşleşmeyi başlat
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
