import { IconBadge, Icons } from '@/components/marketing/Mocks'

type Item = { title: string; text: string }

/** Giriş sayfalarında Mindora'nın üç hizmetini gösteren yan panel */
export default function ServicesAside({ heading, lead, items, tone = 'pine' }: { heading: string; lead: string; items: Item[]; tone?: 'pine' | 'lilac' }) {
  const services = [
    { label: 'Psikolog', icon: Icons.people },
    { label: 'Diyetisyen', icon: Icons.spark },
    { label: 'Kişisel antrenör', icon: Icons.calendar },
  ]
  const bg = tone === 'lilac' ? 'bg-lilac-950' : 'bg-pine-900'
  return (
    <aside className={`relative overflow-hidden rounded-[2rem] ${bg} p-8 text-white sm:p-10`}>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_60%_at_90%_0%,rgb(182_166_221/0.35),transparent_70%),radial-gradient(50%_50%_at_0%_100%,rgb(143_212_189/0.25),transparent_70%)]" />
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
              <span className="text-white/80">{s.icon}</span>
              {s.label}
            </span>
          ))}
        </div>
        <h2 className="mt-8 text-3xl font-semibold leading-tight sm:text-4xl">{heading}</h2>
        <p className="mt-4 leading-7 text-white/75">{lead}</p>
        <ul className="mt-8 space-y-5">
          {items.map((item) => (
            <li key={item.title} className="flex gap-4">
              <IconBadge tone={tone === 'lilac' ? 'lilac' : 'pine'}>
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
              </IconBadge>
              <span>
                <span className="block font-display text-lg font-semibold">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-white/70">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
