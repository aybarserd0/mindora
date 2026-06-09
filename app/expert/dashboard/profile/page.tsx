'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  focusAreas: string[]
  experienceYears: number | null
  sessionPrice: number | null
  status: ProfileStatus
  accountStatus: AccountStatus
  approvedAt: string | null
  slug: string | null
  bio: string | null
  publicBio: string | null
  approach: string | null
  education: string[]
  certificates: string[]
  profileImageUrl: string | null
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
  publicProfile?: Partial<ExpertProfile> | null
  stats?: Partial<ProfileStats> | null
}

type NoticeState = {
  title: string
  description: string
  tone: 'warning' | 'success' | 'default'
} | null

const DEFAULT_PROFILE: ExpertProfile = {
  id: 'expert-profile',
  name: 'Uzman Profili',
  title: 'Uzman',
  email: null,
  phone: null,
  city: null,
  specialties: [],
  focusAreas: [],
  experienceYears: null,
  sessionPrice: null,
  status: 'review',
  accountStatus: 'active',
  approvedAt: null,
  slug: null,
  bio: null,
  publicBio: null,
  approach: null,
  education: [],
  certificates: [],
  profileImageUrl: null,
}

const DEFAULT_STATS: ProfileStats = {
  totalClients: 0,
  completedSessions: 0,
  averageRating: null,
  totalEarnings: 0,
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

function toNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => cleanText(item)).filter(Boolean)
      }
    } catch {
      // Supports comma-separated text.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeProfileStatus(value: unknown): ProfileStatus {
  const status = String(value || '').trim().toLowerCase()

  if (status === 'approved' || status === 'pending' || status === 'review' || status === 'passive') {
    return status
  }

  if (status === 'active') return 'approved'
  if (status === 'rejected' || status === 'disabled') return 'passive'

  return 'review'
}

function normalizeAccountStatus(value: unknown): AccountStatus {
  return String(value || '').trim().toLowerCase() === 'passive' ? 'passive' : 'active'
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = cleanNullableText(value)
    if (text) return text
  }

  return null
}

function normalizeProfile(input: Partial<ExpertProfile> | null | undefined): ExpertProfile {
  const raw = input || {}

  return {
    ...DEFAULT_PROFILE,
    ...raw,
    id: cleanText(raw.id, DEFAULT_PROFILE.id),
    name: cleanText(raw.name, DEFAULT_PROFILE.name),
    title: cleanText(raw.title, DEFAULT_PROFILE.title),
    email: cleanNullableText(raw.email),
    phone: cleanNullableText(raw.phone),
    city: cleanNullableText(raw.city),
    slug: cleanNullableText(raw.slug),
    bio: cleanNullableText(raw.bio),
    publicBio: pickFirstText(raw.publicBio, raw.bio),
    approach: cleanNullableText(raw.approach),
    profileImageUrl: cleanNullableText(raw.profileImageUrl),
    specialties: textList(raw.specialties),
    focusAreas: textList(raw.focusAreas),
    education: textList(raw.education),
    certificates: textList(raw.certificates),
    experienceYears: toNullableNumber(raw.experienceYears),
    sessionPrice: toNullableNumber(raw.sessionPrice),
    status: normalizeProfileStatus(raw.status),
    accountStatus: normalizeAccountStatus(raw.accountStatus),
    approvedAt: cleanNullableText(raw.approvedAt),
  }
}

function normalizeStats(input: Partial<ProfileStats> | null | undefined): ProfileStats {
  return {
    totalClients: toNumber(input?.totalClients),
    completedSessions: toNumber(input?.completedSessions),
    averageRating: toNullableNumber(input?.averageRating),
    totalEarnings: toNumber(input?.totalEarnings),
  }
}

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value)

  if (value === null || value === undefined || !Number.isFinite(numberValue)) return 'Henüz eklenmedi'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Henüz eklenmedi'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Henüz eklenmedi'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function safeText(value: string | null | undefined, fallback = 'Henüz eklenmedi') {
  return value && value.trim() ? value.trim() : fallback
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

function profileStatusLabel(status: ProfileStatus) {
  switch (status) {
    case 'approved':
      return 'Onaylı'
    case 'pending':
      return 'Onay Bekliyor'
    case 'review':
      return 'İncelemede'
    case 'passive':
      return 'Pasif'
    default:
      return 'İncelemede'
  }
}

function profileStatusClass(status: ProfileStatus) {
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

function accountStatusLabel(status: AccountStatus) {
  return status === 'active' ? 'Aktif' : 'Pasif'
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Profil bilgileri şu anda alınamadı. Bağlantınızı kontrol edip tekrar deneyin.'
}

export default function ExpertProfilePage() {
  const [profile, setProfile] = useState<ExpertProfile>(DEFAULT_PROFILE)
  const [stats, setStats] = useState<ProfileStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState<NoticeState>(null)

  const publicPreviewHref = useMemo(
    () => (profile.slug ? `/uzmanlar/${profile.slug}` : '/uzmanlar'),
    [profile.slug]
  )

  const statCards = useMemo(
    () => [
      {
        label: 'Danışan',
        value: String(stats.totalClients),
        description: 'Platformdaki aktif ve geçmiş danışanlar',
      },
      {
        label: 'Tamamlanan Görüşme',
        value: String(stats.completedSessions),
        description: 'Başarıyla tamamlanan seanslar',
      },
      {
        label: 'Ortalama Puan',
        value: stats.averageRating === null ? 'Yeni' : stats.averageRating.toFixed(1),
        description: 'Danışan geri bildirimleri',
      },
      {
        label: 'Toplam Kazanç',
        value: formatMoney(stats.totalEarnings),
        description: 'Net uzman kazancı',
      },
    ],
    [stats]
  )

  const fetchProfile = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    try {
      if (mode === 'initial') {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setNotice(null)

      const res = await fetch('/api/expert/profile', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })

      const data = (await res.json().catch(() => ({}))) as ProfileApiResponse

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Profil bilgileri alınamadı.')
      }

      const rawProfile = data.profile || data.expert || data.publicProfile || null

      setProfile(normalizeProfile(rawProfile))
      setStats(normalizeStats(data.stats))
    } catch (error) {
      setProfile(DEFAULT_PROFILE)
      setStats(DEFAULT_STATS)
      setNotice({
        title: 'Profil bilgileri alınamadı',
        description: getSafeErrorMessage(error),
        tone: 'warning',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchProfile('initial')
  }, [fetchProfile])

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-indigo-600 text-2xl font-black text-white shadow-sm ring-1 ring-indigo-100">
                  {profile.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.profileImageUrl}
                      alt={`${profile.name} profil fotoğrafı`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(profile.name)
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                      Mindora Uzman Paneli
                    </p>
                    <StatusBadge status={profile.status} />
                  </div>

                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    {safeText(profile.name, 'Uzman')}
                  </h1>

                  <p className="mt-1 text-sm font-bold text-slate-600">
                    {safeText(profile.title)} • {safeText(profile.city)}
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Profiliniz; danışanların sizi tanıması, güven duyması ve doğru
                    uzmanla eşleştiğini hissetmesi için en önemli alanlardan biridir.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <button
                  type="button"
                  onClick={() => void fetchProfile('refresh')}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading || refreshing ? 'Yükleniyor...' : 'Bilgileri Yenile'}
                </button>

                <Link
                  href="/expert/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Dashboard
                </Link>

                <Link
                  href={publicPreviewHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Danışan Görünümünü Aç
                </Link>
              </div>
            </div>
          </div>

          {notice ? (
            <div className="border-t border-amber-100 bg-amber-50 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-amber-900">{notice.title}</p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">{notice.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchProfile('refresh')}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  Tekrar Dene
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Panel
              title="Temel Bilgiler"
              description="Profilinizde görünen ana bilgiler ve platform içi iletişim alanları."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Ad Soyad" value={safeText(profile.name)} />
                <InfoRow label="Unvan" value={safeText(profile.title)} />
                <InfoRow label="Şehir" value={safeText(profile.city)} />
                <InfoRow
                  label="Deneyim"
                  value={
                    profile.experienceYears === null
                      ? 'Henüz eklenmedi'
                      : `${profile.experienceYears} yıl`
                  }
                />
                <InfoRow label="Seans Ücreti" value={formatMoney(profile.sessionPrice)} />
                <InfoRow label="Hesap Durumu" value={accountStatusLabel(profile.accountStatus)} />
                <InfoRow label="E-posta" value={safeText(profile.email)} />
                <InfoRow label="Telefon" value={safeText(profile.phone)} />
              </div>
            </Panel>

            <Panel
              title="Uzmanlık Alanları"
              description="Danışan eşleşmesi ve profil görünürlüğü için kullanılan alanlar."
            >
              <TagList items={profile.specialties} emptyText="Uzmanlık alanı eklenmemiş." />
            </Panel>

            <Panel
              title="Hakkımda"
              description="Danışanların sizi ve çalışma biçiminizi anlamasına yardımcı olur."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <TextBlock
                  title="Kısa Tanıtım"
                  text={safeText(
                    profile.publicBio,
                    'Danışanların göreceği kısa tanıtım metni henüz eklenmemiş.'
                  )}
                />
                <TextBlock
                  title="Çalışma Yaklaşımı"
                  text={safeText(
                    profile.approach || profile.bio,
                    'Çalışma yaklaşımı henüz eklenmemiş.'
                  )}
                />
              </div>
            </Panel>

            <Panel title="Çalıştığı Konular" description="Profilinizde öne çıkan destek başlıkları.">
              <TagList items={profile.focusAreas} emptyText="Çalışılan konu başlığı eklenmemiş." />
            </Panel>
          </div>

          <aside className="space-y-6">
            <Panel title="Profil Durumu" description="Profilinizin platformdaki görünürlük durumu.">
              <div className="space-y-3">
                <StatusLine label="Durum" value={profileStatusLabel(profile.status)} />
                <StatusLine label="Hesap" value={accountStatusLabel(profile.accountStatus)} />
                <StatusLine label="Onay Tarihi" value={formatDate(profile.approvedAt)} />
                <StatusLine
                  label="Profil Adresi"
                  value={profile.slug ? `/uzmanlar/${profile.slug}` : 'Henüz eklenmedi'}
                />
              </div>
            </Panel>

            <Panel title="Eğitim" description="Danışan güvenini artıran eğitim bilgileri.">
              <List items={profile.education} emptyText="Eğitim bilgisi eklenmemiş." />
            </Panel>

            <Panel title="Sertifikalar" description="Mesleki gelişim ve uzmanlık belgeleri.">
              <List items={profile.certificates} emptyText="Sertifika eklenmemiş." />
            </Panel>

            <section className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <h2 className="text-lg font-black text-indigo-950">Profil önerisi</h2>
              <p className="mt-2 text-sm leading-6 text-indigo-800">
                Daha iyi dönüşüm için tanıtım metninizi sade, güven veren ve danışanın
                anlayacağı bir dille yazın. Uzmanlık alanlarınızı kısa başlıklarla belirtin.
              </p>
            </section>
          </aside>
        </section>
      </section>
    </main>
  )
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${profileStatusClass(status)}`}>
      {profileStatusLabel(status)}
    </span>
  )
}

function StatCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-100 hover:shadow-md">
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
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white hover:ring-indigo-100">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white hover:ring-indigo-100">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
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

function TagList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-black text-indigo-700 ring-1 ring-indigo-100"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function List({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        {emptyText}
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100 transition hover:bg-white hover:ring-indigo-100"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}
