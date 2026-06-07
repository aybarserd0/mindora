import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ExpertStatus = 'pending' | 'approved' | 'rejected' | 'passive' | 'review' | string

type ExpertRow = {
  id?: string | null
  slug?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  title?: string | null
  city?: string | null
  status?: ExpertStatus | null
  is_active?: boolean | null
  bio?: string | null
  public_bio?: string | null
  approach?: string | null
  specialties?: unknown
  focus_areas?: unknown
  education?: unknown
  certificates?: unknown
  experience_years?: number | string | null
  session_price?: number | string | null
  session_duration_minutes?: number | string | null
  profile_image_url?: string | null
  approved_at?: string | null
  created_at?: string | null
  updated_at?: string | null
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

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
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
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toText(item)).filter(Boolean)
      }
    } catch {
      // String CSV fallback.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'MN'
}

function normalizeStatus(status: unknown): ExpertStatus {
  const normalized = toText(status, 'pending').toLowerCase()

  if (['pending', 'approved', 'rejected', 'passive', 'review'].includes(normalized)) {
    return normalized
  }

  return normalized || 'pending'
}

function normalizeExpert(row: ExpertRow) {
  const name = toText(row.name, 'Mindora Uzmanı')
  const title = toText(row.title, 'Uzman')
  const status = normalizeStatus(row.status)
  const isActive = row.is_active !== false && status !== 'passive' && status !== 'rejected'
  const sessionDurationMinutes = toNumber(row.session_duration_minutes, 50)

  const internalProfile = {
    id: toText(row.id),
    slug: toText(row.slug),
    name,
    title,
    email: toText(row.email, null as unknown as string) || null,
    phone: toText(row.phone, null as unknown as string) || null,
    city: toText(row.city, 'Belirtilmedi'),
    status,
    accountStatus: isActive ? 'active' : 'passive',
    approvedAt: row.approved_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    specialties: normalizeStringArray(row.specialties),
    focusAreas: normalizeStringArray(row.focus_areas),
    education: normalizeStringArray(row.education),
    certificates: normalizeStringArray(row.certificates),
    experienceYears: toNumber(row.experience_years, 0),
    sessionPrice: toNumber(row.session_price, 0),
    sessionDurationMinutes,
    profileImageUrl: toText(row.profile_image_url, null as unknown as string) || null,
    bio: toText(row.bio),
    publicBio: toText(row.public_bio || row.bio),
    approach: toText(row.approach),
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
  }

  return {
    internalProfile,
    publicProfile,
  }
}

async function findExpert({ expertId, slug }: { expertId: string | null; slug: string | null }) {
  const supabase = getSupabaseAdmin()

  let query = (supabase as any)
    .from('experts')
    .select(
      [
        'id',
        'slug',
        'name',
        'email',
        'phone',
        'title',
        'city',
        'status',
        'is_active',
        'bio',
        'public_bio',
        'approach',
        'specialties',
        'focus_areas',
        'education',
        'certificates',
        'experience_years',
        'session_price',
        'session_duration_minutes',
        'profile_image_url',
        'approved_at',
        'created_at',
        'updated_at',
      ].join(', ')
    )
    .limit(1)

  if (expertId) {
    query = query.eq('id', expertId)
  } else if (slug) {
    query = query.eq('slug', slug)
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  return data as ExpertRow | null
}

export async function GET(req: NextRequest) {
  try {
    const expertIdParam = toText(req.nextUrl.searchParams.get('expertId'))
    const slugParam = toText(req.nextUrl.searchParams.get('slug')).toLowerCase()
    const modeParam = toText(req.nextUrl.searchParams.get('mode'), 'internal').toLowerCase()

    const expertId = expertIdParam && isValidUuid(expertIdParam) ? expertIdParam : null
    const slug = slugParam && isSafeSlug(slugParam) ? slugParam : null
    const mode = modeParam === 'public' ? 'public' : 'internal'

    if (expertIdParam && !expertId) {
      return jsonError('Geçerli expertId gerekli.', 400)
    }

    if (slugParam && !slug) {
      return jsonError('Geçerli slug gerekli.', 400)
    }

    const expert = await findExpert({ expertId, slug })

    if (!expert) {
      return jsonError('Uzman profili bulunamadı.', 404)
    }

    const normalized = normalizeExpert(expert)

    if (mode === 'public') {
      return jsonOk({ profile: normalized.publicProfile, mode })
    }

    return jsonOk({ profile: normalized.internalProfile, publicProfile: normalized.publicProfile, mode })
  } catch (error) {
    console.error('EXPERT_PROFILE_API_ERROR', error)

    return jsonError('Uzman profili alınamadı.', 500, error instanceof Error ? error.message : error)
  }
}
