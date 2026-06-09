'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type ClientPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'unknown' | string

type ApiClientProfile = {
  id?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  age?: string | number | null
  topic?: string | null
  preference?: string | null
  previousSupport?: string | null
  availability?: string | null
  note?: string | null
  status?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type ApiExpertProfile = {
  id?: string | null
  name?: string | null
  title?: string | null
  email?: string | null
  photoUrl?: string | null
  slug?: string | null
  specialties?: string[] | string | null
}

type ClientProfileStats = {
  totalSessions?: number | null
  completedSessions?: number | null
  upcomingSessions?: number | null
  totalPayments?: number | null
  recentMessages?: number | null
}

type ClientProfileResponse = {
  ok?: boolean
  client?: ApiClientProfile | null
  profile?: ApiClientProfile | null
  expert?: ApiExpertProfile | null
  stats?: ClientProfileStats | null
  paymentStatus?: ClientPaymentStatus | null
  conversationId?: string | null
  chatHref?: string | null
  error?: string
}

type UiClientProfile = {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  age: string | null
  topic: string | null
  preference: string | null
  previousSupport: string | null
  availability: string | null
  note: string | null
  status: string
  createdAt: string | null
  updatedAt: string | null
}

type UiExpertProfile = {
  id: string | null
  name: string
  title: string
  email: string | null
  photoUrl: string | null
  slug: string | null
  specialties: string[]
}

type UiStats = {
  totalSessions: number
  completedSessions: number
  upcomingSessions: number
  totalPayments: number
  recentMessages: number
}

const EMPTY_VALUE = 'Profil tamamlanmayı bekliyor'

const DEFAULT_CLIENT: UiClientProfile = {
  id: 'client-profile',
  name: 'Danışan',
  email: null,
  phone: null,
  city: null,
  age: null,
  topic: null,
  preference: null,
  previousSupport: null,
  availability: null,
  note: null,
  status: 'pending',
  createdAt: null,
  updatedAt: null,
}

const DEFAULT_EXPERT: UiExpertProfile = {
  id: null,
  name: 'Uzman eşleştirme sürecinde',
  title: 'Mindora eşleşme ekibi tarafından atanacak',
  email: null,
  photoUrl: null,
  slug: null,
  specialties: [],
}

const DEFAULT_STATS: UiStats = {
  totalSessions: 0,
  completedSessions: 0,
  upcomingSessions: 0,
  totalPayments: 0,
  recentMessages: 0,
}

function cleanText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function cleanNullableText(value: unknown) {
  const text = cleanText(value)
  return text || null
}

function displayValue(value: string | null | undefined, fallback = EMPTY_VALUE) {
  return cleanText(value, fallback)
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean)

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((item) => cleanText(item)).filter(Boolean)
    } catch {
      // comma separated fallback
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function formatDate(value?: string | null) {
  if (!value) return 'Tarih bekleniyor'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tarih bekleniyor'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatMoney(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return '₺0'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount)
}

function buildTokenUrl(path: string | null | undefined, token: string) {
  if (!path) return '#'
  if (!token) return path

  try {
    const isAbsolute = /^https?:\/\//i.test(path)
    const url = isAbsolute ? new URL(path) : new URL(path, 'https://mindora.local')

    if (!url.searchParams.get('token')) url.searchParams.set('token', token)
    if (isAbsolute) return url.toString()

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    if (path.includes('token=')) return path
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}token=${encodeURIComponent(token)}`
  }
}

function statusLabel(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'active') return 'Aktif'
  if (normalized === 'pending' || normalized === 'unknown') return 'Bekleniyor'
  if (normalized === 'matched') return 'Eşleşti'
  if (normalized === 'completed') return 'Tamamlandı'
  if (normalized === 'closed') return 'Kapalı'
  if (normalized === 'cancelled' || normalized === 'canceled') return 'İptal'

  return status || 'Bekleniyor'
}

function paymentStatusLabel(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'paid') return 'Ödeme tamamlandı'
  if (normalized === 'pending') return 'Ödeme bekleniyor'
  if (normalized === 'failed') return 'Ödeme başarısız'
  if (normalized === 'refunded') return 'Ödeme iade edildi'

  return 'Bekleniyor'
}

function normalizeClient(input: ApiClientProfile | null | undefined): UiClientProfile {
  const raw = input || {}

  return {
    id: cleanText(raw.id, DEFAULT_CLIENT.id),
    name: cleanText(raw.name, DEFAULT_CLIENT.name),
    email: cleanNullableText(raw.email),
    phone: cleanNullableText(raw.phone),
    city: cleanNullableText(raw.city),
    age: cleanNullableText(raw.age),
    topic: cleanNullableText(raw.topic),
    preference: cleanNullableText(raw.preference),
    previousSupport: cleanNullableText(raw.previousSupport),
    availability: cleanNullableText(raw.availability),
    note: cleanNullableText(raw.note),
    status: cleanText(raw.status, DEFAULT_CLIENT.status),
    createdAt: cleanNullableText(raw.createdAt),
    updatedAt: cleanNullableText(raw.updatedAt),
  }
}

function normalizeExpert(input: ApiExpertProfile | null | undefined): UiExpertProfile {
  const raw = input || {}

  return {
    id: cleanNullableText(raw.id),
    name: cleanText(raw.name, DEFAULT_EXPERT.name),
    title: cleanText(raw.title, DEFAULT_EXPERT.title),
    email: cleanNullableText(raw.email),
    photoUrl: cleanNullableText(raw.photoUrl),
    slug: cleanNullableText(raw.slug),
    specialties: textList(raw.specialties),
  }
}

function normalizeStats(input: ClientProfileStats | null | undefined): UiStats {
  const raw = input || {}

  return {
    totalSessions: toNumber(raw.totalSessions),
    completedSessions: toNumber(raw.completedSessions),
    upcomingSessions: toNumber(raw.upcomingSessions),
    totalPayments: toNumber(raw.totalPayments),
    recentMessages: toNumber(raw.recentMessages),
  }
}

function initials(name: string) {
  const result = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('')

  return result || 'M'
}

function hasAssignedExpert(expert: UiExpertProfile) {
  return Boolean(expert.id || expert.slug || expert.email || expert.name !== DEFAULT_EXPERT.name)
}

function ClientProfileContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [client, setClient] = useState<UiClientProfile>(DEFAULT_CLIENT)
  const [expert, setExpert] = useState<UiExpertProfile>(DEFAULT_EXPERT)
  const [stats, setStats] = useState<UiStats>(DEFAULT_STATS)
  const [paymentStatus, setPaymentStatus] = useState<ClientPaymentStatus>('unknown')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [chatHref, setChatHref] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [softNotice, setSoftNotice] = useState('')

  const dashboardHref = useMemo(() => buildTokenUrl('/client/dashboard', token), [token])
  const sessionsHref = useMemo(() => buildTokenUrl('/client/dashboard/sessions', token), [token])
  const paymentsHref = useMemo(() => buildTokenUrl('/client/dashboard/payments', token), [token])
  const filesHref = useMemo(() => buildTokenUrl('/client/dashboard/files', token), [token])

  const safeChatHref = useMemo(() => {
    if (chatHref) return buildTokenUrl(chatHref, token)
    if (conversationId) return buildTokenUrl(`/client/chat/${conversationId}`, token)
    return '#'
  }, [chatHref, conversationId, token])

  const expertPublicHref = useMemo(
    () => (expert.slug ? `/uzmanlar/${expert.slug}` : '/uzmanlar'),
    [expert.slug]
  )

  const expertAssigned = hasAssignedExpert(expert)

  const fetchProfile = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!token) {
        setSoftNotice('Güvenli erişim bağlantısı bulunamadı. Size iletilen danışan paneli bağlantısını kullanabilirsiniz.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      try {
        if (mode === 'initial') setLoading(true)
        else setRefreshing(true)

        setSoftNotice('')

        const response = await fetch(`/api/client/profile?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        const data = (await response.json().catch(() => ({}))) as ClientProfileResponse

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || 'Profil bilgileriniz henüz tamamlanmadı.')
        }

        setClient(normalizeClient(data.client || data.profile || null))
        setExpert(normalizeExpert(data.expert || null))
        setStats(normalizeStats(data.stats || null))
        setPaymentStatus(data.paymentStatus || 'unknown')
        setConversationId(cleanNullableText(data.conversationId))
        setChatHref(cleanNullableText(data.chatHref))
      } catch (err) {
        setClient(DEFAULT_CLIENT)
        setExpert(DEFAULT_EXPERT)
        setStats(DEFAULT_STATS)
        setPaymentStatus('unknown')
        setConversationId(null)
        setChatHref(null)
        setSoftNotice(
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Profil bilgileriniz henüz tamamlanmadı.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void fetchProfile('initial')
  }, [fetchProfile])

  if (loading) {
    return (
      <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-black text-slate-600">Profil yükleniyor...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                  Mindora Danışan Paneli
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Profilim
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Danışan bilgilerinizi, eşleşme sürecinizi, seans özetinizi ve hesap
                  güvenliğinizi tek ekrandan takip edin.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusPill>{statusLabel(client.status)}</StatusPill>
                  <StatusPill tone="green">{paymentStatusLabel(paymentStatus)}</StatusPill>
                  <StatusPill tone="blue">
                    {expertAssigned ? `Uzman: ${expert.name}` : 'Uzman eşleştirme sürecinde'}
                  </StatusPill>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <button
                  type="button"
                  onClick={() => void fetchProfile('refresh')}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? 'Yükleniyor...' : 'Yenile'}
                </button>
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                >
                  Dashboard
                </Link>
                <Link
                  href={safeChatHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
                >
                  Sohbete Git
                </Link>
              </div>
            </div>
          </div>

          {softNotice ? (
            <div className="border-t border-indigo-100 bg-indigo-50 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-indigo-950">
                    Profil bilgileriniz henüz tamamlanmadı
                  </p>
                  <p className="mt-1 text-sm leading-6 text-indigo-800">
                    Bilgileriniz eşleşme ve danışan süreci ilerledikçe burada güncellenecektir.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-indigo-500">{softNotice}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchProfile('refresh')}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md"
                >
                  Yenile
                </button>
              </div>
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Toplam Seans" value={String(stats.totalSessions)} description="Tüm randevu kayıtları" />
          <SummaryCard title="Tamamlanan" value={String(stats.completedSessions)} description="Geçmiş görüşmeler" />
          <SummaryCard title="Yaklaşan" value={String(stats.upcomingSessions)} description="Planlanan seanslar" />
          <SummaryCard title="Toplam Ödeme" value={formatMoney(stats.totalPayments)} description="Başarılı ödemeler" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Panel title="Kişisel Bilgiler" description="Başvuru ve danışan profil bilgileriniz.">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Ad Soyad" value={client.name} />
                <InfoRow label="E-posta" value={displayValue(client.email)} />
                <InfoRow label="Telefon" value={displayValue(client.phone)} />
                <InfoRow label="Şehir" value={displayValue(client.city)} />
                <InfoRow label="Yaş" value={displayValue(client.age)} />
                <InfoRow label="Hesap Durumu" value={statusLabel(client.status)} />
                <InfoRow label="Kayıt Tarihi" value={formatDate(client.createdAt)} />
                <InfoRow label="Son Güncelleme" value={formatDate(client.updatedAt)} />
              </div>
            </Panel>

            <Panel title="Destek Bilgileri" description="Eşleşme sürecinde kullanılan danışan ihtiyaç bilgileri.">
              <div className="grid gap-4 lg:grid-cols-2">
                <TextBlock title="Başvuru Konusu" text={displayValue(client.topic)} />
                <TextBlock title="Uzman Tercihi" text={displayValue(client.preference)} />
                <TextBlock title="Daha Önce Destek" text={displayValue(client.previousSupport)} />
                <TextBlock title="Uygunluk" text={displayValue(client.availability)} />
              </div>
              <div className="mt-4">
                <TextBlock title="Not" text={client.note || 'Ek not henüz paylaşılmadı.'} />
              </div>
            </Panel>

            <Panel title="Hızlı İşlemler" description="Danışan panelindeki sık kullanılan adımlar.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickLink href={sessionsHref} title="Seanslarım" description="Randevular" />
                <QuickLink href={paymentsHref} title="Ödemelerim" description="Ödeme geçmişi" />
                <QuickLink href={filesHref} title="Dosyalarım" description="Paylaşımlar" />
                <QuickLink href={safeChatHref} title="Sohbet" description="Uzmanla chat" />
              </div>
            </Panel>
          </div>

          <aside className="space-y-6">
            <Panel
              title={expertAssigned ? 'Eşleştiğiniz Uzman' : 'Uzman Eşleştirme'}
              description={
                expertAssigned
                  ? 'Mindora sürecinizde size atanmış uzman.'
                  : 'Başvurunuza göre en uygun uzman eşleştirmesi hazırlanıyor.'
              }
            >
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-indigo-600 text-xl font-black text-white">
                  {expert.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={expert.photoUrl} alt={expert.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(expert.name)
                  )}
                </div>

                <div>
                  <p className="text-base font-black text-slate-950">{expert.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{expert.title}</p>
                  {expert.email ? <p className="mt-1 text-xs text-slate-500">{expert.email}</p> : null}
                </div>
              </div>

              {expert.specialties.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {expert.specialties.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm font-bold text-slate-700">
                    Uzmanlık bilgileri eşleşme tamamlandığında burada görünecek.
                  </p>
                </div>
              )}

              <div className="mt-5 grid gap-3">
                <Link
                  href={safeChatHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
                >
                  Uzmanla Sohbete Git
                </Link>
                <Link
                  href={expertPublicHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                >
                  Uzman Profilini Aç
                </Link>
              </div>
            </Panel>

            <Panel title="Güvenlik" description="Hesap ve erişim güvenliği bilgileri.">
              <div className="space-y-3">
                <StatusLine label="Erişim Tipi" value="Güvenli token" />
                <StatusLine label="Ödeme Durumu" value={paymentStatusLabel(paymentStatus)} />
                <StatusLine label="Chat Erişimi" value={conversationId ? 'Aktif' : 'Beklemede'} />
                <StatusLine label="Dosya Erişimi" value="Kontrollü" />
              </div>
            </Panel>

            <section className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <h2 className="text-lg font-black text-indigo-950">Mindora notu</h2>
              <p className="mt-2 text-sm leading-6 text-indigo-800">
                Profil bilgileriniz eşleşme ve destek sürecinin sağlıklı yönetilmesi için kullanılır.
                Hassas bilgileri yalnızca güvenli bağlantılar üzerinden paylaşmanız önerilir.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </section>
  )
}

function StatusPill({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'green' | 'blue' }) {
  const className =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : tone === 'blue'
        ? 'bg-blue-50 text-blue-700 ring-blue-100'
        : 'bg-slate-100 text-slate-700 ring-slate-200'

  return <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>{children}</span>
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{text}</p>
    </div>
  )
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-lg"
    >
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
    </Link>
  )
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-right text-sm font-black text-slate-950">{value}</span>
    </div>
  )
}

export default function ClientDashboardProfilePage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Profil yükleniyor...</p>
          </div>
        </section>
      }
    >
      <ClientProfileContent />
    </Suspense>
  )
}
