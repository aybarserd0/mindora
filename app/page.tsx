import Link from 'next/link'
import Header from '@/components/Header'
import Reveal from '@/components/marketing/Reveal'
import StepsShowcase from '@/components/marketing/StepsShowcase'
import Comparison from '@/components/marketing/Comparison'
import Photo, { PHOTOS } from '@/components/marketing/Photo'
import ExpertStrip from '@/components/marketing/ExpertStrip'
import { CalendarMock, ChatMock, IconBadge, Icons, MatchCardMock, ThreadLine, TopicPickerMock } from '@/components/marketing/Mocks'
import { MealPlanMock, ThreeServicesMock } from '@/components/marketing/ServiceMocks'
import { PROFESSIONS, PROFESSION_CONFIG, expertApplyHref, matchHref, type Profession } from '@/lib/professions'
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
      .neq('account_type', 'supervision_only')
    if (error || typeof count !== 'number') return null
    return count
  } catch {
    return null
  }
}

type Service = {
  profession: Profession
  title: string
  lead: string
  points: string[]
  href: string
  cta: string
  photo: { src: string; alt: string }
  tone: 'pine' | 'none'
}

const services: Service[] = [
  {
    profession: 'psychologist',
    title: 'Psikolog',
    lead: 'Kaygı, ilişkiler, tükenmişlik ya da adını koyamadığın bir his.',
    points: ['Süpervizyonla desteklenen psikologlar', 'Görüşmeler kaydedilmez', 'Haftalık ya da ihtiyaç oldukça'],
    href: '/psikolog',
    cta: 'Psikologları tanı',
    photo: PHOTOS.laptopCall,
    tone: 'pine',
  },
  {
    profession: 'dietitian',
    title: 'Diyetisyen',
    lead: 'Yasak listesi değil, hayatına uyan bir beslenme düzeni.',
    points: ['Diploması doğrulanmış diyetisyenler', 'Planın Mindora içinde paylaşılır', 'Kontrol görüşmeleriyle güncellenir'],
    href: '/diyetisyen',
    cta: 'Diyetisyenleri tanı',
    photo: PHOTOS.healthyBowl,
    tone: 'none',
  },
  {
    profession: 'trainer',
    title: 'Kişisel antrenör',
    lead: 'Salonda ya da evde; seviyene ve zamanına göre bir program.',
    points: ['Antrenörlük belgesi kontrol edilmiş', 'Evde canlı ders ya da salon programı', 'İlerlemen online takip edilir'],
    href: '/kisisel-antrenor',
    cta: 'Antrenörleri tanı',
    photo: PHOTOS.homeWorkout,
    tone: 'none',
  },
]

const promises = [
  { icon: Icons.spark, text: 'Ücretsiz ön eşleşme' },
  { icon: Icons.shield, text: 'Belgesi tek tek doğrulanmış uzmanlar' },
  { icon: Icons.tag, text: 'Ücret baştan belli, abonelik yok' },
  { icon: Icons.noRecord, text: 'Kaydedilmeyen görüşmeler' },
]

const comparisonRows = [
  {
    topic: 'Uzman seçimi',
    others: 'Uzun bir profil listesinde kimin sana uygun olduğunu tek başına tahmin edersin.',
    mindora: 'Neye ihtiyacın olduğunu anlatırsın; alanında çalışan ve saatleri uyan uzmanı biz öneririz.',
  },
  {
    topic: 'Belgeler',
    others: 'Unvanlar ve sertifikalar çoğu zaman beyana dayanır.',
    mindora: 'Psikoloji ve beslenme diplomaları, antrenörlük belgeleri danışan kabul edilmeden önce tek tek kontrol edilir.',
  },
  {
    topic: 'Kalite',
    others: 'Uzman platforma bir kez kabul edilir, sonrasında nasıl çalıştığı görünmez.',
    mindora: 'Yorumlar yalnızca tamamlanan görüşmelerden sonra alınır. Psikologlar ayrıca düzenli süpervizyon alabilir.',
  },
  {
    topic: 'Ücret',
    others: 'Paketler, abonelikler ve sonradan fark edilen ücretler.',
    mindora: 'Görüşme ücreti ödeme adımından önce açıkça görünür. 24 saat öncesine kadar iptalde ücretin tamamı iade edilir.',
  },
  {
    topic: 'Tek yerde',
    others: 'Her uzman için ayrı uygulama, ayrı ödeme, ayrı mesajlaşma.',
    mindora: 'Psikoloğun, diyetisyenin ve antrenörün; randevular, mesajlar ve planlar aynı yerde.',
  },
]

const faqs = [
  {
    q: 'Mindora nedir?',
    a: 'Psikolog, diyetisyen ve kişisel antrenör desteği arayanları belgeleri doğrulanmış uzmanlarla buluşturan online bir platform. İhtiyacını anlatırsın, sana uygun uzmanı ücretsiz öneririz.',
  },
  {
    q: 'Ön eşleşme ücretli mi?',
    a: 'Hayır. Formu doldurmak ve uzman önerisi almak ücretsizdir, görüşme satın alma zorunluluğu oluşturmaz.',
  },
  {
    q: 'Birden fazla uzmanla çalışabilir miyim?',
    a: 'Evet. Örneğin psikoloğunla çalışırken bir diyetisyenle de eşleşebilirsin. Bir uzmana anlattıkların, senin onayın olmadan diğerine aktarılmaz.',
  },
  {
    q: 'Görüşmeler nasıl yapılıyor?',
    a: 'Mindora içindeki görüntülü görüşme odasında, tarayıcından. Ayrı bir uygulama gerekmez ve görüşmeler kaydedilmez. Antrenörünle salonda uygulayacağın bir program üzerinden de çalışabilirsin.',
  },
  {
    q: 'Mindora acil durumlarda yardımcı olur mu?',
    a: 'Hayır, Mindora bir acil durum hizmeti değildir. Kendine veya başkasına zarar verme riski ya da acil bir sağlık sorunu varsa 112’yi ara ya da en yakın acil servise başvur.',
  },
]

export default async function Home() {
  const approvedExpertCount = await getApprovedExpertCount()
  const showExpertCount = approvedExpertCount !== null && approvedExpertCount >= MIN_EXPERT_COUNT_TO_DISPLAY

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />

      {/* HERO */}
      <section className="relative border-b border-slate-200">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_10%,var(--color-lilac-100),transparent_70%),radial-gradient(50%_50%_at_70%_95%,var(--color-pine-100),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
          <div>
            <p className="mb-5 inline-flex flex-wrap items-center gap-x-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-pine-800 shadow-sm ring-1 ring-slate-200/80">
              Psikolog <span className="text-slate-300">·</span> Diyetisyen <span className="text-slate-300">·</span> Kişisel antrenör
            </p>
            <h1 className="max-w-[14ch] text-[2.7rem] font-semibold leading-[1.02] text-slate-900 sm:text-6xl lg:text-[4.6rem]">
              Zihnin, beslenmen ve bedenin için doğru uzman.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              Neye ihtiyacın olduğunu anlat; belgeleri tek tek kontrol edilmiş uzmanlar arasından sana uygun olanı biz
              önerelim. Online görüş, ücreti baştan gör.
            </p>

            <div className="mt-9">
              <p className="text-sm font-medium text-slate-700">Ne için destek arıyorsun?</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {services.map((s, index) => (
                  <li key={s.profession} className="animate-rise-in" style={{ animationDelay: `${150 + index * 80}ms` }}>
                    <Link
                      href={s.href}
                      className="flex h-full flex-col rounded-2xl border border-slate-300 bg-white/80 px-4 py-3 backdrop-blur transition-colors hover:border-pine-600 hover:bg-pine-50"
                    >
                      <span className="font-display text-base font-semibold text-slate-900">{s.title}</span>
                      <span className="mt-0.5 text-xs leading-5 text-slate-500">{s.lead}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/eslesme" className="inline-flex justify-center rounded-full bg-pine-800 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-pine-900">
                  Ücretsiz eşleşmeyi başlat
                </Link>
                <p className="text-sm text-slate-500">Yaklaşık 3 dakika. Görüşme almak zorunda değilsin.</p>
              </div>
              {showExpertCount ? (
                <p className="mt-5 text-sm text-slate-500">Şu anda {approvedExpertCount} uzman, belgeleri doğrulanmış olarak hizmet veriyor.</p>
              ) : null}
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-xl justify-center">
            <ThreeServicesMock />
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

      {/* ÜÇ ALAN */}
      <section id="hizmetler" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 lg:py-28">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Üç alan, tek platform.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Zihnin, beslenmen ve bedenin birbirini etkiler. Hangisiyle başlarsan başla, aynı güven standardı ve aynı kolaylık.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.profession} delay={i * 90} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-white ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
                <Link href={s.href} tabIndex={-1} aria-hidden="true" className="block">
                  <Photo photo={s.photo} tone={s.tone} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[16/10] w-full" />
                </Link>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-2xl font-semibold text-slate-900">
                    <Link href={s.href}>{s.title}</Link>
                  </h3>
                  <p className="mt-2 leading-7 text-slate-600">{s.lead}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                    {s.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pine-100 text-pine-800">
                          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Link href={s.href} className="inline-flex items-center gap-1 font-semibold text-pine-800">
                      {s.cta}
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                    <Link href={matchHref(s.profession)} className="text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-800">
                      Eşleşme başlat
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil" className="mx-auto max-w-7xl scroll-mt-20 px-5 pb-20 lg:pb-28">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Hangi alanda olursa olsun, dört adım</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Kimseyi aramadan, sıra beklemeden, bulunduğun yerden.</p>
        </Reveal>
        <div className="mt-6">
          <StepsShowcase
            steps={[
              {
                title: 'Alanını seç, birkaç soruyu yanıtla',
                text: 'Psikolog, diyetisyen ya da antrenör. Neye ihtiyacın olduğunu, ne zaman müsait olduğunu ve nasıl bir uzmanla rahat edeceğini anlat.',
                visual: <TopicPickerMock variant="trainer" />,
              },
              {
                title: 'Sana uygun uzmanı öneriyoruz',
                text: 'Alanında çalışan, belgeleri doğrulanmış ve saatleri sana uyan bir uzman öneriyoruz. Kabul etmek zorunda değilsin.',
                visual: <MatchCardMock variant="psychologist" />,
              },
              {
                title: 'Saatini seç, ücretini gör',
                text: 'Uzmanının boş saatlerinden birini seç. Ödeme adımına geçmeden önce toplam ücreti açıkça görürsün.',
                visual: <CalendarMock />,
              },
              {
                title: 'Görüş, planın seninle kalsın',
                text: 'Görüşmeye tarayıcından katıl. Beslenme planın ya da antrenman programın Mindora içinde paylaşılır; görüşmeler kaydedilmez.',
                visual: <MealPlanMock />,
              },
            ]}
          />
        </div>
      </section>

      <ExpertStrip profession="all" />

      {/* FARKLARIMIZ */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <Reveal>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">İlk adım zaten zor. Platform bunu zorlaştırmamalı.</h2>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-6">
            <Reveal className="relative overflow-hidden rounded-[2rem] bg-pine-900 p-8 text-white lg:col-span-4 lg:row-span-2 lg:p-10">
              <Photo photo={PHOTOS.forestWalk} tone="none" sizes="(min-width: 1024px) 60vw, 100vw" position="50% 60%" cover />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-pine-950/90 via-pine-900/70 to-pine-900/20" />
              <h3 className="relative max-w-md text-2xl font-semibold sm:text-3xl">Doğru kişiyi aramak sende değil, bizde.</h3>
              <p className="relative mt-4 max-w-md leading-7 text-pine-100">
                Yüzlerce profil arasında kaybolmazsın. Anlattıklarına göre alanı, yaklaşımı ve saatleri sana uyan uzmanı
                öneririz; uymazsa yenisini.
              </p>
              <div className="relative mt-10 flex justify-end">
                <MatchCardMock variant="trainer" className="translate-y-6 rotate-[-2deg] sm:mr-4" />
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
              <p className="mt-2 leading-7 text-slate-600">Abonelik yok. Ödemeden önce ne ödeyeceğini görürsün; 24 saat öncesine kadar iptalde tam iade.</p>
            </Reveal>

            <Reveal delay={80} className="rounded-[2rem] bg-lilac-50 p-7 ring-1 ring-lilac-100 lg:col-span-3">
              <IconBadge tone="lilac">{Icons.people}</IconBadge>
              <h3 className="mt-5 text-xl font-semibold">Psikologlarımız yalnız çalışmıyor</h3>
              <p className="mt-2 leading-7 text-slate-600">Zor vakalarını kıdemli meslektaşlarıyla, kimlik bilgisi paylaşmadan düzenli olarak değerlendirebilirler.</p>
              <Link href="/psikolog#supervizyon" className="mt-4 inline-block font-semibold text-lilac-800 underline decoration-lilac-300 underline-offset-4">
                Süpervizyon nasıl işliyor?
              </Link>
            </Reveal>

            <Reveal delay={140} className="rounded-[2rem] bg-slate-900 p-7 text-white lg:col-span-3">
              <IconBadge>{Icons.noRecord}</IconBadge>
              <h3 className="mt-5 text-xl font-semibold">Görüşmeler kaydedilmez</h3>
              <p className="mt-2 leading-7 text-slate-300">Görüntülü görüşmeler Mindora tarafından kaydedilmez. Konuştukların o odada kalır.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* KARŞILAŞTIRMA */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">Neden Mindora?</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Farkı en çok hissedeceğin yerler.</p>
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
                ['Uzmanlar arası gizlilik', 'Psikoloğuna anlattıkların diyetisyenine ya da antrenörüne, senin onayın olmadan aktarılmaz.'],
                ['Şifreli bağlantı', 'Mesajlaşma dahil tüm trafik şifreli bağlantı üzerinden iletilir.'],
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
              Sana uygun danışanlar gelir; takvim, ödeme, mesajlaşma ve görüntülü görüşme tek yerde. Psikologlar kıdemli
              meslektaşlarından online süpervizyon da alabilir.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {PROFESSIONS.map((p) => (
                <Link
                  key={p}
                  href={expertApplyHref(p)}
                  className="inline-flex justify-center rounded-full bg-lilac-700 px-5 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-lilac-800"
                >
                  {PROFESSION_CONFIG[p].label} başvurusu
                </Link>
              ))}
            </div>
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
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              {services.map((s) => (
                <Link key={s.profession} href={matchHref(s.profession)} className="inline-flex justify-center rounded-full bg-white px-6 py-3.5 font-semibold text-pine-900 transition-colors hover:bg-pine-50">
                  {s.title}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
