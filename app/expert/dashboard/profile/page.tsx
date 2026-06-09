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

type ProfileFormState = {
  name: string
  title: string
  phone: string
  city: string
  specialties: string
  focusAreas: string
  experienceYears: string
  sessionPrice: string
  publicBio: string
  approach: string
  education: string
  certificates: string
  profileImageUrl: string
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

type SaveApiResponse = {
  ok?: boolean
  error?: string
  profile?: Partial<ExpertProfile> | null
  expert?: Partial<ExpertProfile> | null
  pendingReview?: boolean
  message?: string
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

const REVIEW_REQUIRED_FIELDS = [
  'Unvan',
  'Uzmanlık alanları',
  'Çalıştığı konular',
  'Tanıtım metni',
  'Çalışma yaklaşımı',
  'Eğitim',
  'Sertifikalar',
]

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

function serializeList(items: string[]) {
  return items.join(', ')
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

function profileToForm(profile: ExpertProfile): ProfileFormState {
  return {
    name: profile.name || '',
    title: profile.title || '',
    phone: profile.phone || '',
    city: profile.city || '',
    specialties: serializeList(profile.specialties),
    focusAreas: serializeList(profile.focusAreas),
    experienceYears: profile.experienceYears === null ? '' : String(profile.experienceYears),
    sessionPrice: profile.sessionPrice === null ? '' : String(profile.sessionPrice),
    publicBio: profile.publicBio || '',
    approach: profile.approach || profile.bio || '',
    education: serializeList(profile.education),
    certificates: serializeList(profile.certificates),
    profileImageUrl: profile.profileImageUrl || '',
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

function listFromForm(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function nullableNumberFromForm(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return null

  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function buildSavePayload(form: ProfileFormState) {
  return {
    name: cleanText(form.name),
    title: cleanText(form.title),
    phone: cleanNullableText(form.phone),
    city: cleanNullableText(form.city),
    specialties: listFromForm(form.specialties),
    focusAreas: listFromForm(form.focusAreas),
    experienceYears: nullableNumberFromForm(form.experienceYears),
    sessionPrice: nullableNumberFromForm(form.sessionPrice),
    publicBio: cleanNullableText(form.publicBio),
    bio: cleanNullableText(form.publicBio),
    approach: cleanNullableText(form.approach),
    education: listFromForm(form.education),
    certificates: listFromForm(form.certificates),
    profileImageUrl: cleanNullableText(form.profileImageUrl),
  }
}

function validateForm(form: ProfileFormState) {
  if (!form.name.trim()) return 'Ad soyad alanı zorunludur.'
  if (!form.title.trim()) return 'Unvan alanı zorunludur.'

  const experience = nullableNumberFromForm(form.experienceYears)
  if (form.experienceYears.trim() && (experience === null || experience < 0 || experience > 80)) {
    return 'Deneyim yılı 0 ile 80 arasında olmalıdır.'
  }

  const price = nullableNumberFromForm(form.sessionPrice)
  if (form.sessionPrice.trim() && (price === null || price < 0 || price > 100000)) {
    return 'Seans ücreti geçerli bir tutar olmalıdır.'
  }

  if (form.publicBio.trim().length > 1200) {
    return 'Kısa tanıtım metni en fazla 1200 karakter olabilir.'
  }

  if (form.approach.trim().length > 1600) {
    return 'Çalışma yaklaşımı en fazla 1600 karakter olabilir.'
  }

  return ''
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
  const [form, setForm] = useState<ProfileFormState>(() => profileToForm(DEFAULT_PROFILE))
  const [stats, setStats] = useState<ProfileStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
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
      const nextProfile = normalizeProfile(rawProfile)

      setProfile(nextProfile)
      setForm(profileToForm(nextProfile))
      setStats(normalizeStats(data.stats))
    } catch (error) {
      setProfile(DEFAULT_PROFILE)
      setForm(profileToForm(DEFAULT_PROFILE))
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

  function updateForm<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function cancelEdit() {
    setForm(profileToForm(profile))
    setEditing(false)
    setNotice(null)
  }

  async function saveProfile() {
    try {
      setSaving(true)
      setNotice(null)

      const validationError = validateForm(form)
      if (validationError) throw new Error(validationError)

      const payload = buildSavePayload(form)

      const response = await fetch('/api/expert/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json().catch(() => ({}))) as SaveApiResponse

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'Profil güncellenemedi.')
      }

      const nextProfile = normalizeProfile(data.profile || data.expert || { ...profile, ...payload })

      setProfile(nextProfile)
      setForm(profileToForm(nextProfile))
      setEditing(false)
      setNotice({
        title: data.pendingReview ? 'Profil güncellemesi incelemeye alındı' : 'Profil güncellendi',
        description:
          data.message ||
          (data.pendingReview
            ? 'Değişiklikler admin onayından sonra danışan görünümüne yansıtılacaktır.'
            : 'Profil bilgileriniz başarıyla kaydedildi.'),
        tone: 'success',
      })

      void fetchProfile('refresh')
    } catch (error) {
      setNotice({
        title: 'Profil güncellenemedi',
        description: getSafeErrorMessage(error),
        tone: 'warning',
      })
    } finally {
      setSaving(false)
    }
  }

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
                    Profil bilgilerinizi güncel tutarak danışanların size güven duymasını ve doğru
                    eşleşme kararını daha hızlı vermesini sağlayın.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <button
                  type="button"
                  onClick={() => void fetchProfile('refresh')}
                  disabled={loading || refreshing || saving}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading || refreshing ? 'Yükleniyor...' : 'Bilgileri Yenile'}
                </button>

                <button
                  type="button"
                  onClick={() => setEditing((current) => !current)}
                  disabled={loading || saving}
                  className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editing ? 'Önizlemeye Dön' : 'Profili Düzenle'}
                </button>

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
            <NoticeCard
              title={notice.title}
              description={notice.description}
              tone={notice.tone}
              onRetry={notice.tone === 'warning' ? () => void fetchProfile('refresh') : undefined}
            />
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>

        {editing ? (
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <ProfileEditForm
              form={form}
              saving={saving}
              onChange={updateForm}
              onCancel={cancelEdit}
              onSave={() => void saveProfile()}
            />

            <aside className="space-y-6">
              <Panel
                title="Admin Onayına Düşebilecek Alanlar"
                description="Uzman güvenliği için bazı alanlar direkt yayına alınmayabilir."
              >
                <List items={REVIEW_REQUIRED_FIELDS} emptyText="Onay gerektiren alan yok." />
              </Panel>

              <section className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
                <h2 className="text-lg font-black text-indigo-950">Profil yazım önerisi</h2>
                <p className="mt-2 text-sm leading-6 text-indigo-800">
                  Tanıtım metninizde sade, güven veren ve danışanın anlayacağı bir dil kullanın.
                  Akademik bilgileri kısa tutup hangi konularda destek verdiğinizi net yazın.
                </p>
              </section>
            </aside>
          </section>
        ) : (
          <ProfilePreview
            profile={profile}
            publicPreviewHref={publicPreviewHref}
          />
        )}
      </section>
    </main>
  )
}

function ProfilePreview({
  profile,
  publicPreviewHref,
}: {
  profile: ExpertProfile
  publicPreviewHref: string
}) {
  return (
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

          <Link
            href={publicPreviewHref}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
          >
            Public Profili Aç
          </Link>
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
  )
}

function ProfileEditForm({
  form,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  form: ProfileFormState
  saving: boolean
  onChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Profili Güncelle</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Temel bilgilerinizi ve danışan görünümünde yer alan profil içeriklerinizi buradan
            güncelleyebilirsiniz.
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-800 ring-1 ring-amber-100">
          Kritik alanlar admin onayına düşebilir.
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad Soyad" value={form.name} onChange={(value) => onChange('name', value)} />
        <Field label="Unvan" value={form.title} onChange={(value) => onChange('title', value)} />
        <Field label="Telefon" value={form.phone} onChange={(value) => onChange('phone', value)} />
        <Field label="Şehir" value={form.city} onChange={(value) => onChange('city', value)} />
        <Field
          label="Deneyim Yılı"
          value={form.experienceYears}
          inputMode="numeric"
          onChange={(value) => onChange('experienceYears', value)}
        />
        <Field
          label="Seans Ücreti"
          value={form.sessionPrice}
          inputMode="decimal"
          onChange={(value) => onChange('sessionPrice', value)}
        />
        <Field
          label="Profil Fotoğrafı URL"
          value={form.profileImageUrl}
          className="sm:col-span-2"
          onChange={(value) => onChange('profileImageUrl', value)}
        />
        <TextArea
          label="Uzmanlık Alanları"
          hint="Virgülle ayırın. Örn: Kaygı, Depresyon, İlişki Problemleri"
          value={form.specialties}
          onChange={(value) => onChange('specialties', value)}
        />
        <TextArea
          label="Çalıştığı Konular"
          hint="Virgülle ayırın. Örn: Overthinking, Panik, Stres Yönetimi"
          value={form.focusAreas}
          onChange={(value) => onChange('focusAreas', value)}
        />
        <TextArea
          label="Kısa Tanıtım"
          hint="Danışanın profilinizde göreceği ana tanıtım metni."
          value={form.publicBio}
          rows={6}
          onChange={(value) => onChange('publicBio', value)}
        />
        <TextArea
          label="Çalışma Yaklaşımı"
          hint="Terapi yaklaşımınız, seans tarzınız ve çalışma biçiminiz."
          value={form.approach}
          rows={6}
          onChange={(value) => onChange('approach', value)}
        />
        <TextArea
          label="Eğitim"
          hint="Virgülle ayırın."
          value={form.education}
          onChange={(value) => onChange('education', value)}
        />
        <TextArea
          label="Sertifikalar"
          hint="Virgülle ayırın."
          value={form.certificates}
          onChange={(value) => onChange('certificates', value)}
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor...' : 'Profili Güncelle'}
        </button>
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  inputMode?: 'text' | 'numeric' | 'decimal'
  className?: string
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  hint,
  rows = 4,
  onChange,
}: {
  label: string
  value: string
  hint?: string
  rows?: number
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      />
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  )
}

function NoticeCard({
  title,
  description,
  tone = 'default',
  onRetry,
}: {
  title: string
  description: string
  tone?: 'default' | 'warning' | 'success'
  onRetry?: () => void
}) {
  const className =
    tone === 'warning'
      ? 'border-amber-100 bg-amber-50 text-amber-900'
      : tone === 'success'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
        : 'border-slate-100 bg-slate-50 text-slate-700'

  return (
    <div className={`border-t px-6 py-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
          >
            Tekrar Dene
          </button>
        ) : null}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${profileStatusClass(
        status
      )}`}
    >
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
