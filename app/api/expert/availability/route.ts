import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type AvailabilityPayload = {
  expertId?: string
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  slotDurationMinutes?: number
  bufferMinutes?: number
  timezone?: string
  isActive?: boolean
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

const DEFAULT_TIMEZONE = 'Europe/Istanbul'

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)
  )
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

function isPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const expertId = req.nextUrl.searchParams.get('expertId')

    if (!isValidUuid(expertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('expert_availability' as never)
      .select('*')
      .eq('expert_id', expertId as never)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      availability: data || [],
    })
  } catch (err) {
    console.error('Expert availability GET error:', err)

    return NextResponse.json(
      { ok: false, error: 'Müsaitlik bilgileri alınamadı.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AvailabilityPayload

    const expertId = body.expertId
    const dayOfWeek = body.dayOfWeek
    const startTime = body.startTime
    const endTime = body.endTime

    if (!isValidUuid(expertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    if (
      typeof dayOfWeek !== 'number' ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      return NextResponse.json(
        { ok: false, error: 'dayOfWeek 0-6 arasında olmalı.' },
        { status: 400 }
      )
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli startTime ve endTime gerekli.' },
        { status: 400 }
      )
    }

    const normalizedStartTime = normalizeTime(startTime)
    const normalizedEndTime = normalizeTime(endTime)

    if (normalizedStartTime >= normalizedEndTime) {
      return NextResponse.json(
        { ok: false, error: 'Başlangıç saati bitiş saatinden önce olmalı.' },
        { status: 400 }
      )
    }

    const slotDurationMinutes = body.slotDurationMinutes ?? 50
    const bufferMinutes = body.bufferMinutes ?? 10

    if (
      !isPositiveInteger(slotDurationMinutes) ||
      slotDurationMinutes < 15 ||
      slotDurationMinutes > 180
    ) {
      return NextResponse.json(
        { ok: false, error: 'Seans süresi 15-180 dakika arasında olmalı.' },
        { status: 400 }
      )
    }

    if (
      typeof bufferMinutes !== 'number' ||
      !Number.isInteger(bufferMinutes) ||
      bufferMinutes < 0 ||
      bufferMinutes > 60
    ) {
      return NextResponse.json(
        { ok: false, error: 'Buffer süresi 0-60 dakika arasında olmalı.' },
        { status: 400 }
      )
    }

    const timezone =
      typeof body.timezone === 'string' && body.timezone.trim()
        ? body.timezone.trim()
        : DEFAULT_TIMEZONE

    const supabase = getSupabaseAdmin()

    const { data: existingRows, error: existingError } = await supabase
      .from('expert_availability' as never)
      .select('id,start_time,end_time,is_active')
      .eq('expert_id', expertId as never)
      .eq('day_of_week', dayOfWeek as never)
      .eq('is_active', true as never)

    if (existingError) throw existingError

    const hasOverlap = Array.isArray(existingRows)
      ? existingRows.some((row: any) => {
          return (
            normalizedStartTime < row.end_time &&
            normalizedEndTime > row.start_time
          )
        })
      : false

    if (hasOverlap) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Bu gün için seçilen saat aralığı mevcut bir müsaitlik aralığıyla çakışıyor.',
        },
        { status: 409 }
      )
    }

    const payload: ExpertAvailabilityInsert = {
      expert_id: expertId,
      day_of_week: dayOfWeek,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      slot_duration_minutes: slotDurationMinutes,
      buffer_minutes: bufferMinutes,
      timezone,
      is_active: body.isActive ?? true,
    }

    const { data, error } = await supabase
      .from('expert_availability' as never)
      .insert(payload as never)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      availability: data,
    })
  } catch (err) {
    console.error('Expert availability POST error:', err)

    return NextResponse.json(
      { ok: false, error: 'Müsaitlik kaydedilemedi.' },
      { status: 500 }
    )
  }
}