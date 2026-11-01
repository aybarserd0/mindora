import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { DEFAULT_TIMEZONE, generateSlots, OCCUPYING_STATUSES, zonedDay, type AvailabilityRow } from './slots'
import { expireStalePaymentHolds } from './holds'

/** Danışan en erken bu kadar sonrasına randevu alabilir. */
export const CLIENT_MIN_LEAD_MINUTES = 120
export const CLIENT_BOOKING_DAYS = 21

export type BookableExpert = {
  id: string
  name: string | null
  title: string | null
  session_price: number | null
  status: string
  commission_rate: number | string | null
  founding_member: boolean | null
  founding_until: string | null
  profession: string | null
}

export async function getBookableExpert(expertId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any
  const { data } = await supabase
    .from('experts')
    .select('id, name, title, session_price, status, commission_rate, founding_member, founding_until, profession')
    .eq('id', expertId)
    .maybeSingle()
  return (data as BookableExpert | null) || null
}

/** Uzmanın danışana açık saatleri (yarım kalan ödeme tutmaları temizlendikten sonra). */
export async function getClientBookableSlots(expertId: string, now = new Date()) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any
  await expireStalePaymentHolds(expertId)

  const [{ data: availability }, { data: busy }] = await Promise.all([
    supabase.from('expert_availability').select('*').eq('expert_id', expertId).eq('is_active', true),
    supabase
      .from('session_bookings')
      .select('scheduled_start_at, scheduled_end_at')
      .eq('expert_id', expertId)
      .in('status', OCCUPYING_STATUSES as unknown as string[])
      .gte('scheduled_end_at', now.toISOString()),
  ])

  const rows = (availability || []) as AvailabilityRow[]
  const timeZone = rows[0]?.timezone || DEFAULT_TIMEZONE

  return generateSlots({
    availability: rows,
    busy: busy || [],
    fromDate: zonedDay(now, timeZone).date,
    days: CLIENT_BOOKING_DAYS,
    now,
    minLeadMinutes: CLIENT_MIN_LEAD_MINUTES,
  })
}
