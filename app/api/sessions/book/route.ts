import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type BookSessionPayload = {
  expertId?: string
  clientId?: string
  conversationId?: string
  startAt?: string
  endAt?: string
  timezone?: string
  createdBy?: 'admin' | 'client' | 'expert' | 'system'
}

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const ACTIVE_BOOKING_STATUSES = ['scheduled', 'confirmed', 'active'] as const

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab]?[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = (await req.json()) as BookSessionPayload

    const expertId = body.expertId
    const clientId = body.clientId || null
    const conversationId = body.conversationId || null
    const startAt = body.startAt
    const endAt = body.endAt
    const timezone = body.timezone?.trim() || DEFAULT_TIMEZONE
    const createdBy = body.createdBy || 'admin'

    if (!isValidUuid(expertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    if (clientId && !isValidUuid(clientId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli clientId gerekli.' },
        { status: 400 }
      )
    }

    if (conversationId && !isValidUuid(conversationId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli conversationId gerekli.' },
        { status: 400 }
      )
    }

    if (!isValidDate(startAt) || !isValidDate(endAt)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli startAt ve endAt gerekli.' },
        { status: 400 }
      )
    }

    const scheduledStartAt = new Date(startAt)
    const scheduledEndAt = new Date(endAt)

    if (scheduledStartAt >= scheduledEndAt) {
      return NextResponse.json(
        { ok: false, error: 'Başlangıç zamanı bitiş zamanından önce olmalı.' },
        { status: 400 }
      )
    }

    if (scheduledStartAt.getTime() < Date.now() - 60_000) {
      return NextResponse.json(
        { ok: false, error: 'Geçmiş zamana randevu oluşturulamaz.' },
        { status: 400 }
      )
    }

    if (!['admin', 'client', 'expert', 'system'].includes(createdBy)) {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz createdBy değeri.' },
        { status: 400 }
      )
    }

    const { data: existingBookings, error: existingError } = await supabase
      .from('session_bookings' as never)
      .select('id,scheduled_start_at,scheduled_end_at,status')
      .eq('expert_id', expertId as never)
      .in('status' as never, ACTIVE_BOOKING_STATUSES as unknown as never)

    if (existingError) throw existingError

    const hasConflict = ((existingBookings || []) as any[]).some((booking) => {
      const existingStart = new Date(booking.scheduled_start_at)
      const existingEnd = new Date(booking.scheduled_end_at)

      return scheduledStartAt < existingEnd && scheduledEndAt > existingStart
    })

    if (hasConflict) {
      return NextResponse.json(
        { ok: false, error: 'Bu saat aralığı artık uygun değil.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('session_bookings' as never)
      .insert({
        conversation_id: conversationId,
        expert_id: expertId,
        client_id: clientId,
        scheduled_start_at: scheduledStartAt.toISOString(),
        scheduled_end_at: scheduledEndAt.toISOString(),
        timezone,
        status: 'scheduled',
        created_by: createdBy,
      } as never)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      booking: data,
    })
  } catch (err) {
    console.error('Session booking POST error:', err)

    return NextResponse.json(
      { ok: false, error: 'Randevu oluşturulamadı.' },
      { status: 500 }
    )
  }
}