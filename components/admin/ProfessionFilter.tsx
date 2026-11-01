'use client'

import { PROFESSIONS, PROFESSION_CONFIG, type Profession } from '@/lib/professions'

export type ProfessionFilterValue = Profession | 'all'

/** Admin listelerinde hizmete göre süzme */
export default function ProfessionFilter({
  value,
  onChange,
  counts,
}: {
  value: ProfessionFilterValue
  onChange: (value: ProfessionFilterValue) => void
  counts?: Partial<Record<ProfessionFilterValue, number>>
}) {
  const options: { value: ProfessionFilterValue; label: string }[] = [
    { value: 'all', label: 'Tüm hizmetler' },
    ...PROFESSIONS.map((p) => ({ value: p, label: PROFESSION_CONFIG[p].plural })),
  ]
  return (
    <div role="group" aria-label="Hizmete göre süz" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            value === o.value ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
        >
          {o.label}
          {counts && typeof counts[o.value] === 'number' ? ` (${counts[o.value]})` : ''}
        </button>
      ))}
    </div>
  )
}
