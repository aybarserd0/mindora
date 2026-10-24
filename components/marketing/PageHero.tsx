import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  visual?: ReactNode
  tone?: 'pine' | 'lilac'
}

/** Herkese açık sayfaların ortak giriş alanı: solda mesaj, sağda ürün kurgusu. */
export default function PageHero({ title, lead, children, visual, tone = 'pine' }: Props) {
  const glow =
    tone === 'lilac'
      ? 'bg-[radial-gradient(60%_70%_at_80%_10%,var(--color-lilac-200),transparent_70%),radial-gradient(50%_60%_at_10%_100%,var(--color-pine-100),transparent_70%)]'
      : 'bg-[radial-gradient(60%_60%_at_85%_10%,var(--color-lilac-100),transparent_70%),radial-gradient(50%_50%_at_70%_95%,var(--color-pine-100),transparent_70%)]'

  return (
    <section className={`relative overflow-hidden border-b border-slate-200 ${tone === 'lilac' ? 'bg-lilac-50' : ''}`}>
      <div aria-hidden="true" className={`absolute inset-0 ${glow}`} />
      <div className={`relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 lg:items-center lg:pb-24 lg:pt-20 ${visual ? 'lg:grid-cols-[1.05fr_0.95fr]' : ''}`}>
        <div>
          <h1 className="max-w-[16ch] text-[2.5rem] font-semibold leading-[1.04] text-slate-900 sm:text-6xl lg:text-[4.25rem]">{title}</h1>
          {lead ? <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{lead}</p> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
        {visual ? <div className="relative mx-auto flex min-h-[380px] w-full max-w-xl items-center justify-center">{visual}</div> : null}
      </div>
    </section>
  )
}
