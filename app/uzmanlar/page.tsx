'use client'

import Header from '@/components/Header'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Expert = {
  id: string
  name: string
  slug?: string | null
  title: string | null
  areas: string | null
  experience: string | null
  online: string | null
  availability: string | null
  photo_url: string | null
  price?: number | string | null
  session_price?: number | string | null
  sessionDuration?: string | null
  status?: string | null
}

type ExpertsResponse = {
  ok?: boolean
  experts?: Expert[]
  error?: string
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
    text: 'Listelenen uzmanlar Mindora başvuru ve profil inceleme sürecinden sonra görünür olur.',
  },
  {
    title: 'İhtiyaca göre seçim',
    text: 'Destek konusu, beklenti, uygun zaman ve görüşme tercihi birlikte değerlendirilir.',
  },
  {
    title: 'Tek yerden süreç',
    text: 'Eşleşme, randevu, ödeme, mesajlaşma ve video görüşme akışı aynı platformda ilerler.',
  },
]

const PROCESS_ITEMS = [
  'Kısa ön eşleşme formunu doldur',
  'İhtiyacına uygun uzman profillerini incele',
  'Randevu, ödeme ve görüşme akışını güvenli şekilde tamamla',
]

function toText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function formatTitle(title: string | null) {
  const cleanTitle = toText(title, 'Uzman Psikolog')
  return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() || 'M'

  const first = parts[0]?.charAt(0) || 'M'
  const last = parts[parts.length - 1]?.charAt(0) || ''

  return `${first}${last}`.toUpperCase()
}

function createSlug(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getExpertSlug(expert: Expert) {
  const slug = toText(expert.slug)
  if (slug) return slug

  const generatedSlug = createSlug(expert.name)
  return generatedSlug || expert.id
}

function splitAreas(areas: string | null) {
  if (!areas) return []

  return areas
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

  if (!normalized) return 'Online durum eşleşmede netleşir'
  if (['evet', 'yes', 'true', 'online'].includes(normalized)) {
    return 'Online görüşme yapıyor'
  }
  if (['hayır', 'hayir', 'no', 'false'].includes(normalized)) {
    return 'Online durum eşleşmede netleşir'
  }

  return value || 'Eşleşmede netleşir'
}

function getPrice(expert: Expert) {
  const raw = expert.session_price ?? expert.price
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function formatMoney(value: number | null) {
  if (!value) return 'Eşleşmede netleşir'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function matchesSearch(expert: Expert, searchTerm: string) {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return true

  const searchableText = [
    expert.name,
    expert.title,
    expert.areas,
    expert.experience,
    expert.availability,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchableText.includes(query)
}

export default function UzmanlarPage() {
  const [experts, setExperts] = useState<Expert[]>([])
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
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error(`Uzmanlar yüklenemedi. Kod: ${res.status}`)
      }

      const data = (await res.json()) as ExpertsResponse

      if (!data.ok) {
        throw new Error(data.error || 'Uzmanlar alınamadı.')
      }

      setExperts(Array.isArray(data.experts) ? data.experts : [])
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

  const visibleExperts = useMemo(
    () =>
      experts.filter((expert) => {
        const status = toText(expert.status).toLowerCase()
        const isHidden = ['rejected', 'passive'].includes(status)

        return Boolean(expert.id && expert.name?.trim() && !isHidden)
      }),
    [experts],
  )

  const filteredExperts = useMemo(() => {
    return visibleExperts.filter((expert) => {
      const expertAreas = splitAreas(expert.areas)
      const areaMatches = selectedArea === 'Tümü' || expertAreas.includes(selectedArea)

      return areaMatches && matchesSearch(expert, searchTerm)
    })
  }, [searchTerm, selectedArea, visibleExperts])

  const hasFilters = selectedArea !== 'Tümü' || searchTerm.trim().length > 0

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto w-full max-w-7xl px-5 pb-10 pt-12 sm:px-6 md:pb-14 md:pt-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-neutral-500">
              Mindora Uzman Ağı
            </p>

            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Sana uygun uzmanı güvenle bul.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              Mindora, yalnızca uzman listeleyen bir platform değil; ihtiyacını,
              uygun zamanını ve beklentini dikkate alan daha güvenli bir
              başlangıç deneyimidir.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/eslesme"
                className="rounded-2xl bg-black px-8 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
              >
                Ücretsiz ön eşleşme başlat
              </Link>

              <Link
                href="#uzman-listesi"
                className="rounded-2xl border border-black/10 bg-white px-8 py-4 text-center font-black text-black transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                Uzmanları incele
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard value="Onaylı" label="Profil inceleme süreci" />
              <StatCard value="Online" label="Güvenli görüşme akışı" />
              <StatCard value="Tek panel" label="Randevu, ödeme ve video" />
              <StatCard value="Ücretsiz" label="Ön eşleşme başlangıcı" />
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:grid-cols-3 md:p-7">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="rounded-3xl bg-[#f7f2eb] p-5">
              <h2 className="text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="uzman-listesi" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-neutral-500">
              Uzmanlar
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              Onaylı uzman profilleri.
            </h2>
          </div>

          <p className="text-base leading-7 text-neutral-600 lg:justify-self-end lg:text-right">
            Uzman seçimini kolaylaştırmak için destek konusu, uzmanlık alanı,
            ücret, görüşme tipi ve uygunluk bilgileri birlikte gösterilir.
          </p>
        </div>

        <div className="mb-8 rounded-[2rem] border border-black/5 bg-white/95 p-4 shadow-sm md:p-5">
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
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
              <div className="flex flex-wrap gap-2">
                {SUPPORT_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      selectedArea === area
                        ? 'bg-black text-white'
                        : 'bg-[#f7f2eb] text-neutral-700 hover:bg-neutral-100'
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
          <ExpertSkeleton />
        ) : errorMessage ? (
          <EmptyState
            title="Uzmanlar yüklenemedi."
            text={errorMessage}
            actionLabel="Tekrar dene"
            onAction={fetchExperts}
          />
        ) : visibleExperts.length === 0 ? (
          <EmptyState
            title="Henüz onaylı uzman yok."
            text="Uzman başvuruları incelendikten sonra onaylanan profiller bu sayfada listelenecek. Bu sırada ücretsiz ön eşleşme formunu doldurabilirsin."
            href="/eslesme"
            actionLabel="Ön eşleşme başlat"
          />
        ) : filteredExperts.length === 0 ? (
          <EmptyState
            title="Bu filtreyle uzman bulunamadı."
            text="Arama kelimesini veya destek alanı filtresini değiştirerek tekrar deneyebilirsin."
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredExperts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
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
              Mindora’da amaç rastgele yönlendirme yapmak değil; kişinin ihtiyacını
              anlayarak uygun uzmanla daha güvenli bir başlangıç yapmasını sağlamaktır.
            </p>

            <div className="space-y-3">
              {PROCESS_ITEMS.map((item, index) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white"
                >
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

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Destek alanları
          </p>

          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Hangi konuda destek alabilirsin?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-neutral-600">
            Konunu tam tarif edemesen bile ön eşleşme formu ihtiyacını daha anlaşılır
            hale getirmek için tasarlanmıştır.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {SUPPORT_AREAS.filter((area) => area !== 'Tümü').map((area) => (
            <div
              key={area}
              className="rounded-2xl bg-white/80 p-5 text-center font-bold text-neutral-700 shadow-sm ring-1 ring-black/5"
            >
              {area}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Sana uygun uzmanı birlikte bulalım.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Kısa formu doldur, ihtiyacına uygun psikolojik destek süreci için ücretsiz
            ön eşleşmeyi başlat.
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
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme
            riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112 ile
            iletişime geç.
          </p>
        </div>
      </section>
    </main>
  )
}

function ExpertCard({ expert }: { expert: Expert }) {
  const expertAreas = splitAreas(expert.areas)
  const showPhoto = isPhotoUrlValid(expert.photo_url)
  const slug = getExpertSlug(expert)
  const profileHref = `/uzmanlar/${slug}`
  const matchHref = `/eslesme?expert=${encodeURIComponent(slug)}`
  const price = getPrice(expert)

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md">
      <div className="p-7 text-center">
        <div className="relative mx-auto h-28 w-28">
          {showPhoto ? (
            <Image
              src={expert.photo_url || ''}
              alt={`${expert.name} profil fotoğrafı`}
              fill
              sizes="112px"
              className="rounded-full object-cover shadow-lg ring-4 ring-white"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-black text-3xl font-black text-white shadow-lg">
              {getInitials(expert.name)}
            </div>
          )}

          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f7f2eb] px-3 py-1 text-[11px] font-black text-neutral-700 ring-1 ring-black/5">
            Onaylı profil
          </span>
        </div>

        <h3 className="mt-8 text-2xl font-black tracking-tight">{expert.name}</h3>

        <p className="mt-1 text-sm font-bold text-neutral-500">{formatTitle(expert.title)}</p>

        <div className="mt-5 flex min-h-[2.5rem] flex-wrap justify-center gap-2">
          {expertAreas.length > 0 ? (
            <>
              {expertAreas.slice(0, 3).map((area) => (
                <span
                  key={area}
                  className="rounded-full bg-[#f7f2eb] px-3 py-1 text-xs font-bold text-neutral-700 ring-1 ring-black/5"
                >
                  {area}
                </span>
              ))}

              {expertAreas.length > 3 ? (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 ring-1 ring-black/5">
                  +{expertAreas.length - 3}
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-neutral-500">Uzmanlık alanı eşleşmede netleşir.</p>
          )}
        </div>
      </div>

      <div className="mx-5 flex-1 rounded-3xl bg-[#f7f2eb] p-5 text-left text-sm text-neutral-700">
        <div className="grid gap-3">
          <InfoLine label="Deneyim" value={expert.experience || 'Belirtilmedi'} />
          <InfoLine label="Görüşme" value={normalizeOnlineStatus(expert.online)} />
          <InfoLine label="Müsaitlik" value={expert.availability || 'Eşleşmede netleşir'} />
          <InfoLine label="Ücret" value={formatMoney(price)} />
        </div>
      </div>

      <div className="grid gap-3 p-5 pt-6">
        <Link
          href={profileHref}
          className="rounded-2xl bg-black px-6 py-3 text-center text-sm font-black text-white transition hover:bg-neutral-800"
        >
          Profili incele
        </Link>

        <Link
          href={matchHref}
          className="rounded-2xl border border-black/10 bg-white px-6 py-3 text-center text-sm font-black text-black transition hover:bg-[#f7f2eb]"
        >
          Bu uzman için eşleşme iste
        </Link>
      </div>
    </article>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-start justify-between gap-4 border-b border-black/5 pb-3 last:border-b-0 last:pb-0">
      <b className="shrink-0 text-neutral-950">{label}</b>
      <span className="text-right text-neutral-600">{value}</span>
    </p>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl bg-[#f7f2eb] p-5">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-600">{label}</p>
    </div>
  )
}

function ExpertSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-[2rem] bg-white/75 p-7 shadow-sm ring-1 ring-black/5">
          <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-8 h-6 w-44 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-3 h-4 w-32 animate-pulse rounded-full bg-neutral-200" />
          <div className="mt-6 h-36 animate-pulse rounded-3xl bg-[#f7f2eb]" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  title,
  text,
  href,
  actionLabel,
  onAction,
}: {
  title: string
  text: string
  href?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] bg-white/85 p-8 text-center shadow-sm ring-1 ring-black/5">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-3 leading-7 text-neutral-600">{text}</p>

      {href && actionLabel ? (
        <Link
          href={href}
          className="mt-6 inline-block rounded-2xl bg-black px-7 py-3 font-black text-white transition hover:bg-neutral-800"
        >
          {actionLabel}
        </Link>
      ) : null}

      {!href && actionLabel && onAction ? (
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
