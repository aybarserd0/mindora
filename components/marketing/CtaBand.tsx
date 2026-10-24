import Link from 'next/link'
import Reveal from './Reveal'
import { ThreadLine } from './Mocks'

type Action = { label: string; href: string }

/** Sayfa sonlarındaki kapanış çağrısı */
export default function CtaBand({
  title,
  text,
  primary,
  secondary,
  tone = 'pine',
}: {
  title: string
  text?: string
  primary: Action
  secondary?: Action
  tone?: 'pine' | 'lilac'
}) {
  const bg = tone === 'lilac' ? 'bg-lilac-900' : 'bg-pine-800'
  return (
    <section className="px-5 pb-24 pt-4">
      <Reveal className={`relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] ${bg} px-6 py-16 text-center text-white sm:px-12 lg:py-20`}>
        <ThreadLine className="absolute inset-0 h-full w-full opacity-30" d="M-20 300 C 200 80, 420 360, 640 160 S 1000 40, 1300 220" length={1500} />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">{title}</h2>
          {text ? <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/80">{text}</p> : null}
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={primary.href} className="inline-flex justify-center rounded-full bg-white px-7 py-3.5 font-semibold text-slate-900 transition-colors hover:bg-slate-100">
              {primary.label}
            </Link>
            {secondary ? (
              <Link href={secondary.href} className="inline-flex justify-center rounded-full border border-white/30 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10">
                {secondary.label}
              </Link>
            ) : null}
          </div>
          <p className="mx-auto mt-8 max-w-xl text-xs leading-6 text-white/60">
            Mindora bir acil durum hizmeti değildir. Kendine ya da başkasına zarar verme riski varsa 112&apos;yi ara.
          </p>
        </div>
      </Reveal>
    </section>
  )
}
