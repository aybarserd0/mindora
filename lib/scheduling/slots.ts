// Uzman müsaitliğinden randevu saatleri üretir. Müsaitlik saatleri uzmanın
// saat diliminde (varsayılan Europe/Istanbul) tutulur; sunucu UTC'de çalıştığı
// için dönüşüm açıkça yapılır. Eski kod saatleri sunucu saatiyle yorumluyordu
// ve tüm saatler 3 saat kayık görünüyordu (09:00 → 12:00).

export const DEFAULT_TIMEZONE = 'Europe/Istanbul'

/** Ödemesi beklenen randevu bu kadar dakika saati tutar, sonra serbest kalır. */
export const PAYMENT_HOLD_MINUTES = 20

export const OCCUPYING_STATUSES = ['scheduled', 'confirmed', 'active', 'pending_payment'] as const

export type AvailabilityRow = {
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number | null
  timezone: string | null
  is_active?: boolean
}

export type BusyRange = {
  scheduled_start_at: string
  scheduled_end_at: string
}

export type Slot = {
  startAt: string
  endAt: string
  timezone: string
  slotDurationMinutes: number
}

/** Verilen saat diliminde, verilen UTC anında saat farkını (dakika) döner. */
function offsetMinutes(timeZone: string, at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** "2026-10-26" + "09:00:00" (uzmanın saat dilimi) → UTC Date */
export function zonedToUtc(dateString: string, time: string, timeZone: string) {
  const [h, m, s] = time.split(':').map((v) => Number(v) || 0)
  const [y, mo, d] = dateString.split('-').map(Number)
  const guess = new Date(Date.UTC(y, mo - 1, d, h, m, s))
  const offset = offsetMinutes(timeZone, guess)
  const result = new Date(guess.getTime() - offset * 60_000)
  // Yaz saati sınırında bir kez daha düzelt
  const offset2 = offsetMinutes(timeZone, result)
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60_000)
}

/** Bir anın, verilen saat dilimindeki takvim günü ("YYYY-MM-DD") ve haftanın günü (0=Pazar). */
export function zonedDay(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(at)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { date: `${get('year')}-${get('month')}-${get('day')}`, weekday: weekdays[get('weekday')] ?? 0 }
}

function addDays(dateString: string, days: number) {
  const [y, m, d] = dateString.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return next.toISOString().slice(0, 10)
}

export function generateSlots({
  availability,
  busy,
  fromDate,
  days,
  now = new Date(),
  minLeadMinutes = 0,
}: {
  availability: AvailabilityRow[]
  busy: BusyRange[]
  /** Uzmanın saat diliminde başlangıç günü, "YYYY-MM-DD" */
  fromDate: string
  days: number
  now?: Date
  /** Şu andan en az bu kadar dakika sonrası için saat üret */
  minLeadMinutes?: number
}): Slot[] {
  const active = availability.filter((row) => row.is_active !== false)
  const busyRanges = busy.map((b) => [new Date(b.scheduled_start_at).getTime(), new Date(b.scheduled_end_at).getTime()] as const)
  const earliest = now.getTime() + minLeadMinutes * 60_000
  const slots: Slot[] = []

  for (let i = 0; i < days; i += 1) {
    const dateString = addDays(fromDate, i)

    for (const row of active) {
      const timeZone = row.timezone || DEFAULT_TIMEZONE
      const noon = zonedToUtc(dateString, '12:00:00', timeZone)
      if (zonedDay(noon, timeZone).weekday !== row.day_of_week) continue

      const duration = Number(row.slot_duration_minutes)
      const buffer = Number(row.buffer_minutes || 0)
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(buffer) || buffer < 0) continue

      const windowEnd = zonedToUtc(dateString, row.end_time, timeZone).getTime()
      let cursor = zonedToUtc(dateString, row.start_time, timeZone).getTime()

      while (cursor + duration * 60_000 <= windowEnd) {
        const slotEnd = cursor + duration * 60_000
        const conflict = busyRanges.some(([bs, be]) => cursor < be && slotEnd > bs)
        if (!conflict && cursor >= earliest) {
          slots.push({
            startAt: new Date(cursor).toISOString(),
            endAt: new Date(slotEnd).toISOString(),
            timezone: timeZone,
            slotDurationMinutes: duration,
          })
        }
        cursor = slotEnd + buffer * 60_000
      }
    }
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt))
}
