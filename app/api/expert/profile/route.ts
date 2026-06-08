import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ExpertStatus = 'pending' | 'approved' | 'rejected' | 'passive' | 'review' | string

type UnknownRecord = Record<string, unknown>

type NormalizedExpert = {
  id: string
  slug: string
  name: string
  title: string
  email: string | null
  phone: string | null
  city: string
  status: ExpertStatus
  accountStatus: 'active' | 'passive'
  approvedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  specialties: string[]
  focusAreas: string[]
  education: string[]
  certificates: string[]
  experienceYears: number
  sessionPrice: number
  sessionDurationMinutes: number
  profileImageUrl: string | null
  bio: string
  publicBio: string
  approach: string
  totalClients: number
  completedSessions: number
  averageRating: number | null
  totalEarnings: number
}

function jsonOk(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...payload }, { status })
}

function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
    },
    { status }
  )
}

function toText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function toNullableText(value: unknown) {
  const text = toText(value)
  return text || null
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function isSafeSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value.trim())
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toText(item)).filter(Boolean)
      }
    } catch {
      // CSV fallback.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function pick(row: UnknownRecord, keys: string[], fallback: unknown = '') {
  for (const key of keys) {
    const value = row[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') return value
  }

  return fallback
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'M'
}

function normalizeStatus(status: unknown): ExpertStatus {
  const normalized = toText(status, 'pending').toLowerCase()

  if (['pending', 'approved', 'rejected', 'passive', 'review'].includes(normalized)) {
    return normalized
  }

  return normalized || 'pending'
}

function statusLabel(status: ExpertStatus) {
  switch (status) {
    case 'approved':
      return 'Onaylandı'
    case 'rejected':
      return 'Reddedildi'
    case 'passive':
      return 'Pasif'
    case 'review':
      return 'İncelemede'
    case 'pending':
    default:
      return 'İncelemede'
  }
}

function normalizeExpert(row: UnknownRecord) {
  const name = toText(pick(row, ['name', 'full_name', 'display_name'], 'Mindora Uzmanı'))
  const title = toText(pick(row, ['title', 'profession', 'expert_title'], 'Uzman'))
  const status = normalizeStatus(pick(row, ['status', 'profile_status'], 'pending'))
  const isActive = row.is_active !== false && status !== 'passive' && status !== 'rejected'
  const sessionDurationMinutes = toNumber(
    pick(row, ['session_duration_minutes', 'session_duration', 'duration_minutes'], 50),
    50
  )

  const internalProfile: NormalizedExpert = {
    id: toText(pick(row, ['id'])),
    slug: toText(pick(row, ['slug', 'public_slug'])),
    name,
    title,
    email: toNullableText(pick(row, ['email', 'contact_email'])),
    phone: toNullableText(pick(row, ['phone', 'phone_number', 'contact_phone'])),
    city: toText(pick(row, ['city', 'location'], 'Belirtilmedi')),
    status,
    accountStatus: isActive ? 'active' : 'passive',
    approvedAt: toNullableText(pick(row, ['approved_at'])),
    createdAt: toNullableText(pick(row, ['created_at'])),
    updatedAt: toNullableText(pick(row, ['updated_at'])),
    specialties: normalizeStringArray(pick(row, ['specialties', 'specialty', 'areas'])),
    focusAreas: normalizeStringArray(pick(row, ['focus_areas', 'focusAreas', 'working_areas'])),
    education: normalizeStringArray(pick(row, ['education', 'educations'])),
    certificates: normalizeStringArray(pick(row, ['certificates', 'certificate'])),
    experienceYears: toNumber(pick(row, ['experience_years', 'experienceYears', 'years_of_experience']), 0),
    sessionPrice: toNumber(pick(row, ['session_price', 'price', 'session_fee']), 0),
    sessionDurationMinutes,
    profileImageUrl: toNullableText(pick(row, ['profile_image_url', 'avatar_url', 'image_url'])),
    bio: toText(pick(row, ['bio', 'internal_bio', 'about'])),
    publicBio: toText(pick(row, ['public_bio', 'bio', 'about'])),
    approach: toText(pick(row, ['approach', 'therapy_approach'])),
    totalClients: 0,
    completedSessions: 0,
    averageRating: null,
    totalEarnings: 0,
  }

  const publicProfile = {
    id: internalProfile.id,
    slug: internalProfile.slug,
    name: internalProfile.name,
    title: internalProfile.title,
    city: internalProfile.city,
    imageInitials: getInitials(internalProfile.name),
    profileImageUrl: internalProfile.profileImageUrl,
    specialties: internalProfile.specialties,
    focusAreas: internalProfile.focusAreas,
    education: internalProfile.education,
    certificates: internalProfile.certificates,
    experienceYears: internalProfile.experienceYears,
    sessionPrice: internalProfile.sessionPrice,
    sessionDuration: `${internalProfile.sessionDurationMinutes} dk`,
    bio: internalProfile.publicBio,
    approach: internalProfile.approach,
    isAvailableThisWeek: false,
    nextAvailableSlot: null,
    statusLabel: statusLabel(internalProfile.status),
  }

  return { internalProfile, publicProfile }
}

async function findExpert({ expertId, slug }: { expertId: string | null; slug: string | null }) {
  const supabase = getSupabaseAdmin() as any

  let query = supabase.from('experts').select('*').limit(1)

  if (expertId) {
    query = query.eq('id', expertId)
  } else if (slug) {
    query = query.eq('slug', slug)
  } else if (process.env.MINDORA_DEV_EXPERT_ID && isValidUuid(process.env.MINDORA_DEV_EXPERT_ID)) {
    query = query.eq('id', process.env.MINDORA_DEV_EXPERT_ID)
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  return (data || null) as UnknownRecord | null
}

export async function GET(req: NextRequest) {
  try {
    const expertIdParam = toText(req.nextUrl.searchParams.get('expertId'))
    const slugParam = toText(req.nextUrl.searchParams.get('slug')).toLowerCase()
    const modeParam = toText(
      req.nextUrl.searchParams.get('mode') || req.nextUrl.searchParams.get('scope'),
      'internal'
    ).toLowerCase()

    const expertId = expertIdParam && isValidUuid(expertIdParam) ? expertIdParam : null
    const slug = slugParam && isSafeSlug(slugParam) ? slugParam : null
    const mode = modeParam === 'public' ? 'public' : 'internal'

    if (expertIdParam && !expertId) {
      return jsonError('Geçerli uzman kimliği gerekli.', 400)
    }

    if (slugParam && !slug) {
      return jsonError('Geçerli profil bağlantısı gerekli.', 400)
    }

    const expert = await findExpert({ expertId, slug })

    if (!expert) {
      return jsonError('Uzman profili bulunamadı.', 404)
    }

    const normalized = normalizeExpert(expert)

    if (mode === 'public') {
      return jsonOk({ profile: normalized.publicProfile, mode })
    }

    return jsonOk({
      profile: normalized.internalProfile,
      publicProfile: normalized.publicProfile,
      mode,
    })
  } catch (error) {
    console.error('EXPERT_PROFILE_API_ERROR', error)

    return jsonError(
      'Uzman profili şu anda alınamadı.',
      500,
      error instanceof Error ? error.message : error
    )
  }
}
