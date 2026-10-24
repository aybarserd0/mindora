import Reveal from './Reveal'

export type ComparisonRow = { topic: string; others: string; mindora: string }

/** "Çoğu platformda / Mindora'da" karşılaştırması. Rakip adı anılmaz. */
export default function Comparison({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-hidden rounded-[2rem] ring-1 ring-slate-200">
      <div className="hidden grid-cols-[0.8fr_1fr_1fr] bg-white text-sm md:grid">
        <div className="p-5" />
        <div className="border-l border-slate-200 p-5 font-medium text-slate-500">Çoğu platformda</div>
        <div className="border-l border-pine-700 bg-pine-900 p-5 font-display text-base font-semibold text-white">Mindora&apos;da</div>
      </div>
      {rows.map((row, i) => (
        <Reveal key={row.topic} delay={i * 60} className="grid border-t border-slate-200 bg-white md:grid-cols-[0.8fr_1fr_1fr]">
          <div className="p-5 font-display text-lg font-semibold text-slate-900">{row.topic}</div>
          <div className="px-5 pb-4 text-[0.97rem] leading-7 text-slate-500 md:border-l md:border-slate-200 md:p-5">
            <span className="mb-1 block text-xs font-medium text-slate-400 md:hidden">Çoğu platformda</span>
            {row.others}
          </div>
          <div className="bg-pine-900 px-5 py-4 text-[0.97rem] leading-7 text-pine-50 md:border-l md:border-pine-700 md:p-5">
            <span className="mb-1 block text-xs font-medium text-pine-300 md:hidden">Mindora&apos;da</span>
            {row.mindora}
          </div>
        </Reveal>
      ))}
    </div>
  )
}
