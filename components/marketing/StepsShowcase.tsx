'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type ShowcaseStep = { title: string; text: string; visual: ReactNode }

/**
 * Solda adımlar, sağda kaydırdıkça değişen ekran kurgusu. Mobilde her adımın
 * görseli kendi altında görünür.
 */
export default function StepsShowcase({ steps, accent = 'pine' }: { steps: ShowcaseStep[]; accent?: 'pine' | 'lilac' }) {
  const [active, setActive] = useState(0)
  const refs = useRef<Array<HTMLLIElement | null>>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(Number((visible.target as HTMLElement).dataset.index))
      },
      { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    )
    refs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const accentLine = accent === 'lilac' ? 'bg-lilac-600' : 'bg-pine-700'
  const accentText = accent === 'lilac' ? 'text-lilac-700' : 'text-pine-700'

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
      <ol className="relative space-y-8 lg:space-y-[30vh] lg:py-[12vh]">
        <span aria-hidden="true" className="absolute bottom-0 left-[11px] top-0 hidden w-px bg-slate-200 lg:block" />
        {steps.map((step, index) => {
          const on = index === active
          return (
            <li
              key={step.title}
              ref={(node) => {
                refs.current[index] = node
              }}
              data-index={index}
              className="relative lg:pl-12"
            >
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1.5 hidden h-[23px] w-[23px] items-center justify-center rounded-full border-2 bg-slate-50 transition-colors lg:flex ${on ? 'border-current ' + accentText : 'border-slate-300'}`}
              >
                <span className={`h-2 w-2 rounded-full transition-colors ${on ? accentLine : 'bg-transparent'}`} />
              </span>
              <p className={`font-display text-sm font-semibold ${accentText}`}>{index + 1}. adım</p>
              <h3 className={`mt-2 text-2xl font-semibold transition-colors sm:text-3xl ${on ? 'text-slate-900' : 'text-slate-900 lg:text-slate-400'}`}>{step.title}</h3>
              <p className="mt-3 max-w-md text-[1.05rem] leading-8 text-slate-600">{step.text}</p>
              <div className="mt-8 flex justify-center lg:hidden">{step.visual}</div>
            </li>
          )
        })}
      </ol>

      <div className="relative hidden lg:block">
        <div className="sticky top-28 flex h-[70vh] max-h-[620px] items-center justify-center overflow-hidden rounded-[2rem] bg-[radial-gradient(90%_70%_at_70%_20%,var(--color-lilac-100),transparent_70%),radial-gradient(80%_60%_at_20%_90%,var(--color-pine-100),transparent_70%)] bg-white ring-1 ring-slate-200/70">
          {steps.map((step, index) => (
            <div key={step.title} className="showcase-panel absolute inset-0 flex items-center justify-center p-10" data-active={index === active ? '' : undefined} aria-hidden={index !== active}>
              {step.visual}
            </div>
          ))}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {steps.map((step, index) => (
              <span key={step.title} className={`h-1.5 rounded-full transition-all ${index === active ? 'w-8 ' + accentLine : 'w-1.5 bg-slate-300'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
