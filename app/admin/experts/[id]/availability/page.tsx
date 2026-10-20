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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <AdminHeader />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/uzman-basvurulari"
            className="text-sm font-semibold text-slate-500 underline underline-offset-4 transition-all duration-200 ease-out hover:text-slate-900"
          >
            ← Uzmanlara dön
          </Link>

          <button
            onClick={loadAvailability}
            disabled={loading}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-slate-800 disabled:opacity-50"
          >
            Yenile
          </button>
        </div>

        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            C7 Scheduling
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Uzman Müsaitliği
          </h1>

          <p className="mt-2 break-all text-sm font-medium text-slate-500">
            Expert ID: {expertId || '-'}
          </p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Yeni Müsaitlik Ekle
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Gün
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(event) => setDayOfWeek(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
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
                  <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Başlangıç
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Bitiş
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-400">
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
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-400">
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
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Timezone
                </label>
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-sm font-semibold text-slate-900 transition-all duration-200 ease-out hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5 accent-slate-900"
                />
                Aktif müsaitlik olarak kaydet
              </label>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  {success}
                </div>
              )}

              <button
                onClick={createAvailability}
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Müsaitliği Kaydet'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Kayıtlı Müsaitlikler
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Slot engine bu aralıklara göre randevu saatleri üretir.
                </p>
              </div>

              <span className="rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                {activeAvailability.length} aktif
              </span>
            </div>

            {loading ? (
              <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-6 text-center font-medium text-slate-500">
                Müsaitlikler yükleniyor...
              </div>
            ) : availability.length === 0 ? (
              <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-6 text-center font-medium text-slate-500">
                Henüz müsaitlik eklenmemiş.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {activeAvailability.map((item) => (
                  <AvailabilityCard key={item.id} item={item} />
                ))}

                {inactiveAvailability.length > 0 && (
                  <div className="pt-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
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
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-200 ease-out hover:border-slate-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-bold text-slate-900">
            {getDayLabel(item.day_of_week)}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            item.is_active
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-100 text-slate-600'
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
    <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}