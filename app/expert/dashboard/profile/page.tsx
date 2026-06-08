'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

type ProfilDurumu = 'approved' | 'pending' | 'review' | 'passive'
type HesapDurumu = 'active' | 'passive'

type UzmanProfili = {
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
  status: ProfilDurumu
  accountStatus: HesapDurumu
  approvedAt: string | null
  slug: string | null
  bio: string | null
  publicBio: string | null
  approach: string | null
  education: string[]
  certificates: string[]
  profileImageUrl?: string | null
}

type ProfilIstatistikleri = {
  totalClients: number
  completedSessions: number
  averageRating: number | null
  totalEarnings: number
}

type ProfilApiResponse = {
  ok?: boolean
  error?: string
  profile?: Partial<UzmanProfili> | null
  expert?: Partial<UzmanProfili> | null
  publicProfile?: Partial<UzmanProfili> | null
  stats?: Partial<ProfilIstatistikleri> | null
}

const VARSAYILAN_PROFIL: UzmanProfili = {
  id: 'uzman-profili',
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

const VARSAYILAN_ISTATISTIKLER: ProfilIstatistikleri = {
  totalClients: 0,
  completedSessions: 0,
  averageRating: null,
  totalEarnings: 0,
}

function temizMetin(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback

  const text = String(value).trim()
  return text || fallback
}

function temizNullableMetin(value: unknown) {
  const text = temizMetin(value)
  return text || null
}

function sayi(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function nullableSayi(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function metinListesi(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => temizMetin(item)).filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => temizMetin(item)).filter(Boolean)
      }
    } catch {
      // Virgülle ayrılmış metin desteği.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function profilDurumu(value: unknown): ProfilDurumu {
  if (
    value === 'approved' ||
    value === 'pending' ||
    value === 'review' ||
    value === 'passive'
  ) {
    return value
  }

  return 'review'
}

function hesapDurumu(value: unknown): HesapDurumu {
  return value === 'passive' ? 'passive' : 'active'
}

function profiliDuzenle(input: Partial<UzmanProfili> | null | undefined): UzmanProfili {
  const raw = input || {}

  return {
    ...VARSAYILAN_PROFIL,
    ...raw,
    id: temizMetin(raw.id, VARSAYILAN_PROFIL.id),
    name: temizMetin(raw.name, VARSAYILAN_PROFIL.name),
    title: temizMetin(raw.title, VARSAYILAN_PROFIL.title),
    email: temizNullableMetin(raw.email),
    phone: temizNullableMetin(raw.phone),
    city: temizNullableMetin(raw.city),
    slug: temizNullableMetin(raw.slug),
    bio: temizNullableMetin(raw.bio),
    publicBio: temizNullableMetin(raw.publicBio),
    approach: temizNullableMetin(raw.approach),
    profileImageUrl: temizNullableMetin(raw.profileImageUrl),
    specialties: metinListesi(raw.specialties),
    focusAreas: metinListesi(raw.focusAreas),
    education: metinListesi(raw.education),
    certificates: metinListesi(raw.certificates),
    experienceYears: nullableSayi(raw.experienceYears),
    sessionPrice: nullableSayi(raw.sessionPrice),
    status: profilDurumu(raw.status),
    accountStatus: hesapDurumu(raw.accountStatus),
    approvedAt: temizNullableMetin(raw.approvedAt),
  }
}

function istatistikleriDuzenle(
  input: Partial<ProfilIstatistikleri> | null | undefined
): ProfilIstatistikleri {
  return {
    totalClients: sayi(input?.totalClients),
    completedSessions: sayi(input?.completedSessions),
    averageRating: nullableSayi(input?.averageRating),
    totalEarnings: sayi(input?.totalEarnings),
  }
}

function para(value: number | null | undefined) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return 'Belirtilmedi'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function tarih(value: string | null | undefined) {
  if (!value) return 'Belirtilmedi'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Belirtilmedi'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function guvenliMetin(value: string | null | undefined, fallback = 'Belirtilmedi') {
  return value && value.trim() ? value.trim() : fallback
}

function basHarfler(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('')

  return initials || 'M'
}

function profilDurumuEtiketi(status: ProfilDurumu) {
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

function profilDurumuStili(status: ProfilDurumu) {
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

function hesapDurumuEtiketi(status: HesapDurumu) {
  return status === 'active' ? 'Aktif' : 'Pasif'
}

export default function ExpertProfilePage() {
  const [profile, setProfile] = useState<UzmanProfili>(VARSAYILAN_PROFIL)
  const [stats, setStats] = useState<ProfilIstatistikleri>(VARSAYILAN_ISTATISTIKLER)
  const [loading, setLoading] = useState(true)
  const [dataWarning, setDataWarning] = useState(false)

  const publicPreviewHref = useMemo(
    () => (profile.slug ? `/expert/${profile.slug}` : '/uzmanlar'),
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
        value: para(stats.totalEarnings),
        description: 'Net uzman kazancı',
      },
    ],
    [stats]
  )

  async function fetchProfile() {
    try {
      setLoading(true)
      setDataWarning(false)

      const res = await fetch('/api/expert/profile', { cache: 'no-store' })
      const data = (await res.json()) as ProfilApiResponse

      if (!res.ok || data.ok === false) {
        setProfile(VARSAYILAN_PROFIL)
        setStats(VARSAYILAN_ISTATISTIKLER)
        setDataWarning(true)
        return
      }

      const rawProfile = data.profile || data.expert || null

      setProfile(profiliDuzenle(rawProfile))
      setStats(istatistikleriDuzenle(data.stats))
    } catch {
      setProfile(VARSAYILAN_PROFIL)
      setStats(VARSAYILAN_ISTATISTIKLER)
      setDataWarning(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-indigo-600 text-2xl font-black text-white shadow-sm ring-1 ring-indigo-100">
                {profile.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profileImageUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  basHarfler(profile.name)
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-indigo-700">Uzman Profili</p>
                  <StatusBadge status={profile.status} />
                </div>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {guvenliMetin(profile.name, 'Uzman')}
                </h1>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {guvenliMetin(profile.title)} • {guvenliMetin(profile.city)}
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
                onClick={fetchProfile}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Yükleniyor...' : 'Bilgileri Yenile'}
              </button>

              <Link
                href={publicPreviewHref}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Danışan Görünümünü Aç
              </Link>
            </div>
          </div>
        </div>

        {dataWarning ? (
          <div className="border-t border-amber-100 bg-amber-50 px-6 py-4">
            <p className="text-sm font-bold text-amber-900">
              Profil bilgileri henüz tamamlanmadı.
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Uzman profiliniz admin onayı ve profil bilgileri tamamlandıkça burada
              güncel şekilde görüntülenecek.
            </p>
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
              <InfoRow label="Ad Soyad" value={guvenliMetin(profile.name)} />
              <InfoRow label="Unvan" value={guvenliMetin(profile.title)} />
              <InfoRow label="Şehir" value={guvenliMetin(profile.city)} />
              <InfoRow
                label="Deneyim"
                value={
                  profile.experienceYears === null
                    ? 'Belirtilmedi'
                    : `${profile.experienceYears} yıl`
                }
              />
              <InfoRow label="Seans Ücreti" value={para(profile.sessionPrice)} />
              <InfoRow label="Hesap Durumu" value={hesapDurumuEtiketi(profile.accountStatus)} />
              <InfoRow label="E-posta" value={guvenliMetin(profile.email)} />
              <InfoRow label="Telefon" value={guvenliMetin(profile.phone)} />
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
                text={guvenliMetin(
                  profile.publicBio,
                  'Danışanların göreceği kısa tanıtım metni henüz eklenmemiş.'
                )}
              />
              <TextBlock
                title="Çalışma Yaklaşımı"
                text={guvenliMetin(
                  profile.approach || profile.bio,
                  'Çalışma yaklaşımı henüz eklenmemiş.'
                )}
              />
            </div>
          </Panel>

          <Panel
            title="Çalıştığı Konular"
            description="Profilinizde öne çıkan destek başlıkları."
          >
            <TagList
              items={profile.focusAreas}
              emptyText="Çalışılan konu başlığı eklenmemiş."
            />
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Profil Durumu" description="Profilinizin platformdaki görünürlük durumu.">
            <div className="space-y-3">
              <StatusLine label="Durum" value={profilDurumuEtiketi(profile.status)} />
              <StatusLine label="Hesap" value={hesapDurumuEtiketi(profile.accountStatus)} />
              <StatusLine label="Onay Tarihi" value={tarih(profile.approvedAt)} />
              <StatusLine label="Profil Adresi" value={profile.slug ? `/${profile.slug}` : 'Belirtilmedi'} />
            </div>
          </Panel>

          <Panel title="Eğitim" description="Danışan güvenini artıran eğitim bilgileri.">
            <List items={profile.education} emptyText="Eğitim bilgisi eklenmemiş." />
          </Panel>

          <Panel title="Sertifikalar" description="Mesleki gelişim ve uzmanlık belgeleri.">
            <List items={profile.certificates} emptyText="Sertifika eklenmemiş." />
          </Panel>

          <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-indigo-950">Profil önerisi</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-800">
              Daha iyi dönüşüm için tanıtım metninizi sade, güven veren ve danışanın
              anlayacağı bir dille yazın. Uzmanlık alanlarınızı kısa başlıklarla belirtin.
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}

function StatusBadge({ status }: { status: ProfilDurumu }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${profilDurumuStili(
        status
      )}`}
    >
      {profilDurumuEtiketi(status)}
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
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
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
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  )
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  )
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-right text-sm font-bold text-slate-950">{value}</span>
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
          className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100"
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
          className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}
