'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import CaseForm, { type CaseRecord } from '@/components/supervision/CaseForm'
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
  BADGE_MIN_SESSIONS,
  BADGE_WINDOW_DAYS,
  BOOKING_STATUS_LABELS,
  ROOM_CLOSE_AFTER_MINUTES,
  ROOM_OPEN_BEFORE_MINUTES,
  SUPERVISION_APPROACHES,
  type BookingStatus,
} from '@/lib/supervision/constants'

type Supervisor = {
  id: string
  name: string
  title: string | null
  photoUrl: string | null
  approaches: string[]
  focusAreas: string[]
  bio: string | null
  yearsExperience: number | null
  sessionPrice: number | null
  introCallEnabled: boolean
  availabilityNote: string | null
}

type Booking = {
  id: string
  kind: 'intro' | 'individual'
  status: BookingStatus
  requested_start: string
  duration_minutes: number
  price: number
  decline_reason: string | null
  supervisor_profiles?: { id: string; experts: { name: string | null; title: string | null } }
}

type LogEntry = {
  id: string
  session_date: string
  duration_minutes: number
  approach: string | null
  status: 'pending' | 'confirmed' | 'disputed'
  verification_code: string
  supervisor_profiles: { experts: { name: string | null } }
}

type LogSummary = { confirmedSessions: number; totalMinutes: number; recentSessions: number; badgeEligible: boolean }

const TABS = [
  { id: 'bul', label: 'Süpervizör bul' },
  { id: 'randevular', label: 'Randevularım' },
  { id: 'vakalar', label: 'Vaka kartlarım' },
  { id: 'defter', label: 'Saat defterim' },
] as const

type TabId = (typeof TABS)[number]['id']

function statusTone(status: BookingStatus) {
  if (status === 'confirmed') return 'good' as const
  if (status === 'accepted' || status === 'requested') return 'warn' as const
  if (status === 'completed') return 'accent' as const
  if (status === 'declined' || status === 'cancelled' || status === 'no_show') return 'bad' as const
  return 'neutral' as const
}

function isRoomOpen(b: Booking, now: number) {
  const start = new Date(b.requested_start).getTime()
  return now >= start - ROOM_OPEN_BEFORE_MINUTES * 60_000 && now <= start + (b.duration_minutes + ROOM_CLOSE_AFTER_MINUTES) * 60_000
}

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { ok?: boolean; error?: string } }> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string }
  return { ok: res.ok && data?.ok !== false, data }
}

export default function SupervisionPage() {
  const [tab, setTab] = useState<TabId>('bul')
  const [banner, setBanner] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)

  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [log, setLog] = useState<{ entries: LogEntry[]; summary: LogSummary } | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    const [s, b, c, l] = await Promise.all([
      api<{ supervisors: Supervisor[] }>('/api/supervision/supervisors'),
      api<{ asSupervisee: Booking[] }>('/api/supervision/bookings'),
      api<{ cases: CaseRecord[] }>('/api/supervision/cases'),
      api<{ entries: LogEntry[]; summary: LogSummary }>('/api/supervision/log'),
    ])
    if (s.ok) setSupervisors(s.data.supervisors || [])
    if (b.ok) setBookings(b.data.asSupervisee || [])
    if (c.ok) setCases(c.data.cases || [])
    if (l.ok) setLog({ entries: l.data.entries || [], summary: l.data.summary })
    setLoading(false)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('odeme')
    const timer = window.setTimeout(() => {
      if (result === 'basarili') {
        setBanner({ tone: 'good', text: 'Ödeme tamamlandı, seansın kesinleşti.' })
        setTab('randevular')
      } else if (result === 'basarisiz') {
        setBanner({ tone: 'bad', text: 'Ödeme tamamlanamadı. Randevularım sekmesinden tekrar deneyebilirsin.' })
        setTab('randevular')
      }
      void refresh()
    }, 0)
    const clock = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(clock)
    }
  }, [refresh])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageIntro title="Süpervizyon">
        Kıdemli meslektaşlarından online süpervizyon al, vakalarını anonim olarak paylaş ve
        saatlerini kayıt altında tut.
      </PageIntro>

      {banner ? (
        <div className="mt-6">
          <Notice tone={banner.tone}>{banner.text}</Notice>
        </div>
      ) : null}

      <div role="tablist" aria-label="Süpervizyon bölümleri" className="mt-8 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-[0.95rem] transition-colors ${
              tab === t.id ? 'border-pine-700 font-semibold text-pine-900' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : tab === 'bul' ? (
          <Directory supervisors={supervisors} onRequested={() => { void refresh(); setTab('randevular'); setBanner({ tone: 'good', text: 'Talebin gönderildi. Süpervizör yanıtlayınca bildirim alacaksın.' }) }} />
        ) : tab === 'randevular' ? (
          <Bookings bookings={bookings} cases={cases} now={now} onChange={refresh} />
        ) : tab === 'vakalar' ? (
          <Cases cases={cases} onChange={refresh} />
        ) : (
          <Logbook log={log} />
        )}
      </div>
    </div>
  )
}

function Directory({ supervisors, onRequested }: { supervisors: Supervisor[]; onRequested: () => void }) {
  const [approach, setApproach] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [requesting, setRequesting] = useState<Supervisor | null>(null)

  const filtered = useMemo(
    () =>
      supervisors.filter(
        (s) =>
          (!approach || s.approaches.includes(approach)) &&
          (!maxPrice || (s.sessionPrice !== null && Number(s.sessionPrice) <= Number(maxPrice)))
      ),
    [supervisors, approach, maxPrice]
  )

  if (supervisors.length === 0) {
    return (
      <Panel>
        <h2 className="text-xl font-semibold text-slate-900">Henüz onaylı süpervizör yok</h2>
        <p className="mt-2 max-w-xl leading-7 text-slate-600">
          İlk süpervizörlerimizi seçiyoruz. En az 5 yıllık klinik deneyimin varsa sen de başvurabilirsin.
        </p>
        <Link href="/expert/dashboard/supervizor" className={`${secondaryButton} mt-5`}>
          Süpervizör olarak başvur
        </Link>
      </Panel>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sm:w-72">
          <span className="sr-only">Ekol</span>
          <select className={inputClass} value={approach} onChange={(e) => setApproach(e.target.value)}>
            <option value="">Tüm ekoller</option>
            {SUPERVISION_APPROACHES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="sm:w-56">
          <span className="sr-only">En yüksek ücret</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            placeholder="En yüksek ücret (TL)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
      </div>

      <ul className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((s) => (
          <li key={s.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {s.photoUrl ? (
                <img src={s.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lilac-100 font-display text-lg font-semibold text-lilac-800">
                  {s.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{s.name}</h3>
                <p className="text-sm text-slate-500">
                  {[s.title, s.yearsExperience ? `${s.yearsExperience} yıl deneyim` : null].filter(Boolean).join(', ')}
                </p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block font-display text-lg font-semibold text-slate-900">{formatMoney(s.sessionPrice)}</span>
                <span className="text-xs text-slate-500">50 dk</span>
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {s.approaches.map((a) => (
                <span key={a} className="rounded-full bg-pine-50 px-2.5 py-1 text-xs font-medium text-pine-800">
                  {a}
                </span>
              ))}
            </div>

            {s.bio ? <p className="mt-4 line-clamp-4 text-[0.95rem] leading-7 text-slate-600">{s.bio}</p> : null}
            {s.availabilityNote ? <p className="mt-3 text-sm text-slate-500">Müsaitlik: {s.availabilityNote}</p> : null}

            <div className="mt-auto pt-5">
              <button type="button" className={primaryButton} onClick={() => setRequesting(s)}>
                Talep gönder
              </button>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? <p className="mt-6 text-sm text-slate-500">Bu filtrelere uyan süpervizör yok.</p> : null}

      {requesting ? (
        <RequestDialog supervisor={requesting} onClose={() => setRequesting(null)} onDone={() => { setRequesting(null); onRequested() }} />
      ) : null}
    </div>
  )
}

function RequestDialog({ supervisor, onClose, onDone }: { supervisor: Supervisor; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<'intro' | 'individual'>(supervisor.introCallEnabled ? 'intro' : 'individual')
  const [start, setStart] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    setSending(true)
    setError('')
    const { ok, data } = await api('/api/supervision/bookings', {
      method: 'POST',
      body: JSON.stringify({ supervisorProfileId: supervisor.id, kind, requestedStart: new Date(start).toISOString(), note }),
    })
    setSending(false)
    if (!ok) {
      setError(data?.error || 'Talep gönderilemedi.')
      return
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="talep-baslik"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="talep-baslik" className="text-xl font-semibold text-slate-900">
          {supervisor.name} ile süpervizyon
        </h2>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1.5 text-sm font-medium text-slate-800">Görüşme türü</legend>
            {supervisor.introCallEnabled ? (
              <label className={`cursor-pointer rounded-xl border p-3 ${kind === 'intro' ? 'border-pine-600 bg-pine-50' : 'border-slate-200'}`}>
                <input type="radio" name="kind" className="sr-only" checked={kind === 'intro'} onChange={() => setKind('intro')} />
                <span className="block text-sm font-semibold text-slate-900">Tanışma görüşmesi</span>
                <span className="block text-xs text-slate-500">15 dakika, ücretsiz</span>
              </label>
            ) : null}
            <label className={`cursor-pointer rounded-xl border p-3 ${kind === 'individual' ? 'border-pine-600 bg-pine-50' : 'border-slate-200'}`}>
              <input type="radio" name="kind" className="sr-only" checked={kind === 'individual'} onChange={() => setKind('individual')} />
              <span className="block text-sm font-semibold text-slate-900">Bireysel süpervizyon</span>
              <span className="block text-xs text-slate-500">50 dakika, {formatMoney(supervisor.sessionPrice)}</span>
            </label>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-800">Önerdiğin tarih ve saat</span>
            <input className={inputClass} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            {supervisor.availabilityNote ? (
              <span className="mt-1 block text-xs text-slate-500">Süpervizörün müsaitliği: {supervisor.availabilityNote}</span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-800">Kısa not (isteğe bağlı)</span>
            <textarea
              className={`${inputClass} min-h-24`}
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ne üzerinde çalışmak istediğini genel olarak yaz. Danışan bilgisi paylaşma."
            />
          </label>

          {error ? <Notice tone="bad">{error}</Notice> : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={primaryButton} disabled={sending || !start}>
              {sending ? 'Gönderiliyor' : 'Talebi gönder'}
            </button>
            <button type="button" className={secondaryButton} onClick={onClose}>
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Bookings({ bookings, cases, now, onChange }: { bookings: Booking[]; cases: CaseRecord[]; now: number; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function act(id: string, action: string) {
    setBusy(id)
    setError('')
    const { ok, data } = await api(`/api/supervision/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    if (!ok) setError(data?.error || 'İşlem yapılamadı.')
    await onChange()
    setBusy(null)
  }

  async function pay(id: string) {
    setBusy(id)
    setError('')
    const { ok, data } = await api<{ paymentPageUrl?: string }>(`/api/supervision/bookings/${id}/pay`, { method: 'POST' })
    if (!ok || !data.paymentPageUrl) {
      setError(data?.error || 'Ödeme sayfası açılamadı.')
      setBusy(null)
      return
    }
    window.location.assign(data.paymentPageUrl)
  }

  if (bookings.length === 0) {
    return (
      <Panel>
        <h2 className="text-xl font-semibold text-slate-900">Henüz randevun yok</h2>
        <p className="mt-2 leading-7 text-slate-600">Süpervizör bul sekmesinden ilk talebini gönderebilirsin.</p>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      {error ? <Notice tone="bad">{error}</Notice> : null}
      {bookings.map((b) => {
        const supervisorName = b.supervisor_profiles?.experts?.name || 'Süpervizör'
        const started = now >= new Date(b.requested_start).getTime()
        return (
          <Panel key={b.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{supervisorName}</h3>
                  <StatusPill tone={statusTone(b.status)}>{BOOKING_STATUS_LABELS[b.status]}</StatusPill>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {b.kind === 'intro' ? 'Tanışma görüşmesi' : 'Bireysel süpervizyon'}, {formatDateTime(b.requested_start)}, {b.duration_minutes} dk
                  {b.price > 0 ? `, ${formatMoney(b.price)}` : ''}
                </p>
                {b.status === 'declined' && b.decline_reason ? (
                  <p className="mt-2 text-sm text-slate-500">Süpervizörün notu: {b.decline_reason}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {b.status === 'accepted' ? (
                  <button type="button" className={primaryButton} disabled={busy === b.id} onClick={() => void pay(b.id)}>
                    Ödemeyi tamamla
                  </button>
                ) : null}
                {b.status === 'confirmed' && isRoomOpen(b, now) ? (
                  <Link href={`/expert/dashboard/supervizyon/oda/${b.id}`} className={primaryButton}>
                    Görüşmeye katıl
                  </Link>
                ) : null}
                {b.status === 'confirmed' && started ? (
                  <button type="button" className={secondaryButton} disabled={busy === b.id} onClick={() => void act(b.id, 'complete')}>
                    Tamamlandı olarak işaretle
                  </button>
                ) : null}
                {['requested', 'accepted', 'confirmed'].includes(b.status) && !started ? (
                  <button type="button" className={dangerButton} disabled={busy === b.id} onClick={() => void act(b.id, 'cancel')}>
                    İptal et
                  </button>
                ) : null}
              </div>
            </div>

            {b.kind === 'individual' && ['requested', 'accepted', 'confirmed'].includes(b.status) ? (
              <BookingCases bookingId={b.id} cases={cases} />
            ) : null}
          </Panel>
        )
      })}
    </div>
  )
}

function BookingCases({ bookingId, cases }: { bookingId: string; cases: CaseRecord[] }) {
  const [shared, setShared] = useState<{ id: string; topic: string; label: string | null }[]>([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { ok, data } = await api<{ cases: { id: string; topic: string; label: string | null }[] }>(`/api/supervision/bookings/${bookingId}/cases`)
    if (ok) setShared(data.cases || [])
  }, [bookingId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const available = cases.filter((c) => c.status !== 'closed' && c.consent_attested && !shared.some((s) => s.id === c.id))

  async function add() {
    if (!selected) return
    setError('')
    const { ok, data } = await api(`/api/supervision/bookings/${bookingId}/cases`, { method: 'POST', body: JSON.stringify({ caseId: selected }) })
    if (!ok) setError(data?.error || 'Vaka eklenemedi.')
    setSelected('')
    await load()
  }

  async function remove(caseId: string) {
    await api(`/api/supervision/bookings/${bookingId}/cases?caseId=${caseId}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <p className="text-sm font-medium text-slate-800">Bu seansta konuşulacak vakalar</p>
      {shared.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {shared.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
              <span>
                {c.label || 'Vaka'} ({c.topic})
              </span>
              <button type="button" onClick={() => void remove(c.id)} className="text-sm font-medium text-rose-700 hover:underline">
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Henüz vaka eklemedin.</p>
      )}

      {available.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select className={`${inputClass} sm:max-w-xs`} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Vaka kartı seç</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.topic})
              </option>
            ))}
          </select>
          <button type="button" className={secondaryButton} onClick={() => void add()} disabled={!selected}>
            Seansa ekle
          </button>
        </div>
      ) : null}
      {error ? <div className="mt-2"><Notice tone="bad">{error}</Notice></div> : null}
    </div>
  )
}

function Cases({ cases, onChange }: { cases: CaseRecord[]; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState<CaseRecord | 'new' | null>(null)

  async function close(id: string) {
    await api(`/api/supervision/cases/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'close' }) })
    await onChange()
  }

  async function remove(id: string) {
    if (!window.confirm('Bu vaka kartı kalıcı olarak silinecek. Emin misin?')) return
    await api(`/api/supervision/cases/${id}`, { method: 'DELETE' })
    await onChange()
  }

  if (editing) {
    return (
      <Panel className="max-w-3xl">
        <h2 className="mb-5 text-xl font-semibold text-slate-900">{editing === 'new' ? 'Yeni vaka kartı' : 'Vaka kartını düzenle'}</h2>
        <CaseForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void onChange()
          }}
        />
      </Panel>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl leading-7 text-slate-600">
          Vaka kartları danışanına bağlanmaz ve yalnızca seansa eklediğin süpervizör görebilir.
          Seans tamamlanınca kart kapanır ve 90 gün sonra silinir.
        </p>
        <button type="button" className={primaryButton} onClick={() => setEditing('new')}>
          Yeni vaka kartı
        </button>
      </div>

      {cases.length === 0 ? (
        <Panel className="mt-6">
          <p className="text-slate-600">Henüz vaka kartın yok.</p>
        </Panel>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {cases.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{c.label}</p>
                  <StatusPill tone={c.status === 'shared' ? 'accent' : c.status === 'closed' ? 'neutral' : 'warn'}>
                    {c.status === 'shared' ? 'Paylaşıldı' : c.status === 'closed' ? 'Kapandı' : 'Taslak'}
                  </StatusPill>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {[c.topic, c.age_range, c.session_count !== null ? `${c.session_count} seans` : null].filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== 'closed' ? (
                  <>
                    <button type="button" className={secondaryButton} onClick={() => setEditing(c)}>
                      Düzenle
                    </button>
                    <button type="button" className={secondaryButton} onClick={() => void close(c.id)}>
                      Kapat
                    </button>
                  </>
                ) : null}
                <button type="button" className={dangerButton} onClick={() => void remove(c.id)}>
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Logbook({ log }: { log: { entries: LogEntry[]; summary: LogSummary } | null }) {
  if (!log) return <Notice tone="bad">Saat defteri yüklenemedi.</Notice>
  const hours = (log.summary.totalMinutes / 60).toLocaleString('tr-TR', { maximumFractionDigits: 1 })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-sm text-slate-500">Onaylı süpervizyon</p>
          <p className="mt-1 font-display text-3xl font-semibold text-slate-900">{hours} saat</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-500">Onaylı seans</p>
          <p className="mt-1 font-display text-3xl font-semibold text-slate-900">{log.summary.confirmedSessions}</p>
        </Panel>
        <Panel className={log.summary.badgeEligible ? 'border-lilac-300 bg-lilac-50' : ''}>
          <p className="text-sm text-slate-500">Süpervizyonlu Uzman rozeti</p>
          <p className="mt-1 text-[0.95rem] leading-6 text-slate-800">
            {log.summary.badgeEligible
              ? 'Koşulu sağlıyorsun.'
              : `Son ${BADGE_WINDOW_DAYS} günde ${log.summary.recentSessions}/${BADGE_MIN_SESSIONS} onaylı seans.`}
          </p>
        </Panel>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Defter, seansların Mindora üzerinden yapıldığının kaydıdır; sertifika ya da yeterlilik belgesi değildir.
        </p>
        <Link href="/expert/dashboard/supervizyon/defter" className={secondaryButton}>
          Yazdır veya PDF olarak kaydet
        </Link>
      </div>

      {log.entries.length === 0 ? (
        <Panel>
          <p className="text-slate-600">Tamamlanan bireysel seanslar burada görünür.</p>
        </Panel>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tarih</th>
                <th className="px-5 py-3 font-medium">Süpervizör</th>
                <th className="px-5 py-3 font-medium">Süre</th>
                <th className="px-5 py-3 font-medium">Durum</th>
                <th className="px-5 py-3 font-medium">Doğrulama kodu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {log.entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 text-slate-800">{formatDate(e.session_date)}</td>
                  <td className="px-5 py-3 text-slate-800">{e.supervisor_profiles?.experts?.name || '-'}</td>
                  <td className="px-5 py-3 text-slate-800">{e.duration_minutes} dk</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={e.status === 'confirmed' ? 'good' : e.status === 'pending' ? 'warn' : 'bad'}>
                      {e.status === 'confirmed' ? 'Onaylı' : e.status === 'pending' ? 'Onay bekliyor' : 'İtiraz edildi'}
                    </StatusPill>
                  </td>
                  <td className="px-5 py-3 font-medium tabular-nums text-slate-700">{e.status === 'confirmed' ? e.verification_code : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
