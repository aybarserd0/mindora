'use client'

import { useMemo, useState } from 'react'
import { CASE_AGE_RANGES, CASE_GENDERS, CASE_TOPICS } from '@/lib/supervision/constants'
import { scanForPii, unresolvedFindings, type PiiFinding } from '@/lib/supervision/pii-scan'
import { Notice, inputClass, primaryButton, secondaryButton } from './ui'

export type CaseRecord = {
  id: string
  label: string
  age_range: string | null
  gender: string | null
  topic: string
  session_count: number | null
  formulation: string | null
  question: string | null
  consent_attested: boolean
  status: 'draft' | 'shared' | 'closed'
}

type Props = {
  initial?: CaseRecord | null
  onSaved: (record: CaseRecord) => void
  onCancel: () => void
}

export default function CaseForm({ initial, onSaved, onCancel }: Props) {
  const [label, setLabel] = useState(initial?.label || '')
  const [ageRange, setAgeRange] = useState(initial?.age_range || '')
  const [gender, setGender] = useState(initial?.gender || '')
  const [topic, setTopic] = useState(initial?.topic || '')
  const [sessionCount, setSessionCount] = useState(initial?.session_count?.toString() || '')
  const [formulation, setFormulation] = useState(initial?.formulation || '')
  const [question, setQuestion] = useState(initial?.question || '')
  const [consent, setConsent] = useState(initial?.consent_attested || false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [serverFindings, setServerFindings] = useState<PiiFinding[]>([])

  // Yazarken anlık tarama; sunucu aynı kuralları tekrar uygular
  const findings = useMemo(
    () => unresolvedFindings([...scanForPii(label), ...scanForPii(formulation), ...scanForPii(question)], dismissed),
    [label, formulation, question, dismissed]
  )
  const visibleFindings = findings.length > 0 ? findings : serverFindings

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(initial ? `/api/supervision/cases/${initial.id}` : '/api/supervision/cases', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          ageRange,
          gender,
          topic,
          sessionCount,
          formulation,
          question,
          consentAttested: consent,
          dismissedNames: dismissed,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Vaka kartı kaydedilemedi.')
        setServerFindings(Array.isArray(data?.findings) ? data.findings : [])
        return
      }
      onSaved(data.case)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <Notice tone="warn">
        İsim silmek yetmez. Nadir bir meslek, bilinen bir olay ya da küçük bir topluluğa ait bir
        ayrıntı da kişiyi tanımlayabilir. Yalnızca klinik soruyla ilgili bilgiyi yaz.
      </Notice>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-800">Kendi etiketin</span>
        <input
          className={inputClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
          placeholder="Örn. Vaka A, Salı 18.00"
          required
        />
        <span className="mt-1 block text-xs text-slate-500">Süpervizör bu etiketi görmez.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">Yaş aralığı</span>
          <select className={inputClass} value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
            <option value="">Seç</option>
            {CASE_AGE_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">Cinsiyet</span>
          <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Seç</option>
            {CASE_GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">Seans sayısı</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            max={1000}
            value={sessionCount}
            onChange={(e) => setSessionCount(e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-800">Başvuru konusu</span>
        <select className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} required>
          <option value="">Seç</option>
          {CASE_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-800">Vaka formülasyonu</span>
        <textarea
          className={`${inputClass} min-h-36`}
          value={formulation}
          onChange={(e) => setFormulation(e.target.value)}
          maxLength={4000}
          placeholder="Sunulan sorun, süreç, şimdiye kadar çalışılanlar"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-800">Süpervizöre sorun</span>
        <textarea
          className={`${inputClass} min-h-24`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1500}
          placeholder="Bu seansta neyi konuşmak istiyorsun?"
        />
      </label>

      {visibleFindings.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Kişiyi tanımlayabilecek ifadeler bulundu</p>
          <ul className="mt-3 space-y-2">
            {visibleFindings.map((f) => (
              <li key={`${f.type}-${f.match}`} className="flex flex-wrap items-center justify-between gap-2 text-sm text-rose-900">
                <span>
                  <span className="font-medium">“{f.match}”</span> ({f.label})
                </span>
                {f.type === 'name' ? (
                  <button
                    type="button"
                    onClick={() => setDismissed((d) => [...d, f.match])}
                    className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-800"
                  >
                    Bu bir isim değil
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-pine-700"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span className="text-sm leading-6 text-slate-700">
          Bu danışandan, vakasının kimliği belirlenemeyecek şekilde süpervizyonda değerlendirilmesi
          için bilgilendirilmiş onay aldım. Bu beyanın sorumluluğu bana aittir.
        </span>
      </label>

      {error ? <Notice tone="bad">{error}</Notice> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton} disabled={saving || findings.length > 0}>
          {saving ? 'Kaydediliyor' : initial ? 'Değişiklikleri kaydet' : 'Vaka kartını kaydet'}
        </button>
        <button type="button" className={secondaryButton} onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}
