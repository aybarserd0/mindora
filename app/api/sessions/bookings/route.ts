import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const ACTIVE_BOOKING_STATUSES = [
  'scheduled',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
] as const

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const conversationId = req.nextUrl.searchParams.get('conversationId')
    const expertId = req.nextUrl.searchParams.get('expertId')

    if (!conversationId && !expertId) {
      return NextResponse.json(
        { ok: false, error: 'conversationId veya expertId gerekli.' },
        { status: 400 }
      )
    }

    if (conversationId && !isValidUuid(conversationId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli conversationId gerekli.' },
        { status: 400 }
      )
    }

    if (expertId && !isValidUuid(expertId)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli expertId gerekli.' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('session_bookings' as never)
      .select('*')
      .in('status' as never, ACTIVE_BOOKING_STATUSES as unknown as never)
      .order('scheduled_start_at', { ascending: true })

    if (conversationId) {
      query = query.eq('conversation_id', conversationId as never)
    }

    if (expertId) {
      query = query.eq('expert_id', expertId as never)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      ok: true,
      bookings: data || [],
    })
  } catch (err) {
    console.error('Session bookings GET error:', err)

    return NextResponse.json(
      { ok: false, error: 'Randevular alınamadı.' },
      { status: 500 }
    )
  }
}