'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  Notice,
  PageIntro,
  Panel,
  StatusPill,
  dangerButton,
  formatDate,
  formatDateTime,
  formatMoney,
  inputClass,
  primaryButton,
  secondaryButton,
} from '@/components/supervision/ui'
import {
  BOOKING_STATUS_LABELS,
  CASE_GENDERS,
  MAX_SESSION_PRICE,
  MIN_SESSION_PRICE,
  ROOM_CLOSE_AFTER_MINUTES,
  ROOM_OPEN_BEFORE_MINUTES,
  SUPERVISION_APPROACHES,
  SUPERVISOR_STATUS_LABELS,
  type BookingStatus,
  type SupervisorStatus,
} from '@/lib/supervision/constants'

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
  intro_call_enabled: boolean
  availability_note: string | null
  admin_note: string | null
}

type Booking = {
  id: string
  kind: 'intro' | 'individual'
  status: BookingStatus
  requested_start: string
  duration_minutes: number
  price: number
  supervisor_amount: number
  request_note: string | null
  experts?: { name: string | null; title: string | null }
}

type PendingLog = { id: string; session_date: string; duration_minutes: number; experts?: { name: string | null } }

type SharedCase = {
  id: string
  age_range: string | null
  gender: string | null
  topic: string
  session_count: number | null
  formulation: string | null
  question: string | null
}

async function api<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string }
  return { ok: res.ok && data?.ok !== false, data }
}

export default function SupervisorPanelPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [expertStatus, setExpertStatus] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pendingLogs, setPendingLogs] = useState<PendingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    const [p, b, l] = await Promise.all([
      api<{ profile: Profile | null; expert: { status: string } | null }>('/api/supervision/profile'),
      api<{ asSupervisor: Booking[] }>('/api/supervision/bookings'),
      api<{ pendingForMe: PendingLog[] }>('/api/supervision/log'),
    ])
    if (p.ok) {
      setProfile(p.data.profile)
      setExpertStatus(p.data.expert?.status || null)
    }
    if (b.ok) setBookings(b.data.asSupervisor || [])
    if (l.ok) setPendingLogs(l.data.pendingForMe || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0)
    const clock = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(clock)
    }
  }, [refresh])

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500 sm:px-6 lg:px-8">Yükleniyor…</div>
  }

  const showForm = !profile || editing

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageIntro title="Süpervizör paneli">
        Meslektaşlarına süpervizyon ver, taleplerini yönet ve defter kayıtlarını onayla.
      </PageIntro>

      {profile ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StatusPill tone={profile.status === 'approved' ? 'good' : profile.status === 'pending' ? 'warn' : 'bad'}>
            {SUPERVISOR_STATUS_LABELS[profile.status]}
          </StatusPill>
          {profile.status === 'approved' ? (
            <span className="text-sm text-slate-500">
              Komisyon oranın %{Math.round(Number(profile.commission_rate) * 100)}
            </span>
          ) : null}
          {!editing ? (
            <button type="button" className="text-sm font-semibold text-pine-800 hover:underline" onClick={() => setEditing(true)}>
              Profili düzenle
            </button>
          ) : null}
        </div>
      ) : null}

      {profile?.status === 'pending' && !editing ? (
        <div className="mt-6">
          <Notice>Başvurun inceleniyor. Onaylandığında bildirim alacak ve süpervizör dizininde görüneceksin.</Notice>
        </div>
      ) : null}
      {profile?.status === 'rejected' && !editing ? (
        <div className="mt-6">
          <Notice tone="bad">
            Başvurun şu an için onaylanmadı.{profile.admin_note ? ` Not: ${profile.admin_note}` : ''} Profilini güncelleyip yeniden gönderebilirsin.
          </Notice>
        </div>
      ) : null}

      {showForm ? (
        <div className="mt-8">
          {expertStatus !== 'approved' ? (
            <Notice tone="warn">Süpervizör başvurusu için önce uzman hesabının onaylanması gerekiyor.</Notice>
          ) : (
            <ProfileForm
              initial={profile}
              onCancel={profile ? () => setEditing(false) : undefined}
              onSaved={() => {
                setEditing(false)
                void refresh()
              }}
            />
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {pendingLogs.length > 0 ? (
            <section>
              <h2 className="text-xl font-semibold text-slate-900">Onayını bekleyen defter kayıtları</h2>
              <ul className="mt-4 space-y-3">
                {pendingLogs.map((entry) => (
                  <LogConfirmRow key={entry.id} entry={entry} onDone={refresh} />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Talepler ve seanslar</h2>
            {bookings.length === 0 ? (
              <Panel className="mt-4">
                <p className="text-slate-600">
                  {profile?.status === 'approved' ? 'Henüz talep yok. Profilin dizinde görünüyor.' : 'Onaylandıktan sonra talepler burada görünecek.'}
                </p>
              </Panel>
            ) : (
              <div className="mt-4 space-y-4">
                {bookings.map((b) => (
                  <SupervisorBookingCard key={b.id} booking={b} now={now} onChange={refresh} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function ProfileForm({ initial, onSaved, onCancel }: { initial: Profile | null; onSaved: () => void; onCancel?: () => void }) {
  const [approaches, setApproaches] = useState<string[]>(initial?.approaches || [])
  const [focusAreas, setFocusAreas] = useState((initial?.focus_areas || []).join(', '))
  const [bio, setBio] = useState(initial?.bio || '')
  const [credentials, setCredentials] = useState(initial?.credentials || '')
  const [years, setYears] = useState(initial?.years_experience?.toString() || '')
  const [price, setPrice] = useState(initial?.session_price?.toString() || '')
  const [intro, setIntro] = useState(initial?.intro_call_enabled ?? true)
  const [availability, setAvailability] = useState(initial?.availability_note || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const { ok, data } = await api('/api/supervision/profile', {
      method: 'PUT',
      body: JSON.stringify({
        approaches,
        focusAreas: focusAreas.split(',').map((s) => s.trim()).filter(Boolean),
        bio,
        credentials,
        yearsExperience: Number(years),
        sessionPrice: Number(price),
        introCallEnabled: intro,
        availabilityNote: availability,
      }),
    })
    setSaving(false)
    if (!ok) {
      setError(data?.error || 'Kaydedilemedi.')
      return
    }
    onSaved()
  }

  return (
    <Panel className="max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-900">{initial ? 'Süpervizör profilin' : 'Süpervizör olarak başvur'}</h2>
      {!initial ? (
        <p className="mt-2 leading-7 text-slate-600">
          En az 5 yıllık klinik deneyim ve ekol eğitimi belgesi gerekiyor. Belgelerini Doğrulama sayfasından yükleyebilirsin.
        </p>
      ) : null}

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-800">Süpervizyon verdiğin ekoller</legend>
          <div className="flex flex-wrap gap-2">
            {SUPERVISION_APPROACHES.map((a) => {
              const on = approaches.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setApproaches((list) => (on ? list.filter((x) => x !== a) : [...list, a]))}
                  className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                    on ? 'border-pine-700 bg-pine-50 font-semibold text-pine-900' : 'border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-800">Klinik deneyim (yıl)</span>
            <input className={inputClass} type="number" min={5} max={70} value={years} onChange={(e) => setYears(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-800">50 dakikalık seans ücreti (TL)</span>
            <input
              className={inputClass}
              type="number"
              min={MIN_SESSION_PRICE}
              max={MAX_SESSION_PRICE}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">Odaklandığın alanlar (virgülle ayır)</span>
          <input className={inputClass} value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} placeholder="Örn. travma, çift terapisi, yeni mezunlar" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">Kendini tanıt</span>
          <textarea className={`${inputClass} min-h-32`} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1500} required />
          <span className="mt-1 block text-xs text-slate-500">Süpervizyon yaklaşımın, kimlerle çalışmayı sevdiğin. Dizinde görünür.</span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">Eğitim ve belgeler</span>
          <textarea className={`${inputClass} min-h-24`} value={credentials} onChange={(e) => setCredentials(e.target.value)} maxLength={1500} required />
          <span className="mt-1 block text-xs text-slate-500">Yalnızca Mindora ekibi görür.</span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">Müsaitlik notu</span>
          <input className={inputClass} value={availability} onChange={(e) => setAvailability(e.target.value)} maxLength={300} placeholder="Örn. Hafta içi 18.00 sonrası, cumartesi sabah" />
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4 accent-pine-700" checked={intro} onChange={(e) => setIntro(e.target.checked)} />
          <span className="text-sm text-slate-700">15 dakikalık ücretsiz tanışma görüşmesi sun</span>
        </label>

        {error ? <Notice tone="bad">{error}</Notice> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButton} disabled={saving}>
            {saving ? 'Kaydediliyor' : initial ? 'Kaydet' : 'Başvuruyu gönder'}
          </button>
          {onCancel ? (
            <button type="button" className={secondaryButton} onClick={onCancel}>
              Vazgeç
            </button>
          ) : null}
        </div>
      </form>
    </Panel>
  )
}

function SupervisorBookingCard({ booking: b, now, onChange }: { booking: Booking; now: number; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [cases, setCases] = useState<SharedCase[] | null>(null)

  const start = new Date(b.requested_start).getTime()
  const started = now >= start
  const roomOpen = now >= start - ROOM_OPEN_BEFORE_MINUTES * 60_000 && now <= start + (b.duration_minutes + ROOM_CLOSE_AFTER_MINUTES) * 60_000

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true)
    setError('')
    const { ok, data } = await api(`/api/supervision/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ action, ...extra }) })
    if (!ok) setError(data?.error || 'İşlem yapılamadı.')
    setBusy(false)
    await onChange()
  }

  async function loadCases() {
    const { ok, data } = await api<{ cases: SharedCase[] }>(`/api/supervision/bookings/${b.id}/cases`)
    setCases(ok ? data.cases || [] : [])
  }

  const tone = b.status === 'confirmed' ? 'good' : b.status === 'requested' || b.status === 'accepted' ? 'warn' : b.status === 'completed' ? 'accent' : 'bad'

  return (
    <Panel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{b.experts?.name || 'Psikolog'}</h3>
            <StatusPill tone={tone}>{BOOKING_STATUS_LABELS[b.status]}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {b.kind === 'intro' ? 'Tanışma görüşmesi' : 'Bireysel süpervizyon'}, {formatDateTime(b.requested_start)}, {b.duration_minutes} dk
            {b.price > 0 ? `, sana kalan ${formatMoney(b.supervisor_amount)}` : ''}
          </p>
          {b.request_note ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">“{b.request_note}”</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {b.status === 'requested' ? (
            <>
              <button type="button" className={primaryButton} disabled={busy} onClick={() => void act('accept')}>
                Kabul et
              </button>
              <button type="button" className={secondaryButton} disabled={busy} onClick={() => setDeclining(true)}>
                Reddet
              </button>
            </>
          ) : null}
          {b.status === 'confirmed' && roomOpen ? (
            <Link href={`/expert/dashboard/supervizyon/oda/${b.id}`} className={primaryButton}>
              Görüşmeye katıl
            </Link>
          ) : null}
          {b.status === 'confirmed' && started ? (
            <>
              <button type="button" className={secondaryButton} disabled={busy} onClick={() => void act('complete')}>
                Tamamlandı
              </button>
              <button type="button" className={secondaryButton} disabled={busy} onClick={() => void act('no_show')}>
                Katılmadı
              </button>
            </>
          ) : null}
          {['accepted', 'confirmed'].includes(b.status) && !started ? (
            <button type="button" className={dangerButton} disabled={busy} onClick={() => void act('cancel')}>
              İptal et
            </button>
          ) : null}
        </div>
      </div>

      {declining ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Kısa bir not (isteğe bağlı), ör. başka bir saat önerisi" maxLength={500} />
          <button type="button" className={dangerButton} disabled={busy} onClick={() => void act('decline', { reason })}>
            Reddi gönder
          </button>
        </div>
      ) : null}

      {b.kind === 'individual' && ['requested', 'accepted', 'confirmed'].includes(b.status) ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          {cases === null ? (
            <button type="button" className="text-sm font-semibold text-pine-800 hover:underline" onClick={() => void loadCases()}>
              Paylaşılan vaka kartlarını göster
            </button>
          ) : cases.length === 0 ? (
            <p className="text-sm text-slate-500">Bu seans için henüz vaka kartı paylaşılmadı.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Vaka kartlarını her açışın kayıt altına alınır.</p>
              {cases.map((c, i) => (
                <article key={c.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    Vaka {i + 1}: {c.topic}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {[
                      c.age_range ? `${c.age_range} yaş` : null,
                      CASE_GENDERS.find((g) => g.value === c.gender)?.label || null,
                      c.session_count !== null ? `${c.session_count} seans` : null,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {c.formulation ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{c.formulation}</p> : null}
                  {c.question ? (
                    <p className="mt-3 text-sm leading-6 text-slate-900">
                      <span className="font-semibold">Sorusu:</span> {c.question}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {error ? <div className="mt-4"><Notice tone="bad">{error}</Notice></div> : null}
    </Panel>
  )
}

function LogConfirmRow({ entry, onDone }: { entry: PendingLog; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)

  async function act(action: 'confirm' | 'dispute') {
    setBusy(true)
    await api(`/api/supervision/log/${entry.id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    setBusy(false)
    await onDone()
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-amber-950">
        <span className="font-semibold">{entry.experts?.name || 'Psikolog'}</span>, {formatDate(entry.session_date)}, {entry.duration_minutes} dk
      </p>
      <div className="flex gap-2">
        <button type="button" className={primaryButton} disabled={busy} onClick={() => void act('confirm')}>
          Onayla
        </button>
        <button type="button" className={secondaryButton} disabled={busy} onClick={() => void act('dispute')}>
          Bu seans yapılmadı
        </button>
      </div>
    </li>
  )
}
