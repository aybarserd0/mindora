import Link from 'next/link'
import Header from '@/components/Header'
import PageHero from '@/components/marketing/PageHero'
import Reveal from '@/components/marketing/Reveal'
import CtaBand from '@/components/marketing/CtaBand'
import ExpertStrip from '@/components/marketing/ExpertStrip'
import Photo, { type PhotoSource } from '@/components/marketing/Photo'
import { FloatingNote, IconBadge, Icons, MatchCardMock, SampleCaption, ThreadLine } from '@/components/marketing/Mocks'
import { PROFESSION_CONFIG, expertApplyHref, matchHref, type Profession } from '@/lib/professions'

type Item = { title: string; text: string }

export type ServiceLandingContent = {
  profession: Exclude<Profession, 'psychologist'>
  title: string
  lead: string
  heroPhoto: PhotoSource
  heroNote: string
  steps: Item[]
  features: (Item & { icon: keyof typeof Icons })[]
  sidePhoto: PhotoSource
  sideTitle: string
  sideText: string
  sideBullets: string[]
  crossLink: { title: string; text: string; label: string; profession: Profession }
  faqs: { q: string; a: string }[]
  disclaimer: string
}

/** Diyetisyen ve kişisel antrenör tanıtım sayfalarının ortak iskeleti */
export default function ServiceLanding({ content }: { content: ServiceLandingContent }) {
  const { profession } = content
  const config = PROFESSION_CONFIG[profession]
  const listHref = `/uzmanlar?meslek=${config.slug}`

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />

      <PageHero
        photo={content.heroPhoto}
        title={content.title}
        lead={content.lead}
        visual={
          <>
            <ThreadLine className="absolute inset-0 h-full w-full" d="M20 370 C 150 210, 270 430, 370 240 S 520 70, 570 110" length={850} />
            <div className="animate-drift relative z-10 w-full max-w-sm" style={{ ['--tilt' as string]: '-1deg' }}>
              <MatchCardMock variant={profession} />
            </div>
            <FloatingNote className="-top-3 right-0 z-20" tilt="2deg" delay="0.9s" icon={<IconBadge>{Icons.shield}</IconBadge>}>
              {content.heroNote}
            </FloatingNote>
            <SampleCaption className="absolute -bottom-8 right-0" />
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={matchHref(profession)} className="inline-flex justify-center rounded-full bg-pine-800 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-pine-900">
            Ücretsiz eşleşmeyi başlat
          </Link>
          <Link href={listHref} className="inline-flex justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-800 transition-colors hover:border-slate-400">
            {config.plural}i gör
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">Yaklaşık 3 dakika. Görüşme almak zorunda değilsin.</p>
      </PageHero>

      {/* NASIL İŞLER */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Dört adımda başla</h2>
        </Reveal>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 70} className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-100 font-display text-sm font-semibold text-pine-900">{i + 1}</span>
              <h3 className="mt-5 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* NELER BEKLEYEBİLİRSİN */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <Reveal className="relative pb-10">
            <Photo photo={content.sidePhoto} className="aspect-[5/4] w-full rounded-[2.5rem] shadow-xl" />
          </Reveal>
          <Reveal>
            <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">{content.sideTitle}</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">{content.sideText}</p>
            <ul className="mt-8 space-y-3">
              {content.sideBullets.map((b) => (
                <li key={b} className="flex gap-3 leading-7 text-slate-700">
                  <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine-100 text-pine-800">
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 70} className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <IconBadge tone={i % 2 ? 'lilac' : 'pine'}>{Icons[f.icon]}</IconBadge>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <ExpertStrip profession={profession} />

      {/* ÇAPRAZ YÖNLENDİRME */}
      <section className="bg-lilac-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{content.crossLink.title}</h2>
            <p className="mt-2 max-w-2xl leading-7 text-slate-600">{content.crossLink.text}</p>
          </div>
          <Link
            href={matchHref(content.crossLink.profession)}
            className="inline-flex shrink-0 justify-center rounded-full border border-lilac-300 bg-white px-6 py-3.5 font-semibold text-lilac-800 transition-colors hover:border-lilac-500"
          >
            {content.crossLink.label}
          </Link>
        </div>
      </section>

      {/* SSS */}
      <section className="mx-auto max-w-3xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="text-3xl font-semibold sm:text-4xl">Sık sorulanlar</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {content.faqs.map((faq) => (
            <details key={faq.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-semibold text-slate-900">
                {faq.q}
                <span aria-hidden="true" className="text-2xl font-normal leading-none text-slate-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-xs leading-6 text-slate-500">{content.disclaimer}</p>
      </section>

      <CtaBand
        title="İlk adım üç dakika."
        text={`Hedefini anlat, sana uygun ${config.accusative} birlikte bulalım.`}
        primary={{ label: 'Ücretsiz eşleşmeyi başlat', href: matchHref(profession) }}
        secondary={{ label: `${config.label} olarak başvur`, href: expertApplyHref(profession) }}
      />
    </main>
  )
}
