/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase istemcisi yeni sütunlarla birlikte gevşek tipli kullanılıyor (mevcut rotalardaki gibi) */
import { DOCUMENT_KEYS, PROFESSION_CONFIG, toProfession } from '@/lib/professions'

export type VerificationRecord = {
  expert_id: string
  document_type: string
  status: string | null
  created_at: string
}

export type DocumentState = {
  key: string
  title: string
  status: 'missing' | 'pending' | 'approved' | 'rejected'
}

export type ExpertDocumentSummary = {
  /** Zorunlu belgelerin hepsi admin tarafından onaylandı */
  verified: boolean
  /** Zorunlu belgelerin hepsi yüklendi (bekleyen ya da onaylı) — admin incelemesine hazır */
  readyForReview: boolean
  /** Yüklenmemiş ya da reddedilmiş zorunlu belgeler */
  missing: DocumentState[]
  /** İncelenmeyi bekleyen zorunlu belgeler */
  pending: DocumentState[]
}

function normalizeStatus(value: string | null): DocumentState['status'] {
  const s = String(value || '').toLowerCase()
  if (s === 'approved' || s === 'pending' || s === 'rejected') return s
  return 'missing'
}

/** Her belge türü için en son yükleme geçerlidir. */
export function summarizeExpertDocuments(profession: unknown, records: VerificationRecord[]): ExpertDocumentSummary {
  const docs = PROFESSION_CONFIG[toProfession(profession)].documents
  const latest = new Map<string, VerificationRecord>()
  for (const r of records) {
    const current = latest.get(r.document_type)
    if (!current || r.created_at > current.created_at) latest.set(r.document_type, r)
  }

  const required: DocumentState[] = DOCUMENT_KEYS.filter((key) => docs[key].required).map((key) => ({
    key,
    title: docs[key].title,
    status: normalizeStatus(latest.get(key)?.status ?? null),
  }))

  const missing = required.filter((d) => d.status === 'missing' || d.status === 'rejected')
  const pending = required.filter((d) => d.status === 'pending')

  return {
    verified: required.every((d) => d.status === 'approved'),
    readyForReview: missing.length === 0,
    missing,
    pending,
  }
}

/** Birden çok uzmanın belge kayıtlarını tek sorguda getirir. */
export async function loadDocumentSummaries(supabase: any, experts: { id: string; profession: string | null }[]) {
  const result = new Map<string, ExpertDocumentSummary>()
  if (!experts.length) return result

  const { data } = await supabase
    .from('expert_verifications')
    .select('expert_id, document_type, status, created_at')
    .in('expert_id', experts.map((e) => e.id))
    .limit(10000)

  const byExpert = new Map<string, VerificationRecord[]>()
  for (const row of (data || []) as VerificationRecord[]) {
    const list = byExpert.get(row.expert_id) ?? []
    list.push(row)
    byExpert.set(row.expert_id, list)
  }

  for (const expert of experts) {
    result.set(expert.id, summarizeExpertDocuments(expert.profession, byExpert.get(expert.id) ?? []))
  }
  return result
}
