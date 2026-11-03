/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase istemcisi yeni sütunlarla birlikte gevşek tipli kullanılıyor (mevcut rotalardaki gibi) */
import { scoreExpertMatch } from '@/lib/matching/score-expert-match'
import { performMatch, type PerformMatchResult } from '@/lib/matching/perform-match'
import { toProfession } from '@/lib/professions'
import { loadDocumentSummaries } from '@/lib/automation/verification'

/** Kapatmak için false yap: başvurular yine kaydedilir, eşleşmeyi admin elle yapar. */
export const AUTO_MATCH_ENABLED = true

/** Bir uzmana aynı anda en fazla bu kadar açık danışan otomatik verilir. */
export const MAX_ACTIVE_CLIENTS = 15

const LOAD_PENALTY_PER_CLIENT = 2
const RATING_MIN_REVIEWS = 3

export type AutoMatchClient = {
  topic: string | null
  availability: string | null
  preference: string | null
  profession: string | null
}

export type AutoMatchCandidate = {
  id: string
  profession: string | null
  areas: string | null
  availability: string | null
  experience: string | null
  gender: string | null
  session_price: number | null
  average_rating: number | null
  review_count: number | null
  /** Takviminde en az bir açık gün var mı */
  hasSchedule: boolean
  /** Zorunlu belgelerinin hepsi admin tarafından onaylandı mı */
  documentsVerified: boolean
  /** Şu an açık (kilitli ya da aktif) konuşma sayısı */
  activeClients: number
}

export type RankedCandidate = {
  expertId: string
  score: number
  reasons: string[]
}

export type SkipReason = 'profession' | 'documents' | 'price' | 'schedule' | 'gender' | 'capacity'

/** "Kadın psikolog" → kadin, "Erkek diyetisyen" → erkek, "Fark etmez" → null */
export function genderPreference(preference: string | null | undefined): 'kadin' | 'erkek' | null {
  const p = String(preference || '').toLocaleLowerCase('tr-TR')
  if (p.startsWith('kadın')) return 'kadin'
  if (p.startsWith('erkek')) return 'erkek'
  return null
}

/** Uzman bu danışana otomatik önerilebilir mi; değilse neden? */
export function eligibility(client: AutoMatchClient, expert: AutoMatchCandidate): SkipReason | null {
  if (toProfession(expert.profession) !== toProfession(client.profession)) return 'profession'
  // Belgeleri doğrulanmamış uzmana otomatik danışan gitmez
  if (!expert.documentsVerified) return 'documents'
  if (!expert.session_price || expert.session_price <= 0) return 'price'
  if (!expert.hasSchedule) return 'schedule'
  const wanted = genderPreference(client.preference)
  // Cinsiyet tercihi varsa yalnızca cinsiyeti bilinen ve uyan uzman önerilir
  if (wanted && expert.gender !== wanted) return 'gender'
  if (expert.activeClients >= MAX_ACTIVE_CLIENTS) return 'capacity'
  return null
}

/**
 * Uygun uzmanları puana göre sıralar. Puan: konu + müsaitlik + deneyim
 * (admin ekranındaki puanla aynı), artı yorum ortalaması, eksi mevcut yük.
 * Eşitlikte daha az danışanı olan öne geçer; böylece iş dengeli dağılır.
 */
export function rankCandidates(client: AutoMatchClient, candidates: AutoMatchCandidate[]): RankedCandidate[] {
  return candidates
    .filter((expert) => eligibility(client, expert) === null)
    .map((expert) => {
      const base = scoreExpertMatch(
        { topic: client.topic, availability: client.availability },
        { areas: expert.areas, availability: expert.availability, experience: expert.experience }
      )
      const reasons = [...base.reasons]
      let score = base.score

      if ((expert.review_count ?? 0) >= RATING_MIN_REVIEWS && expert.average_rating) {
        const bonus = Math.round(Math.max(0, expert.average_rating - 3) * 5)
        if (bonus > 0) {
          score += bonus
          reasons.push(`Yorum ortalaması ${expert.average_rating.toFixed(1)}`)
        }
      }

      if (expert.activeClients > 0) {
        score -= expert.activeClients * LOAD_PENALTY_PER_CLIENT
        reasons.push(`${expert.activeClients} açık danışan`)
      }

      return { expertId: expert.id, score, reasons, load: expert.activeClients }
    })
    .sort((a, b) => b.score - a.score || a.load - b.load || a.expertId.localeCompare(b.expertId))
    .map(({ expertId, score, reasons }) => ({ expertId, score, reasons }))
}

export type AutoMatchOutcome =
  | { matched: true; expertId: string; result: PerformMatchResult }
  | { matched: false; reason: 'disabled' | 'not_found' | 'already_matched' | 'no_candidate' | 'match_failed'; detail?: string }

/**
 * Başvuruyu en uygun uzmanla eşleştirir ve danışana doğrudan gönderir.
 * Uygun uzman yoksa başvuru "yeni" kalır; admin özeti ve günlük görev yeniden dener.
 */
export async function autoMatchApplication(supabase: any, applicationId: string): Promise<AutoMatchOutcome> {
  if (!AUTO_MATCH_ENABLED) return { matched: false, reason: 'disabled' }

  const { data: app } = await supabase
    .from('client_applications')
    .select('id, topic, availability, preference, profession, status, matched_expert_id')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) return { matched: false, reason: 'not_found' }
  if (app.matched_expert_id || app.status !== 'new') return { matched: false, reason: 'already_matched' }

  await supabase.from('client_applications').update({ auto_match_attempted_at: new Date().toISOString() }).eq('id', applicationId)

  const candidates = await loadCandidates(supabase, toProfession(app.profession))
  const ranked = rankCandidates(app, candidates)

  // En iyi aday bir sebeple eşleşemezse sıradakini dene
  for (const pick of ranked.slice(0, 3)) {
    const result = await performMatch({ supabase, clientId: applicationId, expertId: pick.expertId, source: 'auto' })
    if (result.ok) return { matched: true, expertId: pick.expertId, result }
    console.error('AUTO_MATCH_PERFORM_ERROR', pick.expertId, result.error)
  }

  return ranked.length ? { matched: false, reason: 'match_failed' } : { matched: false, reason: 'no_candidate' }
}

export async function loadCandidates(supabase: any, profession: string): Promise<AutoMatchCandidate[]> {
  const { data: experts, error } = await supabase
    .from('experts')
    .select('id, profession, areas, availability, experience, gender, session_price, average_rating, review_count')
    .eq('status', 'approved')
    .eq('profession', profession)
    .neq('account_type', 'supervision_only')
    .limit(500)

  if (error || !experts?.length) return []

  const ids = experts.map((e: { id: string }) => e.id)
  const [{ data: schedules }, { data: conversations }] = await Promise.all([
    supabase.from('expert_availability').select('expert_id').eq('is_active', true).in('expert_id', ids),
    supabase.from('conversations').select('expert_id').in('status', ['locked', 'active']).in('expert_id', ids),
  ])

  const withSchedule = new Set((schedules || []).map((r: { expert_id: string }) => r.expert_id))
  const documents = await loadDocumentSummaries(supabase, experts)
  const load = new Map<string, number>()
  for (const c of conversations || []) load.set(c.expert_id, (load.get(c.expert_id) || 0) + 1)

  return experts.map((e: any) => ({
    ...e,
    session_price: e.session_price === null ? null : Number(e.session_price),
    average_rating: e.average_rating === null ? null : Number(e.average_rating),
    hasSchedule: withSchedule.has(e.id),
    documentsVerified: documents.get(e.id)?.verified ?? false,
    activeClients: load.get(e.id) || 0,
  }))
}
