import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getExpertIdFromRequest as getSessionExpertId } from '@/lib/security/expert-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AvailabilityPayload = {
  id?: unknown
  expertId?: unknown
  dayOfWeek?: unknown
  startTime?: unknown
  endTime?: unknown
  slotDurationMinutes?: unknown
  bufferMinutes?: unknown
  timezone?: unknown
  isActive?: unknown
}

type AvailabilityRow = {
  id?: string | null
  expert_id?: string | null
  day_of_week?: number | null
  start_time?: string | null
  end_time?: string | null
  slot_duration_minutes?: number | null
  buffer_minutes?: number | null
  timezone?: string | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

type AvailabilityInput = {
  expertId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
  bufferMinutes: number
  timezone: string
  isActive: boolean
}

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const DEFAULT_SLOT_DURATION_MINUTES = 50
const DEFAULT_BUFFER_MINUTES = 10
const MIN_SLOT_DURATION_MINUTES = 15
const MAX_SLOT_DURATION_MINUTES = 180
const MAX_BUFFER_MINUTES = 60

function jsonOk(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...payload }, { status })
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function parseBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return fallback
}

function parseInteger(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isInteger(parsed)) return parsed
  }

  return fallback
}

function parseDayOfWeek(value: unknown): number | null {
  const parsed = parseInteger(value, Number.NaN)

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    return null
  }

  return parsed
}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value.trim())
  )
}

function normalizeTime(value: string) {
  const trimmed = value.trim()
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed
}

function normalizeTimezone(value: unknown) {
  const timezone = toText(value)
  return timezone || DEFAULT_TIMEZONE
}

function normalizeAvailabilityRow(row: AvailabilityRow) {
  return {
    id: row.id || '',
    expertId: row.expert_id || null,
    dayOfWeek: typeof row.day_of_week === 'number' ? row.day_of_week : null,
    startTime: row.start_time || null,
    endTime: row.end_time || null,
    slotDurationMinutes:
      typeof row.slot_duration_minutes === 'number'
        ? row.slot_duration_minutes
        : DEFAULT_SLOT_DURATION_MINUTES,
    bufferMinutes:
      typeof row.buffer_minutes === 'number' ? row.buffer_minutes : DEFAULT_BUFFER_MINUTES,
    timezone: row.timezone || DEFAULT_TIMEZONE,
    isActive: row.is_active !== false,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

async function getExpertIdFromRequest(req: NextRequest) {
  return getSessionExpertId(req)
}

async function validateAvailabilityInput(
  req: NextRequest,
  body: AvailabilityPayload
): Promise<
  | { ok: true; value: AvailabilityInput }
  | { ok: false; error: string; status: number }
> {
  const expertId = await getExpertIdFromRequest(req)

  if (!expertId) {
    return { ok: false, error: 'Geçerli uzman kimliği gerekli.', status: 400 }
  }

  const dayOfWeek = parseDayOfWeek(body.dayOfWeek)

  if (dayOfWeek === null) {
    return { ok: false, error: 'Gün değeri 0-6 arasında olmalı.', status: 400 }
  }

  if (!isValidTime(body.startTime) || !isValidTime(body.endTime)) {
    return { ok: false, error: 'Geçerli başlangıç ve bitiş saati gerekli.', status: 400 }
  }

  const startTime = normalizeTime(body.startTime)
  const endTime = normalizeTime(body.endTime)

  if (startTime >= endTime) {
    return { ok: false, error: 'Başlangıç saati bitiş saatinden önce olmalı.', status: 400 }
  }

  const slotDurationMinutes = parseInteger(
    body.slotDurationMinutes,
    DEFAULT_SLOT_DURATION_MINUTES
  )

  if (
    slotDurationMinutes < MIN_SLOT_DURATION_MINUTES ||
    slotDurationMinutes > MAX_SLOT_DURATION_MINUTES
  ) {
    return {
      ok: false,
      error: 'Seans süresi 15-180 dakika arasında olmalı.',
      status: 400,
    }
  }

  const bufferMinutes = parseInteger(body.bufferMinutes, DEFAULT_BUFFER_MINUTES)

  if (bufferMinutes < 0 || bufferMinutes > MAX_BUFFER_MINUTES) {
    return { ok: false, error: 'Ara süresi 0-60 dakika arasında olmalı.', status: 400 }
  }

  return {
    ok: true,
    value: {
      expertId,
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      bufferMinutes,
      timezone: normalizeTimezone(body.timezone),
      isActive: parseBoolean(body.isActive, true),
    },
  }
}

function hasTimeOverlap({
  rows,
  startTime,
  endTime,
  ignoredId,
}: {
  rows: AvailabilityRow[]
  startTime: string
  endTime: string
  ignoredId?: string | null
}) {
  return rows.some((row) => {
    if (ignoredId && row.id === ignoredId) return false
    if (row.is_active === false) return false
    if (!row.start_time || !row.end_time) return false

    return startTime < row.end_time && endTime > row.start_time
  })
}

async function checkOverlap({
  expertId,
  dayOfWeek,
  startTime,
  endTime,
  ignoredId,
}: {
  expertId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  ignoredId?: string | null
}) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('expert_availability' as never)
    .select('id,start_time,end_time,is_active')
    .eq('expert_id', expertId as never)
    .eq('day_of_week', dayOfWeek as never)
    .eq('is_active', true as never)

  if (error) {
    throw error
  }

  return hasTimeOverlap({
    rows: (data || []) as unknown as AvailabilityRow[],
    startTime,
    endTime,
    ignoredId,
  })
}

export async function GET(req: NextRequest) {
  try {
    const expertId = await getExpertIdFromRequest(req)

    if (!expertId) {
      return jsonError('Geçerli uzman kimliği gerekli.', 400)
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('expert_availability' as never)
      .select('*')
      .eq('expert_id', expertId as never)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('EXPERT_AVAILABILITY_GET_ERROR', error)
      return jsonError('Müsaitlik bilgileri alınamadı.', 500)
    }

    const availability = ((data || []) as unknown as AvailabilityRow[]).map(
      normalizeAvailabilityRow
    )

    return jsonOk({
      expertId,
      availability,
    })
  } catch (error) {
    console.error('EXPERT_AVAILABILITY_GET_RUNTIME_ERROR', error)
    return jsonError('Müsaitlik bilgileri alınamadı.', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as AvailabilityPayload | null

    if (!body || typeof body !== 'object') {
      return jsonError('Geçerli form bilgisi gerekli.', 400)
    }

    const parsed = await validateAvailabilityInput(req, body)

    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status)
    }

    const input = parsed.value

    const overlap = await checkOverlap({
      expertId: input.expertId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    })

    if (overlap) {
      return jsonError(
        'Bu gün için seçilen saat aralığı mevcut bir müsaitlik aralığıyla çakışıyor.',
        409
      )
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('expert_availability' as never)
      .insert({
        expert_id: input.expertId,
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        slot_duration_minutes: input.slotDurationMinutes,
        buffer_minutes: input.bufferMinutes,
        timezone: input.timezone,
        is_active: input.isActive,
      } as never)
      .select('*')
      .single()

    if (error) {
      console.error('EXPERT_AVAILABILITY_POST_ERROR', error)
      return jsonError('Müsaitlik kaydedilemedi.', 500)
    }

    return jsonOk({
      availability: normalizeAvailabilityRow(data as unknown as AvailabilityRow),
    })
  } catch (error) {
    console.error('EXPERT_AVAILABILITY_POST_RUNTIME_ERROR', error)
    return jsonError('Müsaitlik kaydedilemedi.', 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as AvailabilityPayload | null

    if (!body || typeof body !== 'object') {
      return jsonError('Geçerli form bilgisi gerekli.', 400)
    }

    const id = toText(body.id)

    if (!isValidUuid(id)) {
      return jsonError('Geçerli müsaitlik kaydı gerekli.', 400)
    }

    const parsed = await validateAvailabilityInput(req, body)

    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status)
    }

    const input = parsed.value

    const overlap = await checkOverlap({
      expertId: input.expertId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      ignoredId: id,
    })

    if (overlap) {
      return jsonError(
        'Bu gün için seçilen saat aralığı mevcut bir müsaitlik aralığıyla çakışıyor.',
        409
      )
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('expert_availability' as never)
      .update({
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        slot_duration_minutes: input.slotDurationMinutes,
        buffer_minutes: input.bufferMinutes,
        timezone: input.timezone,
        is_active: input.isActive,
      } as never)
      .eq('id', id as never)
      .eq('expert_id', input.expertId as never)
      .select('*')
      .single()

    if (error) {
      console.error('EXPERT_AVAILABILITY_PATCH_ERROR', error)
      return jsonError('Müsaitlik güncellenemedi.', 500)
    }

    return jsonOk({
      availability: normalizeAvailabilityRow(data as unknown as AvailabilityRow),
    })
  } catch (error) {
    console.error('EXPERT_AVAILABILITY_PATCH_RUNTIME_ERROR', error)
    return jsonError('Müsaitlik güncellenemedi.', 500)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')?.trim()
    const expertId = await getExpertIdFromRequest(req)

    if (!isValidUuid(id)) {
      return jsonError('Geçerli müsaitlik kaydı gerekli.', 400)
    }

    if (!expertId) {
      return jsonError('Geçerli uzman kimliği gerekli.', 400)
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('expert_availability' as never)
      .delete()
      .eq('id', id as never)
      .eq('expert_id', expertId as never)

    if (error) {
      console.error('EXPERT_AVAILABILITY_DELETE_ERROR', error)
      return jsonError('Müsaitlik silinemedi.', 500)
    }

    return jsonOk({
      deletedId: id,
    })
  } catch (error) {
    console.error('EXPERT_AVAILABILITY_DELETE_RUNTIME_ERROR', error)
    return jsonError('Müsaitlik silinemedi.', 500)
  }
}
