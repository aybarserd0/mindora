'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type AvailabilityRow = {
  id: string
  expert_id?: string | null
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  timezone: string
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

type AvailabilityApiResponse = {
  ok?: boolean
  availability?: AvailabilityRow | AvailabilityRow[]
  error?: string
}

type FormState = {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
  bufferMinutes: number
  timezone: string
  isActive: boolean
}

type NoticeState = {
  title: string
  description: string
  tone: 'warning' | 'success' | 'default'
} | null

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const DEFAULT_EXPERT_ID = process.env.NEXT_PUBLIC_MINDORA_DEV_EXPERT_ID?.trim() || ''

const weekDays = [
  { id: 1, label: 'Pazartesi' },
  { id: 2, label: 'Salı' },
  { id: 3, label: 'Çarşamba' },
  { id: 4, label: 'Perşembe' },
  { id: 5, label: 'Cuma' },
  { id: 6, label: 'Cumartesi' },
  { id: 0, label: 'Pazar' },
] as const

const initialForm: FormState = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMinutes: 50,
  bufferMinutes: 10,
  timezone: DEFAULT_TIMEZONE,
  isActive: true,
}

function getDayOrder(dayOfWeek: number) {
  if (dayOfWeek === 0) return 7
  return dayOfWeek
}

function getDayLabel(dayOfWeek: number) {
  return weekDays.find((day) => day.id === dayOfWeek)?.label || 'Bilinmeyen gün'
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return '-'
  return value.length >= 5 ? value.slice(0, 5) : value
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function timeToMinutes(value: string) {
  const normalized = normalizeTime(value)
  const [hourRaw, minuteRaw] = normalized.split(':')
  const hour = toNumber(hourRaw, 0)
  const minute = toNumber(minuteRaw, 0)
  return hour * 60 + minute
}

function calculateSlotCount(row: AvailabilityRow) {
  const startTotal = timeToMinutes(row.start_time)
  const endTotal = timeToMinutes(row.end_time)
  const duration = toNumber(row.slot_duration_minutes, 50)
  const buffer = toNumber(row.buffer_minutes, 10)
  const step = duration + buffer

  if (endTotal <= startTotal || duration <= 0 || step <= 0) return 0

  return Math.max(Math.floor((endTotal - startTotal + buffer) / step), 0)
}

function calculateFormSlotPreview(form: FormState) {
  return calculateSlotCount({
    id: 'preview',
    day_of_week: form.dayOfWeek,
    start_time: form.startTime,
    end_time: form.endTime,
    slot_duration_minutes: form.slotDurationMinutes,
    buffer_minutes: form.bufferMinutes,
    timezone: form.timezone,
    is_active: form.isActive,
  })
}

function normalizeAvailabilityRows(value: AvailabilityApiResponse['availability']) {
  if (Array.isArray(value)) return value
  if (value) return [value]
  return []
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function validateForm(form: FormState) {
  const start = timeToMinutes(form.startTime)
  const end = timeToMinutes(form.endTime)

  if (!form.startTime || !form.endTime) {
    return 'Başlangıç ve bitiş saati zorunludur.'
  }

  if (end <= start) {
    return 'Bitiş saati başlangıç saatinden sonra olmalıdır.'
  }

  if (form.slotDurationMinutes < 20 || form.slotDurationMinutes > 180) {
    return 'Seans süresi 20 ile 180 dakika arasında olmalıdır.'
  }

  if (form.bufferMinutes < 0 || form.bufferMinutes > 60) {
    return 'Ara süresi 0 ile 60 dakika arasında olmalıdır.'
  }

  if (end - start < form.slotDurationMinutes) {
    return 'Saat aralığı en az bir seans süresini karşılamalıdır.'
  }

  return ''
}

function hasLocalOverlap(rows: AvailabilityRow[], form: FormState) {
  const start = timeToMinutes(form.startTime)
  const end = timeToMinutes(form.endTime)

  return rows.some((row) => {
    if (!row.is_active || !form.isActive) return false
    if (row.day_of_week !== form.dayOfWeek) return false

    const rowStart = timeToMinutes(row.start_time)
    const rowEnd = timeToMinutes(row.end_time)

    return start < rowEnd && end > rowStart
  })
}

function buildAvailabilityQuery(expertId: string) {
  const params = new URLSearchParams()
  params.set('expertId', expertId)
  return `/api/expert/availability?${params.toString()}`
}

export default function ExpertAvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<NoticeState>(null)

  const expertId = DEFAULT_EXPERT_ID
  const hasExpertId = Boolean(expertId)

  const sortedAvailability = useMemo(
    () =>
      [...availability].sort((a, b) => {
        const dayDiff = getDayOrder(a.day_of_week) - getDayOrder(b.day_of_week)
        if (dayDiff !== 0) return dayDiff
        return normalizeTime(a.start_time).localeCompare(normalizeTime(b.start_time))
      }),
    [availability]
  )

  const activeRows = useMemo(
    () => sortedAvailability.filter((row) => row.is_active),
    [sortedAvailability]
  )


  const formSlotPreview = useMemo(() => calculateFormSlotPreview(form), [form])

  const summary = useMemo(() => {
    const activeDayCount = new Set(activeRows.map((row) => row.day_of_week)).size
    const weeklySlotCount = activeRows.reduce((total, row) => total + calculateSlotCount(row), 0)

    const averageDuration = activeRows.length
      ? Math.round(
          activeRows.reduce((total, row) => total + toNumber(row.slot_duration_minutes, 50), 0) /
            activeRows.length
        )
      : initialForm.slotDurationMinutes

    const averageBuffer = activeRows.length
      ? Math.round(
          activeRows.reduce((total, row) => total + toNumber(row.buffer_minutes, 10), 0) /
            activeRows.length
        )
      : initialForm.bufferMinutes

    return {
      activeDayCount,
      weeklySlotCount,
      averageDuration,
      averageBuffer,
    }
  }, [activeRows])

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true)
      setNotice(null)

      if (!hasExpertId) {
        setAvailability([])
        setNotice({
          title: 'Uzman kimliği bekleniyor',
          description:
            'Müsaitlik kaydı oluşturmak için uzman kimliği bağlanmalıdır. Canlı sistemde bu bilgi oturumdan otomatik alınacaktır.',
          tone: 'warning',
        })
        return
      }

      const response = await fetch(buildAvailabilityQuery(expertId), {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })

      const data = (await response.json().catch(() => ({}))) as AvailabilityApiResponse

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'Müsaitlik bilgileri alınamadı.')
      }

      setAvailability(normalizeAvailabilityRows(data.availability))
    } catch (err) {
      setAvailability([])
      setNotice({
        title: 'Müsaitlikler alınamadı',
        description: getErrorMessage(err, 'Müsaitlik bilgileri alınamadı.'),
        tone: 'warning',
      })
    } finally {
      setLoading(false)
    }
  }, [expertId, hasExpertId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSaving(true)
      setNotice(null)

      if (!hasExpertId) {
        throw new Error('Uzman kimliği bağlanmadan müsaitlik kaydedilemez.')
      }

      const validationError = validateForm(form)
      if (validationError) {
        throw new Error(validationError)
      }

      if (hasLocalOverlap(sortedAvailability, form)) {
        throw new Error(
          'Bu gün için seçtiğiniz saat aralığı mevcut aktif müsaitliklerden biriyle çakışıyor.'
        )
      }

      const response = await fetch('/api/expert/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, ...form }),
      })

      const data = (await response.json().catch(() => ({}))) as AvailabilityApiResponse

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'Müsaitlik kaydedilemedi.')
      }

      setNotice({
        title: 'Müsaitlik kaydedildi',
        description: 'Yeni çalışma aralığı başarıyla takvime eklendi.',
        tone: 'success',
      })
      setForm(initialForm)
      await fetchAvailability()
    } catch (err) {
      setNotice({
        title: 'İşlem tamamlanamadı',
        description: getErrorMessage(err, 'Müsaitlik kaydedilemedi.'),
        tone: 'warning',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: AvailabilityRow) {
    const shouldDelete = window.confirm(
      `${getDayLabel(row.day_of_week)} ${normalizeTime(row.start_time)}-${normalizeTime(
        row.end_time
      )} aralığını silmek istediğinize emin misiniz?`
    )

    if (!shouldDelete) return

    try {
      setDeletingId(row.id)
      setNotice(null)

      const response = await fetch(`/api/expert/availability/${row.id}`, {
        method: 'DELETE',
      })

      const data = (await response.json().catch(() => ({}))) as AvailabilityApiResponse

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'Müsaitlik silinemedi.')
      }

      setAvailability((current) => current.filter((item) => item.id !== row.id))
      setNotice({
        title: 'Müsaitlik silindi',
        description: 'Seçili çalışma aralığı takvimden kaldırıldı.',
        tone: 'success',
      })

      await fetchAvailability()
    } catch (err) {
      setNotice({
        title: 'Silme işlemi tamamlanamadı',
        description: getErrorMessage(err, 'Müsaitlik silinemedi.'),
        tone: 'warning',
      })
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    void fetchAvailability()
  }, [fetchAvailability])

  const summaryCards = [
    {
      title: 'Aktif Gün',
      value: String(summary.activeDayCount),
      description: 'Yayındaki müsait gün',
    },
    {
      title: 'Haftalık Slot',
      value: String(summary.weeklySlotCount),
      description: 'Danışana açık randevu',
    },
    {
      title: 'Seans Süresi',
      value: `${summary.averageDuration} dk`,
      description: 'Ortalama görüşme',
    },
    {
      title: 'Ara Süresi',
      value: `${summary.averageBuffer} dk`,
      description: 'Seans arası süre',
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Uzman Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Müsaitlik Takvimi
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Haftalık uygun gün ve saatlerinizi tanımlayın. Danışanlar randevu
                oluştururken bu saat aralıklarını görecek.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchAvailability()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? 'Yükleniyor...' : 'Yenile'}
              </button>
              <Link
                href="/expert/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                Dashboard
              </Link>
              <Link
                href="/expert/dashboard/sessions"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
              >
                Görüşmeleri Gör
              </Link>
            </div>
          </div>
        </section>

        {notice ? (
          <NoticeCard title={notice.title} description={notice.description} tone={notice.tone} />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-950">Müsaitlik Ekle</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Aynı gün içinde çakışan saat aralıkları sistem tarafından engellenir.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Gün</span>
                <select
                  value={form.dayOfWeek}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  {weekDays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Durum</span>
                <select
                  value={form.isActive ? 'active' : 'passive'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.value === 'active',
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="active">Yayında</option>
                  <option value="passive">Kapalı</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Başlangıç Saati</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Bitiş Saati</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Seans Süresi</span>
                <select
                  value={form.slotDurationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slotDurationMinutes: Number(event.target.value),
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value={30}>30 dk</option>
                  <option value={45}>45 dk</option>
                  <option value={50}>50 dk</option>
                  <option value={60}>60 dk</option>
                  <option value={90}>90 dk</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">Ara Süresi</span>
                <select
                  value={form.bufferMinutes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value={0}>Ara yok</option>
                  <option value={5}>5 dk</option>
                  <option value={10}>10 dk</option>
                  <option value={15}>15 dk</option>
                  <option value={20}>20 dk</option>
                </select>
              </label>

              <input type="hidden" value={form.timezone} readOnly />

              <div className="sm:col-span-2 rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                  Önizleme
                </p>
                <p className="mt-2 text-sm font-black text-indigo-950">
                  {getDayLabel(form.dayOfWeek)} · {form.startTime || '-'} - {form.endTime || '-'}
                </p>
                <p className="mt-1 text-sm leading-6 text-indigo-800">
                  Bu aralık yaklaşık <strong>{formSlotPreview}</strong> randevu slotu üretir.
                  Saatler {form.timezone} zaman dilimine göre kaydedilir.
                </p>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving || !hasExpertId}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {saving ? 'Kaydediliyor...' : 'Müsaitlik Ekle'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Randevu Akışı</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Yayındaki saat aralıkları ödeme sonrası danışanın göreceği seans seçeneklerini oluşturur.
            </p>

            <div className="mt-5 space-y-3">
              <StepItem index={1} title="Gün ve saat ekle" />
              <StepItem index={2} title="Çakışmaları kontrol et" />
              <StepItem index={3} title="Danışan uygun saati seçsin" />
              <StepItem index={4} title="Görüşme otomatik panele düşsün" />
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Haftalık Müsaitlikler</h2>
              <p className="mt-1 text-sm text-slate-500">
                Yayındaki ve kapalı saat aralıklarını buradan takip edebilirsiniz.
              </p>
            </div>
          </div>

          {loading ? (
            <EmptyState
              title="Müsaitlikler yükleniyor"
              description="Haftalık saat aralıkları hazırlanıyor."
            />
          ) : sortedAvailability.length === 0 ? (
            <EmptyState
              title="Henüz müsaitlik tanımlanmadı"
              description="İlk uygun gün ve saat aralığınızı eklediğinizde burada listelenecek."
            />
          ) : (
            <AvailabilityTable
              rows={sortedAvailability}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function AvailabilityTable({
  rows,
  deletingId,
  onDelete,
}: {
  rows: AvailabilityRow[]
  deletingId: string | null
  onDelete: (row: AvailabilityRow) => void
}) {
  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-100 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-950">
                  {getDayLabel(row.day_of_week)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {normalizeTime(row.start_time)} - {normalizeTime(row.end_time)}
                </p>
              </div>
              <StatusBadge active={row.is_active} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <MiniMetric label="Seans" value={`${row.slot_duration_minutes} dk`} />
              <MiniMetric label="Ara" value={`${row.buffer_minutes} dk`} />
              <MiniMetric label="Slot" value={`${calculateSlotCount(row)}`} />
            </div>

            <button
              type="button"
              onClick={() => onDelete(row)}
              disabled={deletingId === row.id}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingId === row.id ? 'Siliniyor...' : 'Müsaitliği Sil'}
            </button>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4 font-black">Gün</th>
                <th className="px-5 py-4 font-black">Saat Aralığı</th>
                <th className="px-5 py-4 font-black">Seans</th>
                <th className="px-5 py-4 font-black">Ara</th>
                <th className="px-5 py-4 font-black">Slot</th>
                <th className="px-5 py-4 font-black">Durum</th>
                <th className="px-5 py-4 text-right font-black">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-indigo-50/40">
                  <td className="px-5 py-4 font-black text-slate-950">
                    {getDayLabel(row.day_of_week)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    {normalizeTime(row.start_time)} - {normalizeTime(row.end_time)}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{row.slot_duration_minutes} dk</td>
                  <td className="px-5 py-4 text-slate-600">{row.buffer_minutes} dk</td>
                  <td className="px-5 py-4 text-slate-600">{calculateSlotCount(row)} slot</td>
                  <td className="px-5 py-4">
                    <StatusBadge active={row.is_active} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      disabled={deletingId === row.id}
                      className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === row.id ? 'Siliniyor...' : 'Sil'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="font-black text-slate-950">{value}</p>
      <p className="mt-0.5 font-bold text-slate-500">{label}</p>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
      Yayında
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
      Kapalı
    </span>
  )
}

function NoticeCard({
  title,
  description,
  tone = 'default',
}: {
  title: string
  description: string
  tone?: 'default' | 'warning' | 'success'
}) {
  const className =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white text-slate-700'

  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${className}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
    </section>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function StepItem({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
        {index}
      </span>
      <p className="text-sm font-black text-slate-700">{title}</p>
    </div>
  )
}
