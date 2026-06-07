import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type AvailabilityPayload = {
  expertId?: unknown
  dayOfWeek?: unknown
  startTime?: unknown
  endTime?: unknown
  slotDurationMinutes?: unknown
  bufferMinutes?: unknown
  timezone?: unknown
  isActive?: unknown
}

type ExpertAvailabilityInsert = {
  expert_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  timezone: string
  is_active: boolean
}

type AvailabilityRow = {
  id?: string
  expert_id?: string
  day_of_week?: number
  start_time?: string
  end_time?: string
  slot_duration_minutes?: number
  buffer_minutes?: number
  timezone?: string
  is_active?: boolean
}

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const MIN_SLOT_DURATION_MINUTES = 15
const MAX_SLOT_DURATION_MINUTES = 180
const MAX_BUFFER_MINUTES = 60
const DAYS_IN_WEEK = 6

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status })
}

function errorResponse(error: string, status = 400) {
  return jsonResponse({ ok: false, error }, status)
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
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

function isValidDayOfWeek(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= DAYS_IN_WEEK
  )
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}

function normalizeTimezone(value: unknown) {
  if (typeof value !== 'string') return DEFAULT_TIMEZONE

  const timezone = value.trim()
  return timezone.length > 0 ? timezone : DEFAULT_TIMEZONE
}

function normalizeIsActive(value: unknown) {
  return typeof value === 'boolean' ? value : true
}

function hasTimeOverlap({
  existingRows,
  normalizedStartTime,
  normalizedEndTime,
}: {
  existingRows: AvailabilityRow[] | null
  normalizedStartTime: string
  normalizedEndTime: string
}) {
  if (!Array.isArray(existingRows)) return false

  return existingRows.some((row) => {
    if (!row.start_time || !row.end_time) return false

    return normalizedStartTime < row.end_time && normalizedEndTime > row.start_time
  })
}

export async function GET(req: NextRequest) {
  try {
    const expertId = req.nextUrl.searchParams.get('expertId')?.trim()

    if (!isValidUuid(expertId)) {
      return errorResponse('Geçerli expertId gerekli.', 400)
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('expert_availability' as never)
      .select('*')
      .eq('expert_id', expertId as never)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Expert availability GET Supabase error:', error)
      return errorResponse('Müsaitlik bilgileri alınamadı.', 500)
    }

    return jsonResponse({
      ok: true,
      availability: data || [],
    })
  } catch (err) {
    console.error('Expert availability GET error:', err)
    return errorResponse('Müsaitlik bilgileri alınamadı.', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as AvailabilityPayload | null

    if (!body || typeof body !== 'object') {
      return errorResponse('Geçerli JSON body gerekli.', 400)
    }

    const expertId = typeof body.expertId === 'string' ? body.expertId.trim() : body.expertId

    if (!isValidUuid(expertId)) {
      return errorResponse('Geçerli expertId gerekli.', 400)
    }

    if (!isValidDayOfWeek(body.dayOfWeek)) {
      return errorResponse('dayOfWeek 0-6 arasında olmalı.', 400)
    }

    if (!isValidTime(body.startTime) || !isValidTime(body.endTime)) {
      return errorResponse('Geçerli startTime ve endTime gerekli.', 400)
    }

    const normalizedStartTime = normalizeTime(body.startTime)
    const normalizedEndTime = normalizeTime(body.endTime)

    if (normalizedStartTime >= normalizedEndTime) {
      return errorResponse('Başlangıç saati bitiş saatinden önce olmalı.', 400)
    }

    const slotDurationMinutes = body.slotDurationMinutes ?? 50
    const bufferMinutes = body.bufferMinutes ?? 10

    if (
      !isIntegerInRange(
        slotDurationMinutes,
        MIN_SLOT_DURATION_MINUTES,
        MAX_SLOT_DURATION_MINUTES
      )
    ) {
      return errorResponse('Seans süresi 15-180 dakika arasında olmalı.', 400)
    }

    if (!isIntegerInRange(bufferMinutes, 0, MAX_BUFFER_MINUTES)) {
      return errorResponse('Buffer süresi 0-60 dakika arasında olmalı.', 400)
    }

    const supabase = getSupabaseAdmin()

    const { data: existingRows, error: existingError } = await supabase
      .from('expert_availability' as never)
      .select('id,start_time,end_time,is_active')
      .eq('expert_id', expertId as never)
      .eq('day_of_week', body.dayOfWeek as never)
      .eq('is_active', true as never)

    if (existingError) {
      console.error('Expert availability overlap check error:', existingError)
      return errorResponse('Müsaitlik çakışması kontrol edilemedi.', 500)
    }

    if (
      hasTimeOverlap({
        existingRows: existingRows as AvailabilityRow[] | null,
        normalizedStartTime,
        normalizedEndTime,
      })
    ) {
      return errorResponse(
        'Bu gün için seçilen saat aralığı mevcut bir müsaitlik aralığıyla çakışıyor.',
        409
      )
    }

    const payload: ExpertAvailabilityInsert = {
      expert_id: expertId,
      day_of_week: body.dayOfWeek,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      slot_duration_minutes: slotDurationMinutes,
      buffer_minutes: bufferMinutes,
      timezone: normalizeTimezone(body.timezone),
      is_active: normalizeIsActive(body.isActive),
    }

    const { data, error } = await supabase
      .from('expert_availability' as never)
      .insert(payload as never)
      .select('*')
      .single()

    if (error) {
      console.error('Expert availability insert error:', error)
      return errorResponse('Müsaitlik kaydedilemedi.', 500)
    }

    return jsonResponse({
      ok: true,
      availability: data,
    })
  } catch (err) {
    console.error('Expert availability POST error:', err)
    return errorResponse('Müsaitlik kaydedilemedi.', 500)
  }
}
