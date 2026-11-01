import type { Metadata } from 'next'
import Header from '@/components/Header'
import Reveal from '@/components/marketing/Reveal'
import PageHero from '@/components/marketing/PageHero'
import { PHOTOS } from '@/components/marketing/Photo'
import CtaBand from '@/components/marketing/CtaBand'
import {
  CaseRedactionMock,
  FloatingNote,
  IconBadge,
  Icons,
  MatchCardMock,
  SampleCaption,
  ThreadLine,
} from '@/components/marketing/Mocks'

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description:
    'Mindora; psikolog, diyetisyen ve kişisel antrenör desteği arayanları belgeleri doğrulanmış uzmanlarla buluşturan online bir platformdur. Neden kurulduğunu ve neye önem verdiğimizi anlatıyoruz.',
  alternates: { canonical: '/hakkimizda' },
}

const beliefs = [
  {
    icon: Icons.spark,
    title: 'İlk adım kolay olmalı',
    text: 'Destek aramaya karar vermek zaten zor. Kimi seçeceğini bilmek zorunda kalmamalısın; ihtiyacını anlatman yeterli olmalı.',
  },
  {
    icon: Icons.people,
    title: 'İyi olmak tek bir alandan ibaret değil',
    text: 'Zihnin, beslenmen ve bedenin birbirini etkiler. Bu yüzden psikolog, diyetisyen ve antrenörü aynı güven standardıyla tek çatı altında topladık.',
  },
  {
    icon: Icons.shield,
    title: 'Güven iddiayla değil, kanıtla kurulur',
    text: 'Belgeler tek tek kontrol edilir, görüşmeler kaydedilmez, ücretler baştan gösterilir. Söylediğimiz her şeyi ürünün kendisi yapar.',
  },
  {
    icon: Icons.tag,
    title: 'Uzman da hakkını almalı',
    text: 'Uzmanlarına adil davranmayan bir platform, danışanına da iyi hizmet veremez. Mindora iki tarafı birlikte düşünür.',
  },
]

const checks = [
  ['Diploma ve belge', 'Psikoloji ve diyetetik diplomaları e-Devlet belgesiyle, antrenörlerin diploması ya da antrenörlük belgesi tek tek incelenir; incelenmeden profil yayınlanmaz.'],
  ['Alan ve deneyim', 'Uzmanlık alanları ve çalışma yaklaşımı başvuru sırasında değerlendirilir.'],
  ['Danışan geri bildirimi', 'Yorumlar yalnızca tamamlanan görüşmelerden sonra alınır ve yayından önce incelenir.'],
  ['Süpervizyon', 'Psikologlar kıdemli meslektaşlarından düzenli destek alabilir; bunu yapanlar profillerinde rozetle görünür.'],
]

export default function Hakkimizda() {
  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />

      <PageHero
        photo={PHOTOS.forestTrees}
        title="Destek aramayı kolaylaştırmak için buradayız."
        lead="Mindora; psikolog, diyetisyen ve kişisel antrenör desteği arayanları belgeleri doğrulanmış uzmanlarla online olarak buluşturan bir platform. Asıl derdimiz eşleştirmenin ötesinde: ilk adımın kolay, sürecin güvenli, desteğin kaliteli olması."
        visual={
          <>
            <ThreadLine className="absolute inset-0 h-full w-full" d="M20 380 C 140 240, 260 420, 350 250 S 520 70, 560 110" length={850} />
            <div className="animate-drift relative z-10" style={{ ['--tilt' as string]: '1.5deg' }}>
              <MatchCardMock />
            </div>
            <FloatingNote className="left-0 top-4 z-20" tilt="-2deg" delay="1s" icon={<IconBadge tone="lilac">{Icons.people}</IconBadge>}>
              Psikolog · Diyetisyen · Antrenör
            </FloatingNote>
            <SampleCaption className="absolute -bottom-3 right-0" />
          </>
        }
      />

      {/* Neden kurduk */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">Neden Mindora?</h2>
        </Reveal>
        <Reveal delay={80} className="space-y-6 text-lg leading-8 text-slate-700">
          <p>
            Destek almaya karar veren biri çoğu zaman uzun profil listeleriyle, belirsiz ücretlerle ve
            &quot;doğru kişiyi seçtim mi?&quot; sorusuyla baş başa kalıyor. Bu kararsızlık, başlamadan bırakmanın en
            yaygın sebeplerinden biri.
          </p>
          <p>
            Üstelik ihtiyaçlar çoğu zaman tek bir alana sığmıyor. Stres beslenmeyi, beslenme enerjini, enerji de
            hareket etme isteğini etkiliyor; ama her biri için ayrı ayrı güvenilir birini aramak gerekiyor.
          </p>
          <p className="font-medium text-slate-900">
            Mindora bu yüzden kuruldu: psikolog, diyetisyen ve kişisel antrenörü aynı güven standardıyla tek
            yerde bulman, uzmanların da danışanlarına odaklanabileceği bir çalışma ortamı için.
          </p>
        </Reveal>
      </section>

      {/* İnançlar */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Neye önem veriyoruz</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {beliefs.map((b, i) => (
              <Reveal
                key={b.title}
                delay={i * 70}
                className={`rounded-[2rem] p-8 ${i === 1 ? 'bg-lilac-950 text-white' : i === 2 ? 'bg-pine-900 text-white' : 'bg-slate-50 ring-1 ring-slate-200'}`}
              >
                <IconBadge tone={i === 1 ? 'lilac' : 'pine'}>{b.icon}</IconBadge>
                <h3 className="mt-6 text-2xl font-semibold">{b.title}</h3>
                <p className={`mt-3 leading-7 ${i === 1 || i === 2 ? 'text-white/80' : 'text-slate-600'}`}>{b.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Uzmanları nasıl seçiyoruz */}
      <section className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">Uzmanlarımızı nasıl seçiyor ve destekliyoruz</h2>
          <dl className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {checks.map(([title, text]) => (
              <div key={title} className="grid gap-1 py-5 sm:grid-cols-[0.7fr_1.3fr] sm:gap-6">
                <dt className="font-display text-lg font-semibold">{title}</dt>
                <dd className="leading-7 text-slate-600">{text}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal delay={120} className="relative flex min-h-[420px] items-center justify-center">
          <div className="absolute inset-6 rounded-[2rem] bg-[radial-gradient(70%_70%_at_70%_30%,var(--color-lilac-100),transparent_70%)]" />
          <div className="relative w-full max-w-md">
            <CaseRedactionMock />
            <p className="mt-4 text-center text-sm text-slate-500">Süpervizyonda vaka, danışanı tanıtan bilgiler kapatılarak konuşulur.</p>
          </div>
        </Reveal>
      </section>

      {/* İletişim */}
      <section className="mx-auto max-w-7xl px-5 pb-16">
        <Reveal className="grid gap-6 rounded-[2rem] bg-white p-8 ring-1 ring-slate-200 sm:grid-cols-3 sm:p-10">
          <div className="sm:col-span-1">
            <h2 className="text-2xl font-semibold">Bize ulaş</h2>
            <p className="mt-2 leading-7 text-slate-600">Soruların, önerilerin ya da iş birliği fikirlerin için.</p>
          </div>
          <a href="mailto:mindora.live@gmail.com" className="rounded-2xl bg-slate-50 p-5 transition-colors hover:bg-pine-50">
            <p className="text-sm text-slate-500">E-posta</p>
            <p className="mt-1 font-display text-lg font-semibold text-slate-900">mindora.live@gmail.com</p>
          </a>
          <a href="https://instagram.com/mindora.live" className="rounded-2xl bg-slate-50 p-5 transition-colors hover:bg-pine-50">
            <p className="text-sm text-slate-500">Instagram</p>
            <p className="mt-1 font-display text-lg font-semibold text-slate-900">@mindora.live</p>
          </a>
        </Reveal>
      </section>

      <CtaBand
        title="Hazır olduğunda buradayız."
        text="Psikolog, diyetisyen ya da antrenör; ücretsiz ön eşleşmeyle başla, sana uygun uzmanı birlikte bulalım."
        primary={{ label: 'Ücretsiz eşleşmeyi başlat', href: '/eslesme' }}
        secondary={{ label: 'Uzmanları incele', href: '/uzmanlar' }}
      />
    </main>
  )
}
