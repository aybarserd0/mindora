import Header from '@/components/Header'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

type ExpertRow = {
  id?: string | null
  slug?: string | null
  name?: string | null
  title?: string | null
  areas?: string | null
  experience?: string | null
  online?: string | null
  price?: string | null
  session_price?: number | string | null
  availability?: string | null
  expectation?: string | null
  note?: string | null
  status?: string | null
  photo_url?: string | null
  created_at?: string | null
}

type PublicExpertProfile = {
  id: string
  slug: string
  name: string
  title: string
  imageInitials: string
  profileImageUrl: string | null
  areas: string[]
  experience: string
  onlineText: string
  availabilityText: string
  priceText: string
  sessionPrice: number
  sessionDurationMinutes: number
  bio: string
  approach: string
  isOnlineAvailable: boolean
}

const DEFAULT_DESCRIPTION =
  'Mindora ile online psikolojik destek sürecine güvenli, sade ve uygun uzman eşleşmesiyle başlayın.'

const DEFAULT_SUPPORT_AREAS = [
  'Kaygı ve stres',
  'İlişki problemleri',
  'Özgüven',
  'Depresif duygu durumu',
  'Aile içi iletişim',
  'Sınav ve gelecek kaygısı',
]

function toText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(/[₺TLtl]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : fallback
}

function isSafeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value.trim())
}

function isValidImageUrl(value: string | null) {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0]?.charAt(0).toLocaleUpperCase('tr-TR') || 'M'

  const first = parts[0]?.charAt(0) || 'M'
  const last = parts[parts.length - 1]?.charAt(0) || ''

  return `${first}${last}`.toLocaleUpperCase('tr-TR')
}

function splitTextList(value: string | null | undefined) {
  const text = toText(value)
  if (!text) return []

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Eşleşme sonrası netleşir'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeOnlineStatus(value: string | null | undefined) {
  const normalized = toText(value).toLowerCase()

  if (!normalized) {
    return {
      isOnlineAvailable: true,
      onlineText: 'Online görüşme',
    }
  }

  if (['evet', 'yes', 'true', 'online', 'aktif', 'var'].includes(normalized)) {
    return {
      isOnlineAvailable: true,
      onlineText: 'Online görüşme',
    }
  }

  if (['hayır', 'hayir', 'no', 'false', 'pasif', 'yok'].includes(normalized)) {
    return {
      isOnlineAvailable: false,
      onlineText: 'Görüşme tipi eşleşmede netleşir',
    }
  }

  return {
    isOnlineAvailable: true,
    onlineText: value || 'Online görüşme',
  }
}

function isPublicExpert(row: ExpertRow) {
  const status = toText(row.status).toLowerCase()

  if (!status) return true

  return ['approved', 'onaylı', 'onayli', 'active', 'aktif'].includes(status)
}

function normalizeExpert(row: ExpertRow): PublicExpertProfile {
  const name = toText(row.name, 'Mindora Uzmanı')
  const title = toText(row.title, 'Uzman Psikolog')
  const areas = splitTextList(row.areas)
  const online = normalizeOnlineStatus(row.online)
  const sessionPrice = toNumber(row.session_price ?? row.price, 0)
  const priceText = sessionPrice > 0 ? formatMoney(sessionPrice) : toText(row.price, 'Eşleşme sonrası netleşir')
  const profileImageUrl = toText(row.photo_url) || null

  return {
    id: toText(row.id),
    slug: toText(row.slug),
    name,
    title,
    imageInitials: getInitials(name),
    profileImageUrl: isValidImageUrl(profileImageUrl) ? profileImageUrl : null,
    areas: areas.length > 0 ? areas : DEFAULT_SUPPORT_AREAS.slice(0, 3),
    experience: toText(row.experience, 'Eşleşme sırasında netleşir'),
    onlineText: online.onlineText,
    availabilityText: toText(
      row.availability,
      'Uygun gün ve saatler ön eşleşme sonrasında birlikte netleştirilir.'
    ),
    priceText,
    sessionPrice,
    sessionDurationMinutes: 50,
    bio: toText(
      row.expectation || row.note,
      'Mindora uzman profili, danışanın ihtiyaçlarını daha doğru anlamak ve güvenli bir başlangıç yapmasını kolaylaştırmak için hazırlanmıştır.'
    ),
    approach: toText(
      row.note,
      'İlk adımda ihtiyacın, beklentin ve uygun zamanların değerlendirilir. Ardından sana en uygun psikolojik destek süreci planlanır.'
    ),
    isOnlineAvailable: online.isOnlineAvailable,
  }
}

async function getExpertBySlug(slug: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
    .from('experts')
    .select(
      [
        'id',
        'slug',
        'name',
        'title',
        'areas',
        'experience',
        'online',
        'price',
        'session_price',
        'availability',
        'expectation',
        'note',
        'status',
        'photo_url',
        'created_at',
      ].join(', ')
    )
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('PUBLIC_EXPERT_DETAIL_QUERY_ERROR', error)
    return null
  }

  if (!data || !isPublicExpert(data as ExpertRow)) {
    return null
  }

  return normalizeExpert(data as ExpertRow)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  if (!slug || !isSafeSlug(slug)) {
    return {
      title: 'Uzman Profili | Mindora',
      description: DEFAULT_DESCRIPTION,
    }
  }

  const expert = await getExpertBySlug(slug)

  if (!expert) {
    return {
      title: 'Uzman Profili Bulunamadı | Mindora',
      description: DEFAULT_DESCRIPTION,
    }
  }

  const description = `${expert.name} - ${expert.title}. Mindora üzerinden online psikolojik destek sürecine güvenli şekilde başlayın.`

  return {
    title: `${expert.name} | Mindora`,
    description,
    alternates: {
      canonical: `/uzmanlar/${expert.slug}`,
    },
    openGraph: {
      title: `${expert.name} | Mindora`,
      description,
      type: 'profile',
      url: `/uzmanlar/${expert.slug}`,
    },
  }
}

export default async function PublicExpertDetailPage({ params }: PageProps) {
  const { slug } = await params

  if (!slug || !isSafeSlug(slug)) {
    notFound()
  }

  const expert = await getExpertBySlug(slug)

  if (!expert) {
    notFound()
  }

  const matchingHref = `/eslesme?expert=${encodeURIComponent(expert.slug)}`

  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-7xl px-5 py-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-neutral-500">
          <Link href="/" className="transition hover:text-black">
            Ana Sayfa
          </Link>
          <span>/</span>
          <Link href="/uzmanlar" className="transition hover:text-black">
            Uzmanlar
          </Link>
          <span>/</span>
          <span className="text-black">{expert.name}</span>
        </nav>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10">
        <div className="grid gap-6 rounded-[2.25rem] bg-white p-6 shadow-sm ring-1 ring-black/5 lg:grid-cols-[1fr_390px] lg:p-10">
          <div className="flex flex-col gap-7 sm:flex-row">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[2rem] bg-black text-white shadow-sm ring-1 ring-black/10">
              {expert.profileImageUrl ? (
                <img
                  src={expert.profileImageUrl}
                  alt={`${expert.name} profil fotoğrafı`}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-black">
                  {expert.imageInitials}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  Onaylı uzman profili
                </span>
                <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">
                  {expert.onlineText}
                </span>
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                {expert.name}
              </h1>

              <p className="mt-3 text-base font-bold text-neutral-600">
                {expert.title} • {expert.experience}
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">
                {expert.bio}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {expert.areas.slice(0, 8).map((area) => (
                  <span
                    key={area}
                    className="rounded-full bg-[#f7f2eb] px-3 py-1 text-xs font-black text-neutral-700 ring-1 ring-black/5"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-[#f7f2eb] p-6 ring-1 ring-black/5">
            <p className="text-sm font-bold text-neutral-500">Seans ücreti</p>
            <p className="mt-2 text-3xl font-black text-black">{expert.priceText}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {expert.sessionDurationMinutes} dk online görüşme
            </p>

            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-sm font-black text-black">Müsaitlik</p>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                {expert.availabilityText}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href={matchingHref}
                className="flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-neutral-800"
              >
                Bu uzmanla eşleşme iste
              </Link>

              <Link
                href="/uzmanlar"
                className="flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-[#f7f2eb]"
              >
                Diğer uzmanları gör
              </Link>
            </div>

            <p className="mt-5 text-xs leading-5 text-neutral-500">
              Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa en yakın sağlık kuruluşuna başvur ya da 112 ile iletişime geç.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Çalışma Yaklaşımı">
            <p className="text-sm leading-7 text-neutral-600">{expert.approach}</p>
          </InfoCard>

          <InfoCard title="Çalıştığı Konular">
            <div className="grid gap-3 sm:grid-cols-2">
              {expert.areas.map((area) => (
                <div
                  key={area}
                  className="rounded-2xl border border-black/5 bg-[#f7f2eb] px-4 py-3 text-sm font-black text-neutral-700"
                >
                  {area}
                </div>
              ))}
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard title="Güvenli Süreç">
            <div className="space-y-3">
              <InfoRow label="Profil" value="Onaylı" />
              <InfoRow label="Görüşme" value={expert.onlineText} />
              <InfoRow label="Süre" value={`${expert.sessionDurationMinutes} dk`} />
              <InfoRow label="Ücret" value={expert.priceText} />
            </div>
          </InfoCard>

          <InfoCard title="Mindora Akışı">
            <List
              items={[
                'Ön eşleşme formunu doldur',
                'İhtiyacına uygun süreç netleşsin',
                'Randevu, ödeme ve görüşme adımlarını güvenli şekilde tamamla',
              ]}
            />
          </InfoCard>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="rounded-[2rem] bg-black p-8 text-white shadow-sm md:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-400">
                Ücretsiz ön eşleşme
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Bu uzman senin için uygun mu birlikte değerlendirelim.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                Kısa formu doldur. Mindora ekibi ihtiyacına, beklentine ve uygun zamanına göre süreci güvenli şekilde başlatsın.
              </p>
            </div>

            <Link
              href={matchingHref}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-neutral-200"
            >
              Eşleşme Formuna Git
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black tracking-tight text-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm ring-1 ring-black/5">
      <span className="text-neutral-600">{label}</span>
      <span className="text-right font-black text-black">{value}</span>
    </div>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-600">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
