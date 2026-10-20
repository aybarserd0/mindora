'use client'

import { useState } from 'react'

type FaqItem = {
  q: string
  a: string
}

type FaqGroup = {
  category: string
  description: string
  items: FaqItem[]
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function AccordionItem({ faq, groupSlug, index }: { faq: FaqItem; groupSlug: string; index: number }) {
  const [open, setOpen] = useState(false)
  const panelId = `${groupSlug}-panel-${index}`

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200/80">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <h3 className="text-base font-semibold text-slate-900">{faq.q}</h3>
        <span
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>

      {open ? (
        <div id={panelId} className="border-t border-slate-200/80 px-6 py-4">
          <p className="leading-7 text-slate-500">{faq.a}</p>
        </div>
      ) : null}
    </article>
  )
}

export default function FaqAccordion({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.32fr_0.68fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Kategoriler
          </p>

          <div className="mt-5 space-y-2">
            {groups.map((group) => (
              <a
                key={group.category}
                href={`#${slugify(group.category)}`}
                className="block rounded-lg border border-slate-200/80 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                {group.category}
              </a>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-slate-900 p-5 text-white">
            <p className="font-semibold">Sorun burada yok mu?</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Ön eşleşme formunda eklemek istediğin not alanından durumunu
              kısaca paylaşabilirsin.
            </p>
            <a
              href="/eslesme"
              className="mt-4 inline-block rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Forma git
            </a>
          </div>
        </div>
      </aside>

      <div className="space-y-8">
        {groups.map((group) => (
          <section
            key={group.category}
            id={slugify(group.category)}
            className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{group.category}</h2>
              <p className="mt-2 leading-7 text-slate-500">{group.description}</p>
            </div>

            <div className="space-y-3">
              {group.items.map((faq, index) => (
                <AccordionItem key={faq.q} faq={faq} groupSlug={slugify(group.category)} index={index} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
