/**
 * Scores how well an approved expert fits a client's intake form, so the
 * admin match dropdown can be ranked instead of a plain alphabetical list.
 *
 * The client (`/eslesme`) and expert (`/uzman-basvuru`) intake forms share
 * a controlled vocabulary for "topic" / "areas" and for "availability" —
 * both are checkbox/select lists joined into a single comma-separated
 * string before being stored (see `app/api/eslesme/route.ts` and
 * `app/api/uzman-basvuru/route.ts`). That shared vocabulary is what makes a
 * real (if simple) score possible without any new data collection.
 *
 * This is intentionally not a black box: every point awarded has a matching
 * human-readable reason, since the admin should be able to see *why* the
 * engine suggested someone before assigning a real client to them.
 */

export type MatchableClient = {
  topic: string | null
  availability: string | null
}

export type MatchableExpert = {
  areas: string | null
  availability: string | null
  experience: string | null
}

export type ExpertMatchScore = {
  score: number
  topicMatch: boolean
  availabilityOverlap: number
  reasons: string[]
}

const TOPIC_WEIGHT = 55
const AVAILABILITY_WEIGHT = 30
const EXPERIENCE_WEIGHT = 15
const MAX_EXPERIENCE_YEARS = 10

function parseList(value: string | null | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR').trim()
}

function isFlexibleSlot(value: string) {
  return normalize(value).startsWith('esnek')
}

function parseExperienceYears(value: string | null | undefined) {
  const match = String(value || '').match(/\d+/)
  if (!match) return 0
  return Number(match[0]) || 0
}

/**
 * Availability overlap, treating either side's "esnek / ..." option as a
 * wildcard that matches any slot (the two forms word it slightly
 * differently — "Esnek / fark etmez" vs "Esnek / değişken" — so this
 * compares by meaning, not literal string equality).
 */
function scoreAvailability(clientSlots: string[], expertSlots: string[]) {
  if (clientSlots.length === 0 || expertSlots.length === 0) {
    return { overlap: 0, ratio: 0 }
  }

  const expertHasWildcard = expertSlots.some(isFlexibleSlot)
  const clientHasWildcard = clientSlots.some(isFlexibleSlot)

  if (expertHasWildcard || clientHasWildcard) {
    return { overlap: clientSlots.length, ratio: 1 }
  }

  const normalizedExpertSlots = new Set(expertSlots.map(normalize))
  const overlap = clientSlots.filter((slot) => normalizedExpertSlots.has(normalize(slot))).length

  return { overlap, ratio: overlap / clientSlots.length }
}

export function scoreExpertMatch(client: MatchableClient, expert: MatchableExpert): ExpertMatchScore {
  const reasons: string[] = []
  let score = 0

  const clientTopic = (client.topic || '').trim()
  const expertAreas = parseList(expert.areas)

  const topicMatch =
    Boolean(clientTopic) &&
    normalize(clientTopic) !== normalize('Diğer') &&
    expertAreas.some((area) => normalize(area) === normalize(clientTopic))

  if (topicMatch) {
    score += TOPIC_WEIGHT
    reasons.push(`Konu eşleşiyor: ${clientTopic}`)
  }

  const clientSlots = parseList(client.availability)
  const expertSlots = parseList(expert.availability)
  const { overlap, ratio } = scoreAvailability(clientSlots, expertSlots)

  if (overlap > 0) {
    score += Math.round(AVAILABILITY_WEIGHT * ratio)

    reasons.push(
      ratio >= 1
        ? 'Müsaitlik tamamen örtüşüyor'
        : `Müsaitlik kısmen örtüşüyor (${overlap}/${clientSlots.length})`
    )
  }

  const experienceYears = parseExperienceYears(expert.experience)

  if (experienceYears > 0) {
    const experienceScore = Math.round(
      (Math.min(experienceYears, MAX_EXPERIENCE_YEARS) / MAX_EXPERIENCE_YEARS) * EXPERIENCE_WEIGHT
    )
    score += experienceScore
    reasons.push(`${experienceYears} yıl deneyim`)
  }

  return {
    score: Math.min(100, score),
    topicMatch,
    availabilityOverlap: overlap,
    reasons,
  }
}
