import { CASE_AGE_RANGES, CASE_GENDERS, CASE_TOPICS } from './constants'
import { scanForPii, unresolvedFindings, type PiiFinding } from './pii-scan'
import { toText } from './server'

export type CaseInput = {
  label: string
  age_range: string | null
  gender: string | null
  topic: string
  session_count: number | null
  formulation: string | null
  question: string | null
  consent_attested: boolean
}

/** Gövdeyi doğrular; hata mesajı ya da temizlenmiş alanlar döner. */
export function parseCaseInput(
  body: Record<string, unknown>
): { error: string; findings?: PiiFinding[] } | { value: CaseInput } {
  const label = toText(body.label, 80)
  const topic = toText(body.topic, 80)
  const ageRange = toText(body.ageRange, 10) || null
  const gender = toText(body.gender, 20) || null
  const formulation = toText(body.formulation, 4000) || null
  const question = toText(body.question, 1500) || null
  const sessionCountRaw = body.sessionCount
  const sessionCount =
    sessionCountRaw === '' || sessionCountRaw === null || sessionCountRaw === undefined
      ? null
      : Number(sessionCountRaw)
  const dismissed = Array.isArray(body.dismissedNames) ? body.dismissedNames.map((d) => toText(d, 40)) : []

  if (!label) return { error: 'Vakaya yalnızca senin göreceğin kısa bir etiket ver (ör. "Vaka A").' }
  if (!(CASE_TOPICS as readonly string[]).includes(topic)) return { error: 'Bir başvuru konusu seç.' }
  if (ageRange && !(CASE_AGE_RANGES as readonly string[]).includes(ageRange)) return { error: 'Geçersiz yaş aralığı.' }
  if (gender && !CASE_GENDERS.some((g) => g.value === gender)) return { error: 'Geçersiz cinsiyet seçimi.' }
  if (sessionCount !== null && (!Number.isInteger(sessionCount) || sessionCount < 0 || sessionCount > 1000)) {
    return { error: 'Seans sayısı geçersiz.' }
  }

  // Etiket de taranır: psikologlar bazen etikete danışanın adını yazar
  const findings = unresolvedFindings(
    [...scanForPii(label), ...scanForPii(formulation), ...scanForPii(question)],
    dismissed
  )
  if (findings.length > 0) {
    return {
      error: 'Metinde kişiyi tanımlayabilecek ifadeler var. Düzelt ya da isim olmadığını onayla.',
      findings,
    }
  }

  return {
    value: {
      label,
      age_range: ageRange,
      gender,
      topic,
      session_count: sessionCount,
      formulation,
      question,
      consent_attested: body.consentAttested === true,
    },
  }
}
