import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getExpertIdFromRequest } from '@/lib/security/expert-session'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { PROFESSION_CONFIG, toProfession } from '@/lib/professions'
import { ROOM_CLOSE_AFTER_MINUTES, ROOM_OPEN_BEFORE_MINUTES } from './constants'

// Bu dosyadaki tablolar database.types.ts'te henüz yok (migration uygulanınca
// tipler yeniden üretilmeli). O zamana kadar sorgular gevşek tiplidir.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseClient = any

export function db(): LooseClient {
  return getSupabaseAdmin()
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

/** Uzman oturumu zorunlu. Başarılıysa expertId, değilse yanıt döner. */
export async function requireExpert(
  req: NextRequest,
  scope = 'supervision'
): Promise<{ expertId: string } | { response: NextResponse }> {
  const limited = applyRateLimit(req, { scope, limit: 60, windowMs: 60_000 })
  if (limited) return { response: limited }

  const expertId = await getExpertIdFromRequest(req)
  if (!expertId) return { response: jsonError('Oturum bulunamadı. Lütfen tekrar giriş yap.', 401) }

  // Süpervizyon modülü yalnızca psikologlara açık
  const { data: expert } = await getSupabaseAdmin().from('experts').select('profession').eq('id', expertId).maybeSingle()
  if (expert && !PROFESSION_CONFIG[toProfession(expert.profession)].supervision) {
    return { response: jsonError('Süpervizyon yalnızca psikologlar için açık.', 403) }
  }

  return { expertId }
}

export type SupervisorProfileRow = {
  id: string
  expert_id: string
  status: 'pending' | 'approved' | 'rejected' | 'paused'
  approaches: string[]
  focus_areas: string[]
  bio: string | null
  years_experience: number | null
  credentials: string | null
  session_price: number | null
  commission_rate: number
  intro_call_enabled: boolean
  availability_note: string | null
  admin_note: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export async function getOwnSupervisorProfile(expertId: string) {
  const { data } = await db()
    .from('supervisor_profiles')
    .select('*')
    .eq('expert_id', expertId)
    .maybeSingle()
  return (data as SupervisorProfileRow | null) || null
}

export type BookingRow = {
  id: string
  supervisor_profile_id: string
  supervisee_expert_id: string
  kind: 'intro' | 'individual'
  status: string
  requested_start: string
  duration_minutes: number
  price: number
  commission_rate: number
  commission_amount: number
  supervisor_amount: number
  request_note: string | null
  decline_reason: string | null
  iyzico_token: string | null
  iyzico_conversation_id: string | null
  payment_page_url: string | null
  paid_at: string | null
  room_name: string | null
  completed_at: string | null
  cancelled_by: string | null
  created_at: string
}

/** Kullanıcının bu randevudaki rolü; taraf değilse null */
export async function getBookingRole(bookingId: string, expertId: string) {
  const supabase = db()
  const { data: booking } = await supabase
    .from('supervision_bookings')
    .select('*, supervisor_profiles!inner(id, expert_id, approaches)')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking) return null

  const supervisorExpertId = booking.supervisor_profiles?.expert_id as string | undefined
  if (supervisorExpertId === expertId) return { role: 'supervisor' as const, booking: booking as BookingRow & { supervisor_profiles: { id: string; expert_id: string; approaches: string[] } } }
  if (booking.supervisee_expert_id === expertId) return { role: 'supervisee' as const, booking: booking as BookingRow & { supervisor_profiles: { id: string; expert_id: string; approaches: string[] } } }
  return null
}

export function computeSplit(price: number, rate: number) {
  const commission = Math.round(price * rate * 100) / 100
  return { commission, supervisorAmount: Math.round((price - commission) * 100) / 100 }
}

export function roomWindow(startIso: string, durationMinutes: number) {
  const start = new Date(startIso).getTime()
  return {
    opensAt: start - ROOM_OPEN_BEFORE_MINUTES * 60_000,
    closesAt: start + (durationMinutes + ROOM_CLOSE_AFTER_MINUTES) * 60_000,
  }
}

/** Karışması kolay karakterler olmadan 10 haneli doğrulama kodu */
export function generateVerificationCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(10)
  let code = ''
  for (const b of bytes) code += alphabet[b % alphabet.length]
  return `${code.slice(0, 5)}-${code.slice(5)}`
}

export async function logCaseAccess(entry: {
  actorType: 'supervisor' | 'supervisee' | 'admin'
  actorId: string | null
  caseId?: string | null
  bookingId?: string | null
  action: string
  reason?: string | null
}) {
  const { error } = await db().from('supervision_access_log').insert({
    actor_type: entry.actorType,
    actor_id: entry.actorId,
    case_id: entry.caseId || null,
    booking_id: entry.bookingId || null,
    action: entry.action,
    reason: entry.reason || null,
  })
  if (error) console.error('SUPERVISION_ACCESS_LOG_ERROR', error)
}

export function toText(value: unknown, max = 2000) {
  if (value === null || value === undefined) return ''
  return String(value).trim().slice(0, max)
}

export function toStringArray(value: unknown, allowed?: readonly string[], max = 12) {
  if (!Array.isArray(value)) return []
  const out = value
    .map((v) => toText(v, 80))
    .filter(Boolean)
    .filter((v) => (allowed ? allowed.includes(v) : true))
  return Array.from(new Set(out)).slice(0, max)
}
