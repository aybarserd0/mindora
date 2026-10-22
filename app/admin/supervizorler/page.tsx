'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Notice,
  Panel,
  StatusPill,
  formatDateTime,
  formatMoney,
  inputClass,
  primaryButton,
  secondaryButton,
  dangerButton,
} from '@/components/supervision/ui'
import { BOOKING_STATUS_LABELS, SUPERVISOR_STATUS_LABELS, type BookingStatus, type SupervisorStatus } from '@/lib/supervision/constants'

type Profile = {
  id: string
  status: SupervisorStatus
  approaches: string[]
  focus_areas: string[]
  bio: string | null
  years_experience: number | null
  credentials: string | null
  session_price: number | null
  commission_rate: number
  admin_note: string | null
  created_at: string
  experts: { name: string | null; email: string | null; phone: string | null; title: string | null; status: string | null }
}

type Booking = {
  id: string
  supervisor_profile_id: string
  kind: string
  status: BookingStatus
  requested_start: string
  price: number
  commission_amount: number
  paid_at: string | null
  cancelled_by: string | null
}

const FILTERS: Array<{ id: SupervisorStatus | 'all'; label: string }> = [
  { id: 'pending', label: 'İnceleniyor' },
  { id: 'approved', label: 'Onaylı' },
  { id: 'paused', label: 'Duraklatıldı' },
  { id: 'rejected', label: 'Reddedildi' },
  { id: 'all', label: 'Tümü' },
]

export default function AdminSupervisorsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<SupervisorStatus | 'all'>('pending')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/supervisors', { cache: 'no-store' })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) setError(data?.error || 'Veriler alınamadı.')
    else {
      setProfiles(data.profiles || [])
      setBookings(data.bookings || [])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const visible = useMemo(() => profiles.filter((p) => filter === 'all' || p.status === filter), [profiles, filter])

  const stats = useMemo(() => {
    const paid = bookings.filter((b) => b.paid_at && b.status !== 'cancelled')
    return {
      approved: profiles.filter((p) => p.status === 'approved').length,
      pending: profiles.filter((p) => p.status === 'pending').length,
      sessions: bookings.filter((b) => b.status === 'completed').length,
      revenue: paid.reduce((sum, b) => sum + Number(b.commission_amount || 0), 0),
      refunds: bookings.filter((b) => b.paid_at && b.status === 'cancelled').length,
    }
  }, [profiles, bookings])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-3xl font-semibold text-slate-900">Süpervizörler</h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">
        Başvuruları incele, komisyon oranlarını yönet. Vaka kartlarının içeriği bu ekranda görünmez.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Onaylı süpervizör', String(stats.approved)],
          ['İnceleme bekleyen', String(stats.pending)],
          ['Tamamlanan seans', String(stats.sessions)],
          ['Komisyon geliri', formatMoney(stats.revenue)],
          ['İade kontrolü gereken', String(stats.refunds)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {stats.refunds > 0 ? (
        <div className="mt-6">
          <Notice tone="warn">
            Ödendikten sonra iptal edilen {stats.refunds} süpervizyon randevusu var. İadeler şimdilik Iyzico panelinden elle yapılmalı.
          </Notice>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              filter === f.id ? 'bg-pine-800 font-semibold text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <div className="mt-6"><Notice tone="bad">{error}</Notice></div> : null}

      <div className="mt-6 space-y-4">
        {loading ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
        {!loading && !error && visible.length === 0 ? (
          <Panel>
            <p className="text-slate-600">Bu durumda süpervizör yok.</p>
          </Panel>
        ) : null}
        {visible.map((p) => (
          <SupervisorRow key={p.id} profile={p} bookings={bookings.filter((b) => b.supervisor_profile_id === p.id)} onChange={load} />
        ))}
      </div>
    </div>
  )
}

function SupervisorRow({ profile: p, bookings, onChange }: { profile: Profile; bookings: Booking[]; onChange: () => Promise<void> }) {
  const [rate, setRate] = useState(String(Math.round(Number(p.commission_rate) * 100)))
  const [note, setNote] = useState(p.admin_note || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(p.status === 'pending')

  async function update(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/admin/supervisors/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) setError(data?.error || 'Güncellenemedi.')
    setBusy(false)
    await onChange()
  }

  const tone = p.status === 'approved' ? 'good' : p.status === 'pending' ? 'warn' : 'bad'

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{p.experts?.name || 'Uzman'}</h2>
            <StatusPill tone={tone}>{SUPERVISOR_STATUS_LABELS[p.status]}</StatusPill>
            {p.experts?.status !== 'approved' ? <StatusPill tone="bad">Uzman hesabı onaylı değil</StatusPill> : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[p.experts?.title, p.years_experience ? `${p.years_experience} yıl` : null, formatMoney(p.session_price), p.experts?.email].filter(Boolean).join(', ')}
          </p>
        </div>
        <button type="button" className="text-sm font-semibold text-pine-800 hover:underline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Gizle' : 'Ayrıntılar'}
        </button>
      </div>

      {open ? (
        <div className="mt-5 grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 text-sm leading-6 text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">Ekoller</p>
              <p>{p.approaches.join(', ') || '-'}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Odak alanları</p>
              <p>{p.focus_areas.join(', ') || '-'}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Tanıtım</p>
              <p className="whitespace-pre-line">{p.bio || '-'}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Eğitim ve belgeler</p>
              <p className="whitespace-pre-line">{p.credentials || '-'}</p>
            </div>
            {bookings.length > 0 ? (
              <div>
                <p className="font-semibold text-slate-900">Son randevular</p>
                <ul className="mt-1 space-y-1">
                  {bookings.slice(0, 5).map((b) => (
                    <li key={b.id}>
                      {formatDateTime(b.requested_start)}, {BOOKING_STATUS_LABELS[b.status]}
                      {b.price > 0 ? `, ${formatMoney(b.price)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-800">Komisyon oranı (%)</span>
              <div className="flex gap-2">
                <input className={inputClass} type="number" min={0} max={50} value={rate} onChange={(e) => setRate(e.target.value)} />
                <button type="button" className={secondaryButton} disabled={busy} onClick={() => void update({ commissionRate: Number(rate) / 100 })}>
                  Kaydet
                </button>
              </div>
              <span className="mt-1 block text-xs text-slate-500">Kurucu süpervizörler için ilk 3 ay %0 uygulanabilir.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-800">Not (reddedilirse uzmana gösterilir)</span>
              <textarea className={`${inputClass} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </label>
            <div className="flex flex-wrap gap-2">
              {p.status !== 'approved' ? (
                <button type="button" className={primaryButton} disabled={busy || p.experts?.status !== 'approved'} onClick={() => void update({ status: 'approved', adminNote: note })}>
                  Onayla
                </button>
              ) : (
                <button type="button" className={secondaryButton} disabled={busy} onClick={() => void update({ status: 'paused', adminNote: note })}>
                  Duraklat
                </button>
              )}
              {p.status !== 'rejected' ? (
                <button type="button" className={dangerButton} disabled={busy} onClick={() => void update({ status: 'rejected', adminNote: note })}>
                  Reddet
                </button>
              ) : null}
            </div>
            {error ? <Notice tone="bad">{error}</Notice> : null}
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
