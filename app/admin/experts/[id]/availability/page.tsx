'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminHeader from '@/components/AdminHeader'

type AvailabilityRow = {
  id: string
  expert_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  timezone: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

type AvailabilityResponse = {
  ok: boolean
  availability?: AvailabilityRow | AvailabilityRow[]
  error?: string
}

const DAYS = [
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
  { value: 0, label: 'Pazar' },
]

const DEFAULT_TIMEZONE = 'Europe/Istanbul'

function getDayLabel(day: number) {
  return DAYS.find((item) => item.value === day)?.label || '-'
}

function formatTime(value?: string) {
  if (!value) return '-'
  return value.slice(0, 5)
}

export default function ExpertAvailabilityAdminPage() {
  const params = useParams()
  const expertId = useMemo(() => String(params?.id || ''), [params])

  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(50)
  const [bufferMinutes, setBufferMinutes] = useState(10)
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE)
  const [isActive, setIsActive] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeAvailability = availability.filter((item) => item.is_active)
  const inactiveAvailability = availability.filter((item) => !item.is_active)

  async function loadAvailability() {
    if (!expertId) return

    try {
      setLoading(true)
      setError('')

      const res = await fetch(
        `/api/expert/availability?expertId=${encodeURIComponent(expertId)}`,
        { cache: 'no-store' }
      )

      const data = (await res.json()) as AvailabilityResponse

      if (!res.ok || !data.ok) {
        setError(data.error || 'Müsaitlik bilgileri alınamadı.')
        return
      }

      const rows = Array.isArray(data.availability) ? data.availability : []
      setAvailability(rows)
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  async function createAvailability() {
    if (!expertId) {
      setError('Expert ID bulunamadı.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const res = await fetch('/api/expert/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId,
          dayOfWeek,
          startTime,
          endTime,
          slotDurationMinutes,
          bufferMinutes,
          timezone,
          isActive,
        }),
      })

      const data = (await res.json()) as AvailabilityResponse

      if (!res.ok || !data.ok) {
        setError(data.error || 'Müsaitlik kaydedilemedi.')
        return
      }

      setSuccess('Müsaitlik başarıyla kaydedildi.')
      await loadAvailability()
    } catch {
      setError('Müsaitlik kaydedilirken hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadAvailability()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-8 text-[#171717] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <AdminHeader />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/uzman-basvurulari"
            className="text-sm font-black text-[#6b5c4d] underline underline-offset-4"
          >
            ← Uzmanlara dön
          </Link>

          <button
            onClick={loadAvailability}
            disabled={loading}
            className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:opacity-50"
          >
            Yenile
          </button>
        </div>

        <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8a7662]">
            C7 Scheduling
          </p>

          <h1 className="mt-2 text-3xl font-black text-[#2b2118]">
            Uzman Müsaitliği
          </h1>

          <p className="mt-2 break-all text-sm font-semibold text-[#6b5c4d]">
            Expert ID: {expertId || '-'}
          </p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-[2rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#2b2118]">
              Yeni Müsaitlik Ekle
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#8a7662]">
                  Gün
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(event) => setDayOfWeek(Number(event.target.value))}
                  className="w-full rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm font-bold outline-none"
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#8a7662]">
                    Başlangıç
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#8a7662]">
                    Bitiş
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#8a7662]">
                    Seans dk
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={slotDurationMinutes}
                    onChange={(event) =>
                      setSlotDurationMinutes(Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#8a7662]">
                    Buffer dk
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={bufferMinutes}
                    onChange={(event) =>
                      setBufferMinutes(Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#8a7662]">
                  Timezone
                </label>
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm font-bold outline-none"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl bg-[#faf7f2] p-4 text-sm font-black text-[#2b2118] ring-1 ring-black/5">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5"
                />
                Aktif müsaitlik olarak kaydet
              </label>

              {error && (
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                  {success}
                </div>
              )}

              <button
                onClick={createAvailability}
                disabled={saving}
                className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Müsaitliği Kaydet'}
              </button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#2b2118]">
                  Kayıtlı Müsaitlikler
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#6b5c4d]">
                  Slot engine bu aralıklara göre randevu saatleri üretir.
                </p>
              </div>

              <span className="rounded-full bg-[#faf7f2] px-4 py-2 text-xs font-black text-[#6b5c4d] ring-1 ring-black/5">
                {activeAvailability.length} aktif
              </span>
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl bg-[#faf7f2] p-6 text-center font-bold text-[#6b5c4d]">
                Müsaitlikler yükleniyor...
              </div>
            ) : availability.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-[#faf7f2] p-6 text-center font-bold text-[#6b5c4d]">
                Henüz müsaitlik eklenmemiş.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {activeAvailability.map((item) => (
                  <AvailabilityCard key={item.id} item={item} />
                ))}

                {inactiveAvailability.length > 0 && (
                  <div className="pt-4">
                    <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#8a7662]">
                      Pasif Kayıtlar
                    </h3>

                    <div className="space-y-3 opacity-70">
                      {inactiveAvailability.map((item) => (
                        <AvailabilityCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function AvailabilityCard({ item }: { item: AvailabilityRow }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-[#faf7f2] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-black text-[#2b2118]">
            {getDayLabel(item.day_of_week)}
          </p>
          <p className="mt-1 text-sm font-bold text-[#6b5c4d]">
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${
            item.is_active
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
          }`}
        >
          {item.is_active ? 'Aktif' : 'Pasif'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Seans" value={`${item.slot_duration_minutes} dk`} />
        <MiniMetric label="Buffer" value={`${item.buffer_minutes} dk`} />
        <MiniMetric label="Timezone" value={item.timezone || DEFAULT_TIMEZONE} />
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a7662]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-[#2b2118]">{value}</p>
    </div>
  )
}