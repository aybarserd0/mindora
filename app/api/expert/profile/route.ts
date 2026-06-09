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

const ROUTE_VERSION = 'expert-profile-schema-safe-v4-filter-existing-columns'

const REVIEW_REQUIRED_KEYS = new Set([
  'title',
  'specialties',
  'focus_areas',
  'education',
  'certificates',
  'bio',
  'public_bio',
  'therapy_approach',
  'profile_image_url',
])

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

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
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

function uniqueCleanList(value: unknown, maxItems = 30) {
  const seen = new Set<string>()

  return normalizeStringArray(value)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase('tr-TR')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, maxItems)
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
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
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
    experienceYears: toNumber(
      pick(row, ['experience_years', 'experienceYears', 'years_of_experience']),
      0
    ),
    sessionPrice: toNumber(pick(row, ['session_price', 'price', 'session_fee']), 0),
    sessionDurationMinutes,
    profileImageUrl: toNullableText(pick(row, ['profile_image_url', 'avatar_url', 'image_url'])),
    bio: toText(pick(row, ['bio', 'internal_bio', 'about'])),
    publicBio: toText(pick(row, ['public_bio', 'bio', 'about'])),
    approach: toText(pick(row, ['therapy_approach', 'approach'])),
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
    publicBio: internalProfile.publicBio,
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
  } else if (
    process.env.NEXT_PUBLIC_MINDORA_DEV_EXPERT_ID &&
    isValidUuid(process.env.NEXT_PUBLIC_MINDORA_DEV_EXPERT_ID)
  ) {
    query = query.eq('id', process.env.NEXT_PUBLIC_MINDORA_DEV_EXPERT_ID)
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  return (data || null) as UnknownRecord | null
}

function validatePatchPayload(body: UnknownRecord) {
  const name = toText(body.name)
  const title = toText(body.title)

  if (!name) return 'Ad soyad alanı zorunludur.'
  if (!title) return 'Unvan alanı zorunludur.'

  const experienceYears = toNullableNumber(body.experienceYears ?? body.experience_years)
  if (
    (body.experienceYears !== undefined || body.experience_years !== undefined) &&
    (experienceYears === null || experienceYears < 0 || experienceYears > 80)
  ) {
    return 'Deneyim yılı 0 ile 80 arasında olmalıdır.'
  }

  const sessionPrice = toNullableNumber(body.sessionPrice ?? body.session_price)
  if (
    (body.sessionPrice !== undefined || body.session_price !== undefined) &&
    (sessionPrice === null || sessionPrice < 0 || sessionPrice > 100000)
  ) {
    return 'Seans ücreti geçerli bir tutar olmalıdır.'
  }

  const publicBio = toText(body.publicBio ?? body.public_bio)
  if (publicBio.length > 1200) return 'Kısa tanıtım metni en fazla 1200 karakter olabilir.'

  const approach = toText(body.approach ?? body.therapy_approach)
  if (approach.length > 1600) return 'Çalışma yaklaşımı en fazla 1600 karakter olabilir.'

  const profileImageUrl = toText(body.profileImageUrl ?? body.profile_image_url)
  if (profileImageUrl && !/^https?:\/\/.+/i.test(profileImageUrl)) {
    return 'Profil fotoğrafı için geçerli bir URL kullanılmalıdır.'
  }

  return ''
}

function buildPatchUpdate(body: UnknownRecord) {
  const publicBio = toNullableText(body.publicBio ?? body.public_bio ?? body.bio)
  const update: UnknownRecord = {
    name: toText(body.name),
    full_name: toText(body.name),
    title: toText(body.title),
    phone: toNullableText(body.phone),
    city: toText(body.city, 'Belirtilmedi'),
    specialties: uniqueCleanList(body.specialties),
    focus_areas: uniqueCleanList(body.focusAreas ?? body.focus_areas),
    experience_years: toNullableNumber(body.experienceYears ?? body.experience_years) ?? 0,
    session_price: toNullableNumber(body.sessionPrice ?? body.session_price) ?? 0,
    public_bio: publicBio || '',
    bio: toNullableText(body.bio) || publicBio || '',
    therapy_approach: toNullableText(body.approach ?? body.therapy_approach) || '',
    education: uniqueCleanList(body.education),
    certificates: uniqueCleanList(body.certificates),
    profile_image_url: toNullableText(body.profileImageUrl ?? body.profile_image_url),
    updated_at: new Date().toISOString(),
  }

  delete update.approach

  return update
}

function filterUpdateByExistingColumns(update: UnknownRecord, currentExpert: UnknownRecord) {
  const filtered: UnknownRecord = {}
  const skippedColumns: string[] = []

  for (const [key, value] of Object.entries(update)) {
    if (key === 'approach') {
      skippedColumns.push(key)
      continue
    }

    if (Object.prototype.hasOwnProperty.call(currentExpert, key)) {
      filtered[key] = value
    } else {
      skippedColumns.push(key)
    }
  }

  return { filtered, skippedColumns }
}

function hasReviewRequiredChange(current: UnknownRecord, update: UnknownRecord) {
  return Object.entries(update).some(([key, value]) => {
    if (!REVIEW_REQUIRED_KEYS.has(key)) return false

    const currentValue = current[key]

    if (Array.isArray(value) || Array.isArray(currentValue)) {
      return JSON.stringify(normalizeStringArray(currentValue)) !== JSON.stringify(normalizeStringArray(value))
    }

    return toText(currentValue) !== toText(value)
  })
}

function getMissingColumnFromError(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : ''

  const match = message.match(/Could not find the '([^']+)' column/i)
  return match?.[1] || null
}

async function updateExpertWithSchemaFallback({
  supabase,
  expertId,
  update,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  expertId: unknown
  update: UnknownRecord
}) {
  const safeUpdate: UnknownRecord = { ...update }
  const removedColumns: string[] = []

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await (supabase as any)
      .from('experts')
      .update(safeUpdate)
      .eq('id', expertId)
      .select('*')
      .single()

    if (!error) {
      return {
        data: data as UnknownRecord,
        removedColumns,
      }
    }

    const missingColumn = getMissingColumnFromError(error)

    if (missingColumn && Object.prototype.hasOwnProperty.call(safeUpdate, missingColumn)) {
      delete safeUpdate[missingColumn]
      removedColumns.push(missingColumn)
      continue
    }

    throw error
  }

  throw new Error('Profil güncellemesi tablo şemasıyla eşleştirilemedi.')
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
      return jsonOk({ profile: normalized.publicProfile, mode, routeVersion: ROUTE_VERSION })
    }

    return jsonOk({
      profile: normalized.internalProfile,
      publicProfile: normalized.publicProfile,
      mode,
      routeVersion: ROUTE_VERSION,
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

export async function PATCH(req: NextRequest) {
  try {
    const expertIdParam = toText(req.nextUrl.searchParams.get('expertId'))
    const expertId = expertIdParam && isValidUuid(expertIdParam) ? expertIdParam : null

    if (expertIdParam && !expertId) {
      return jsonError('Geçerli uzman kimliği gerekli.', 400)
    }

    const body = (await req.json().catch(() => ({}))) as UnknownRecord
    const validationError = validatePatchPayload(body)

    if (validationError) {
      return jsonError(validationError, 422)
    }

    const currentExpert = await findExpert({ expertId, slug: null })

    if (!currentExpert) {
      return jsonError('Uzman profili bulunamadı.', 404)
    }

    const rawUpdate = buildPatchUpdate(body)
    delete rawUpdate.approach

    const { filtered: update, skippedColumns } = filterUpdateByExistingColumns(rawUpdate, currentExpert)

    if (Object.keys(update).length === 0) {
      return jsonError('Güncellenecek geçerli profil alanı bulunamadı.', 422, {
        skippedColumns,
        routeVersion: ROUTE_VERSION,
      })
    }

    const pendingReview = hasReviewRequiredChange(currentExpert, update)
    const currentStatus = normalizeStatus(pick(currentExpert, ['status', 'profile_status'], 'pending'))

    if (
      pendingReview &&
      currentStatus === 'approved' &&
      Object.prototype.hasOwnProperty.call(currentExpert, 'status')
    ) {
      update.status = 'review'
    }

    const supabase = getSupabaseAdmin()

    const { data, removedColumns } = await updateExpertWithSchemaFallback({
      supabase,
      expertId: currentExpert.id,
      update,
    })

    const normalized = normalizeExpert((data || currentExpert) as UnknownRecord)

    return jsonOk({
      profile: normalized.internalProfile,
      publicProfile: normalized.publicProfile,
      pendingReview,
      skippedColumns: [...skippedColumns, ...removedColumns],
      routeVersion: ROUTE_VERSION,
      message: pendingReview
        ? 'Profil güncellendi. Kritik alanlar admin incelemesine alındı.'
        : 'Profil bilgileriniz başarıyla güncellendi.',
    })
  } catch (error) {
    console.error('EXPERT_PROFILE_PATCH_API_ERROR', {
      routeVersion: ROUTE_VERSION,
      error,
    })

    return jsonError(
      'Profil güncellenemedi.',
      500,
      error instanceof Error ? error.message : error
    )
  }
}
