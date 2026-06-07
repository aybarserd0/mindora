'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

type ProfileStatus = 'approved' | 'pending' | 'review' | 'passive'
type AccountStatus = 'active' | 'passive'

type ExpertProfile = {
  id: string
  name: string
  title: string
  email: string | null
  phone: string | null
  city: string | null
  specialties: string[]
  experienceYears: number | null
  sessionPrice: number | null
  status: ProfileStatus
  accountStatus: AccountStatus
  approvedAt: string | null
  slug: string | null
  bio: string | null
  publicBio: string | null
  education: string[]
  certificates: string[]
}

type ProfileStats = {
  totalClients: number
  completedSessions: number
  averageRating: number | null
  totalEarnings: number
}

type ProfileApiResponse = {
  ok?: boolean
  error?: string
  profile?: Partial<ExpertProfile> | null
  expert?: Partial<ExpertProfile> | null
  stats?: Partial<ProfileStats> | null
}

const fallbackProfile: ExpertProfile = {
  id: 'fallback-expert',
  name: 'Uzman Profili',
  title: 'Uzman',
  email: null,
  phone: null,
  city: null,
  specialties: [],
  experienceYears: null,
  sessionPrice: null,
  status: 'review',
  accountStatus: 'active',
  approvedAt: null,
  slug: null,
  bio: null,
  publicBio: null,
  education: [],
  certificates: [],
}

const fallbackStats: ProfileStats = {
  totalClients: 0,
  completedSessions: 0,
  averageRating: null,
  totalEarnings: 0,
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeProfile(input: Partial<ExpertProfile> | null | undefined): ExpertProfile {
  return {
    ...fallbackProfile,
    ...input,
    id: safeText(input?.id, fallbackProfile.id),
    name: safeText(input?.name, fallbackProfile.name),
    title: safeText(input?.title, fallbackProfile.title),
    email: cleanNullableText(input?.email),
    phone: cleanNullableText(input?.phone),
    city: cleanNullableText(input?.city),
    slug: cleanNullableText(input?.slug),
    bio: cleanNullableText(input?.bio),
    publicBio: cleanNullableText(input?.publicBio),
    specialties: normalizeStringArray(input?.specialties),
    education: normalizeStringArray(input?.education),
    certificates: normalizeStringArray(input?.certificates),
    experienceYears: normalizeNullableNumber(input?.experienceYears),
    sessionPrice: normalizeNullableNumber(input?.sessionPrice),
    status: normalizeProfileStatus(input?.status),
    accountStatus: normalizeAccountStatus(input?.accountStatus),
    approvedAt: cleanNullableText(input?.approvedAt),
  }
}

function normalizeStats(input: Partial<ProfileStats> | null | undefined): ProfileStats {
  return {
    totalClients: normalizeNumber(input?.totalClients),
    completedSessions: normalizeNumber(input?.completedSessions),
    averageRating: normalizeNullableNumber(input?.averageRating),
    totalEarnings: normalizeNumber(input?.totalEarnings),
  }
}

function normalizeProfileStatus(value: unknown): ProfileStatus {
  if (value === 'approved' || value === 'pending' || value === 'review' || value === 'passive') {
    return value
  }

  return 'review'
}

function normalizeAccountStatus(value: unknown): AccountStatus {
  return value === 'passive' ? 'passive' : 'active'
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function normalizeNullableNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function cleanNullableText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return '-'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function safeText(value: string | null | undefined, fallback = '-') {
  return value && value.trim() ? value.trim() : fallback
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('')

  return initials || 'M'
}

function getProfileStatusLabel(status: ProfileStatus) {
  switch (status) {
    case 'approved':
      return 'Onaylı'
    case 'pending':
      return 'Beklemede'
    case 'review':
      return 'İncelemede'
    case 'passive':
      return 'Pasif'
    default:
      return 'Bilinmiyor'
  }
}

function getProfileStatusClass(status: ProfileStatus) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'review':
      return 'bg-blue-50 text-blue-700 ring-blue-200'
    case 'passive':
      return 'bg-slate-100 text-slate-600 ring-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

function getAccountStatusLabel(status: AccountStatus) {
  return status === 'active' ? 'Aktif' : 'Pasif'
}

export default function ExpertProfilePage() {
  const [profile, setProfile] = useState<ExpertProfile>(fallbackProfile)
  const [stats, setStats] = useState<ProfileStats>(fallbackStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const publicPreviewHref = useMemo(
    () => (profile.slug ? `/expert/${profile.slug}` : '/uzmanlar'),
    [profile.slug]
  )

  const statCards = useMemo(
    () => [
      {
        label: 'Toplam Danışan',
        value: String(stats.totalClients),
        description: 'Platformdaki danışan sayısı',
      },
      {
        label: 'Tamamlanan Seans',
        value: String(stats.completedSessions),
        description: 'Başarıyla tamamlanan görüşme',
      },
      {
        label: 'Ortalama Puan',
        value: stats.averageRating === null ? '-' : stats.averageRating.toFixed(1),
        description: 'Geri bildirimler sonrası',
      },
      {
        label: 'Toplam Kazanç',
        value: formatMoney(stats.totalEarnings),
        description: 'Net uzman kazancı',
      },
    ],
    [stats]
  )

  async function fetchProfile() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/expert/profile', { cache: 'no-store' })
      const data = (await res.json()) as ProfileApiResponse

      if (!res.ok || data.ok === false) {
        setError(data.error || 'Profil bilgileri alınamadı.')
        return
      }

      const rawProfile = data.profile || data.expert || null

      setProfile(normalizeProfile(rawProfile))
      setStats(normalizeStats(data.stats))
    } catch {
      setError('Profil bilgileri alınırken sunucuya bağlanılamadı.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-indigo-50 text-2xl font-black text-indigo-700 ring-1 ring-indigo-100">
              {getInitials(profile.name)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-indigo-600">Uzman Profili</p>
                <StatusBadge status={profile.status} />
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {safeText(profile.name, 'Uzman')}
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-600">
                {safeText(profile.title)} • {safeText(profile.city)}
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Bu sayfa uzmanın kendi panelinde gördüğü internal profil alanıdır.
                E-posta, telefon, kazanç, ödeme ve hesap bilgileri danışana gösterilmez.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link
              href="/expert/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Dashboard'a Dön
            </Link>
            <Link
              href={publicPreviewHref}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Public Görünümü Önizle
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <NoticeCard title="Profil yükleniyor" description="Uzman profil bilgileri getiriliyor." />
      ) : error ? (
        <NoticeCard
          tone="warning"
          title="Profil bilgileri alınamadı"
          description={error}
          actionLabel="Tekrar Dene"
          onAction={fetchProfile}
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel
            title="Profil Bilgileri"
            description="Platform içi uzman hesap bilgileri. Özel alanlar yalnızca uzman ve admin tarafında görünür."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Ad Soyad" value={safeText(profile.name)} />
              <InfoRow label="Unvan" value={safeText(profile.title)} />
              <InfoRow label="E-posta" value={safeText(profile.email)} privateField />
              <InfoRow label="Telefon" value={safeText(profile.phone)} privateField />
              <InfoRow label="Şehir" value={safeText(profile.city)} />
              <InfoRow
                label="Deneyim"
                value={profile.experienceYears === null ? '-' : `${profile.experienceYears} yıl`}
              />
              <InfoRow label="Seans Ücreti" value={formatMoney(profile.sessionPrice)} />
              <InfoRow
                label="Hesap Durumu"
                value={getAccountStatusLabel(profile.accountStatus)}
                privateField
              />
            </div>
          </Panel>

          <Panel
            title="Uzmanlık Alanları"
            description="Danışan eşleşmesinde ve public profilde kullanılacak alanlar."
          >
            <TagList items={profile.specialties} emptyText="Uzmanlık alanı eklenmemiş." />
          </Panel>

          <Panel
            title="Hakkımda"
            description="Internal açıklama ile danışanın göreceği public açıklama ayrı tutulur."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock
                title="Internal Not"
                text={safeText(profile.bio, 'Internal not eklenmemiş.')}
                privateField
              />
              <TextBlock
                title="Public Tanıtım"
                text={safeText(profile.publicBio, 'Public tanıtım metni eklenmemiş.')}
              />
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Onay Durumu" description="Admin inceleme ve hesap bilgileri.">
            <div className="space-y-4">
              <StatusLine label="Profil Durumu" value={getProfileStatusLabel(profile.status)} />
              <StatusLine label="Hesap" value={getAccountStatusLabel(profile.accountStatus)} />
              <StatusLine label="Onay Tarihi" value={formatDate(profile.approvedAt)} />
              <StatusLine label="Public Slug" value={safeText(profile.slug)} />
            </div>
          </Panel>

          <Panel title="Eğitim" description="Public profilde gösterilebilir.">
            <List items={profile.education} emptyText="Eğitim bilgisi eklenmemiş." />
          </Panel>

          <Panel title="Sertifikalar" description="Güven artırıcı profil alanı.">
            <List items={profile.certificates} emptyText="Sertifika eklenmemiş." />
          </Panel>
        </aside>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-bold text-amber-900">Gizlilik Notu</p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          E-posta, telefon, kazanç, payout, komisyon, admin notları, internal profil
          notları ve hesap statüleri sadece uzman paneli ve admin tarafında görünmelidir.
          Danışan tarafındaki public profilde yalnızca güven veren mesleki bilgiler gösterilmelidir.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoBlock
            title="Veri Kaynağı"
            value="/api/expert/profile"
            description="Bu sayfa uzman profil verisini API üzerinden alır."
          />
          <InfoBlock
            title="Public Profil Kaynağı"
            value="slug"
            description="Danışanın göreceği uzman profili slug üzerinden açılır."
          />
          <InfoBlock
            title="Güvenlik Kuralı"
            value="private fields"
            description="Özel alanlar public route tarafında asla render edilmemeli."
          />
        </div>
      </section>
    </main>
  )
}

function NoticeCard({
  title,
  description,
  tone = 'default',
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  tone?: 'default' | 'warning'
  actionLabel?: string
  onAction?: () => void
}) {
  const className =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-white text-slate-700'

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  )
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getProfileStatusClass(
        status
      )}`}
    >
      {getProfileStatusLabel(status)}
    </span>
  )
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function InfoRow({
  label,
  value,
  privateField = false,
}: {
  label: string
  value: string
  privateField?: boolean
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        {privateField && <PrivateBadge />}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function TextBlock({
  title,
  text,
  privateField = false,
}: {
  title: string
  text: string
  privateField?: boolean
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        {privateField && <PrivateBadge />}
      </div>
      <p className="text-sm leading-6 text-slate-600">{text}</p>
    </div>
  )
}

function PrivateBadge() {
  return (
    <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-100">
      Özel
    </span>
  )
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-950">{value}</span>
    </div>
  )
}

function TagList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function List({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText}</p>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-100"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function InfoBlock({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}
