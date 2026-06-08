'use client'

import Header from '@/components/Header'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Expert = {
  id: string
  slug?: string | null
  name: string
  title: string | null
  areas: string | null
  specialties?: string[] | string | null
  experience: string | null
  experience_years?: number | string | null
  online: string | null
  availability: string | null
  photo_url: string | null
  profile_image_url?: string | null
  session_price?: number | string | null
  session_duration_minutes?: number | string | null
}

type ExpertsResponse = {
  ok?: boolean
  experts?: Expert[]
  error?: string
}

type NormalizedExpert = {
  id: string
  slug: string | null
  name: string
  title: string
  areas: string[]
  experienceText: string
  onlineText: string
  availabilityText: string
  photoUrl: string | null
  sessionPrice: number
  sessionDurationMinutes: number
}

const SUPPORT_AREAS = [
  'Tümü',
  'Kaygı ve stres',
  'İlişki problemleri',
  'Özgüven',
  'Depresif duygu durumu',
  'Aile içi iletişim',
  'Sınav ve gelecek kaygısı',
  'Motivasyon eksikliği',
  'Tükenmişlik',
]

const TRUST_ITEMS = [
  {
    title: 'Onaylı uzman profilleri',
    text: 'Listelenen uzmanlar başvuru ve profil inceleme sürecinden sonra görünür hale gelir.',
  },
  {
    title: 'İhtiyaca göre eşleşme',
    text: 'Destek konusu, beklenti ve uygun zaman bilgisi birlikte değerlendirilerek daha doğru bir başlangıç yapılır.',
  },
  {
    title: 'Tek platform deneyimi',
    text: 'Ön eşleşme, ödeme, güvenli sohbet ve online görüşme akışı Mindora üzerinden sade şekilde ilerler.',
  },
]

const PROCESS_ITEMS = [
  'Kısa ön eşleşme formunu doldur',
  'İhtiyacına uygun uzman profillerini incele',
  'Randevu, ödeme ve görüşme akışını güvenli şekilde tamamla',
]

function cleanText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatTitle(title: string | null) {
  const cleanTitle = cleanText(title)
  if (!cleanTitle) return 'Uzman Psikolog'

  return cleanTitle.charAt(0).toLocaleUpperCase('tr-TR') + cleanTitle.slice(1)
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0]?.charAt(0).toLocaleUpperCase('tr-TR') || 'M'

  const first = parts[0]?.charAt(0) || 'M'
  const last = parts[parts.length - 1]?.charAt(0) || ''

  return `${first}${last}`.toLocaleUpperCase('tr-TR')
}

function splitAreas(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean)
  }

  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => cleanText(item)).filter(Boolean)
    }
  } catch {
    // JSON değilse virgüllü metin olarak devam eder.
  }

  return trimmed
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean)
}

function isPhotoUrlValid(url: string | null) {
  if (!url) return false

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'
  } catch {
    return false
  }
}

function normalizeOnlineStatus(value: string | null) {
  const normalized = value?.trim().toLowerCase()

  if (!normalized) return 'Online görüşme bilgisi eşleşme sırasında netleşir'
  if (['evet', 'yes', 'true', 'online'].includes(normalized)) {
    return 'Online görüşme yapıyor'
  }
  if (['hayır', 'hayir', 'no', 'false'].includes(normalized)) {
    return 'Online durumu eşleşme sırasında netleşir'
  }

  return value || 'Eşleşme sırasında netleşir'
}

function normalizeSlug(value: unknown) {
  const slug = cleanText(value).toLowerCase()
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null
}

function normalizeExpert(expert: Expert): NormalizedExpert {
  const areas = splitAreas(expert.specialties).length
    ? splitAreas(expert.specialties)
    : splitAreas(expert.areas)
  const photoUrl = cleanText(expert.profile_image_url || expert.photo_url) || null
  const experienceYears = toNumber(expert.experience_years, 0)

  return {
    id: cleanText(expert.id),
    slug: normalizeSlug(expert.slug),
    name: cleanText(expert.name, 'Mindora Uzmanı'),
    title: formatTitle(expert.title),
    areas,
    experienceText: cleanText(
      expert.experience,
      experienceYears > 0 ? `${experienceYears} yıl deneyim` : 'Deneyim bilgisi eşleşme sırasında netleşir'
    ),
    onlineText: normalizeOnlineStatus(expert.online),
    availabilityText: cleanText(expert.availability, 'Uygun saatler eşleşme sırasında netleşir'),
    photoUrl: isPhotoUrlValid(photoUrl) ? photoUrl : null,
    sessionPrice: toNumber(expert.session_price, 0),
    sessionDurationMinutes: toNumber(expert.session_duration_minutes, 50),
  }
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Ücret eşleşme sonrası netleşir'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function matchesSearch(expert: NormalizedExpert, searchTerm: string) {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return true

  const searchableText = [
    expert.name,
    expert.title,
    expert.experienceText,
    expert.availabilityText,
    ...expert.areas,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchableText.includes(query)
}

function areaMatches(expert: NormalizedExpert, selectedArea: string) {
  if (selectedArea === 'Tümü') return true

  const selected = selectedArea.toLowerCase()
  return expert.areas.some((area) => area.toLowerCase() === selected)
}

export default function UzmanlarPage() {
  const [experts, setExperts] = useState<NormalizedExpert[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedArea, setSelectedArea] = useState('Tümü')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchExperts = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)

      const res = await fetch('/api/experts', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      const data = (await res.json()) as ExpertsResponse

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Uzmanlar yüklenemedi. Kod: ${res.status}`)
      }

      const normalizedExperts = Array.isArray(data.experts)
        ? data.experts
            .filter((expert) => Boolean(expert.id && expert.name?.trim()))
            .map(normalizeExpert)
        : []

      setExperts(normalizedExperts)
    } catch (error) {
      console.error('Uzmanlar alınamadı:', error)
      setErrorMessage('Uzmanlar şu anda yüklenemedi. Lütfen biraz sonra tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadExperts() {
      if (!isActive) return
      await fetchExperts()
    }

    loadExperts()

    return () => {
      isActive = false
    }
  }, [fetchExperts])

  const filteredExperts = useMemo(() => {
    return experts.filter((expert) => areaMatches(expert, selectedArea) && matchesSearch(expert, searchTerm))
  }, [experts, searchTerm, selectedArea])

  const hasFilters = selectedArea !== 'Tümü' || searchTerm.trim().length > 0

  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Mindora Uzman Ağı
          </p>

          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Sana uygun psikolojik destek için uzmanları incele.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Mindora, ihtiyacını ve beklentini dikkate alarak doğru uzmanla daha güvenli bir başlangıç yapmanı kolaylaştırır.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/eslesme"
              className="rounded-2xl bg-black px-8 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Ücretsiz ön eşleşme başlat
            </Link>

            <a
              href="#uzman-listesi"
              className="rounded-2xl border border-black/10 bg-white/70 px-8 py-4 text-center font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzmanları görüntüle
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-4 rounded-[2rem] bg-white/75 p-6 shadow-sm ring-1 ring-black/5 md:grid-cols-3 md:p-8">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="rounded-3xl bg-[#f7f2eb] p-5">
              <h2 className="text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="uzman-listesi" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
              Uzmanlar
            </p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">
              Onaylı uzman profilleri.
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-neutral-600">
            Uzman seçimini kolaylaştırmak için destek konusu, uzmanlık alanı ve uygunluk bilgileri birlikte değerlendirilir.
          </p>
        </div>

        <div className="mb-8 rounded-[2rem] bg-white/75 p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-neutral-700">Uzman ara</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="İsim, alan veya deneyim ara..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-neutral-400 focus:border-black"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-black text-neutral-700">Destek alanı</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SUPPORT_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                      selectedArea === area
                        ? 'bg-black text-white'
                        : 'bg-[#f7f2eb] text-neutral-700 hover:bg-white'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingGrid />
        ) : errorMessage ? (
          <EmptyPanel
            title="Uzmanlar yüklenemedi."
            description={errorMessage}
            actionLabel="Tekrar dene"
            onAction={fetchExperts}
          />
        ) : experts.length === 0 ? (
          <EmptyPanel
            title="Henüz onaylı uzman yok."
            description="Uzman başvuruları incelendikten sonra onaylanan profiller bu sayfada listelenecek. Bu sırada ön eşleşme formunu doldurarak destek ihtiyacını bize iletebilirsin."
            href="/eslesme"
            actionLabel="Ön eşleşme başlat"
          />
        ) : filteredExperts.length === 0 ? (
          <EmptyPanel
            title="Bu filtreyle uzman bulunamadı."
            description="Arama kelimesini veya destek alanı filtresini değiştirerek tekrar deneyebilirsin."
            actionLabel={hasFilters ? 'Filtreleri temizle' : undefined}
            onAction={
              hasFilters
                ? () => {
                    setSearchTerm('')
                    setSelectedArea('Tümü')
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredExperts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
              Eşleşme mantığı
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Herkes için aynı uzman değil, sana uygun başlangıç.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-neutral-300">
            <p>
              Mindora’da amaç rastgele yönlendirme yapmak değil; kişinin ihtiyacını daha iyi anlayarak uygun uzmanla daha güvenli bir başlangıç yapmasını sağlamaktır.
            </p>

            <div className="space-y-3">
              {PROCESS_ITEMS.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/eslesme"
              className="inline-block rounded-2xl bg-white px-7 py-3 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
            >
              Eşleşme formunu doldur
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Sana uygun uzmanı birlikte bulalım.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Kısa formu doldur, ihtiyacına uygun psikolojik destek süreci için ücretsiz ön eşleşmeyi başlat.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/eslesme"
              className="rounded-2xl bg-black px-9 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Ücretsiz ön eşleşme başlat
            </Link>

            <Link
              href="/uzman-basvuru"
              className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-9 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzman olarak başvur
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-xs leading-6 text-neutral-500">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112 ile iletişime geç.
          </p>
        </div>
      </section>
    </main>
  )
}

function ExpertCard({ expert }: { expert: NormalizedExpert }) {
  const profileHref = expert.slug ? `/uzmanlar/${expert.slug}` : null
  const matchingHref = expert.slug
    ? `/eslesme?expert=${encodeURIComponent(expert.slug)}`
    : '/eslesme'

  return (
    <article className="group flex h-full flex-col rounded-[2rem] bg-white/85 p-7 text-center shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:bg-white hover:shadow-md">
      <div className="relative mx-auto">
        {expert.photoUrl ? (
          <img
            src={expert.photoUrl}
            alt={`${expert.name} profil fotoğrafı`}
            className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-white"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-2xl font-black text-white shadow-lg">
            {getInitials(expert.name)}
          </div>
        )}

        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f7f2eb] px-3 py-1 text-[11px] font-black text-neutral-700 ring-1 ring-black/5">
          Onaylı profil
        </span>
      </div>

      <h3 className="mt-8 text-xl font-black">{expert.name}</h3>

      <p className="mt-1 text-sm font-bold text-neutral-500">{expert.title}</p>

      <div className="mt-5 min-h-[2.5rem]">
        {expert.areas.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {expert.areas.slice(0, 4).map((area) => (
              <span key={area} className="rounded-full bg-[#f7f2eb] px-3 py-1 text-xs font-bold text-neutral-700 ring-1 ring-black/5">
                {area}
              </span>
            ))}

            {expert.areas.length > 4 ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 ring-1 ring-black/5">
                +{expert.areas.length - 4}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Uzmanlık alanı eşleşme sırasında netleşir.</p>
        )}
      </div>

      <div className="mt-6 flex-1 space-y-3 rounded-3xl bg-[#f7f2eb] p-5 text-left text-sm text-neutral-700">
        <p>
          <b>Deneyim:</b> {expert.experienceText}
        </p>
        <p>
          <b>Görüşme:</b> {expert.onlineText}
        </p>
        <p>
          <b>Müsaitlik:</b> {expert.availabilityText}
        </p>
        <p>
          <b>Seans:</b> {formatMoney(expert.sessionPrice)} / {expert.sessionDurationMinutes} dk
        </p>
      </div>

      <div className="mt-6 grid gap-2">
        {profileHref ? (
          <Link
            href={profileHref}
            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-[#f7f2eb]"
          >
            Profili İncele
          </Link>
        ) : null}

        <Link
          href={matchingHref}
          className="inline-flex items-center justify-center rounded-2xl bg-black px-6 py-3 text-sm font-black text-white transition hover:bg-neutral-800"
        >
          Bu uzmanla eşleşme iste
        </Link>
      </div>
    </article>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-[2rem] bg-white/75 p-7 shadow-sm ring-1 ring-black/5">
          <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-6 h-5 w-40 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-3 h-4 w-28 animate-pulse rounded-full bg-neutral-200" />
          <div className="mt-6 h-28 animate-pulse rounded-3xl bg-[#f7f2eb]" />
        </div>
      ))}
    </div>
  )
}

function EmptyPanel({
  title,
  description,
  actionLabel,
  href,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  href?: string
  onAction?: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] bg-white/80 p-8 text-center shadow-sm ring-1 ring-black/5">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-3 leading-7 text-neutral-600">{description}</p>

      {href && actionLabel ? (
        <Link href={href} className="mt-6 inline-block rounded-2xl bg-black px-7 py-3 font-black text-white transition hover:bg-neutral-800">
          {actionLabel}
        </Link>
      ) : null}

      {onAction && actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-2xl bg-black px-7 py-3 font-black text-white transition hover:bg-neutral-800"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
