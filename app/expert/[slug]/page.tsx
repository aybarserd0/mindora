import Header from '@/components/Header'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ slug: string }>
}

type ExpertRow = {
  id?: string | null
  slug?: string | null
  name?: string | null
  title?: string | null
  city?: string | null
  status?: string | null
  is_active?: boolean | null
  bio?: string | null
  public_bio?: string | null
  approach?: string | null
  specialties?: unknown
  focus_areas?: unknown
  education?: unknown
  certificates?: unknown
  experience_years?: number | string | null
  session_price?: number | string | null
  session_duration_minutes?: number | string | null
  profile_image_url?: string | null
  photo_url?: string | null
  availability?: string | null
  online?: string | null
}

type PublicExpertProfile = {
  id: string
  slug: string
  name: string
  title: string
  city: string
  imageInitials: string
  profileImageUrl: string | null
  specialties: string[]
  focusAreas: string[]
  education: string[]
  certificates: string[]
  experienceYears: number
  sessionPrice: number
  sessionDurationMinutes: number
  availabilityText: string
  bio: string
  approach: string
}

function toText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toText(item)).filter(Boolean)
      }
    } catch {
      // JSON değilse virgüllü metin olarak değerlendir.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('')

  return initials || 'M'
}

function isSafeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)
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

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Eşleşme sonrası netleşir'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeExpert(row: ExpertRow): PublicExpertProfile {
  const name = toText(row.name, 'Mindora Uzmanı')
  const title = toText(row.title, 'Uzman Psikolog')
  const profileImageUrl = toText(row.profile_image_url || row.photo_url) || null

  return {
    id: toText(row.id),
    slug: toText(row.slug),
    name,
    title,
    city: toText(row.city, 'Online'),
    imageInitials: getInitials(name),
    profileImageUrl: isValidImageUrl(profileImageUrl) ? profileImageUrl : null,
    specialties: normalizeStringArray(row.specialties),
    focusAreas: normalizeStringArray(row.focus_areas),
    education: normalizeStringArray(row.education),
    certificates: normalizeStringArray(row.certificates),
    experienceYears: toNumber(row.experience_years, 0),
    sessionPrice: toNumber(row.session_price, 0),
    sessionDurationMinutes: toNumber(row.session_duration_minutes, 50),
    availabilityText: toText(row.availability, 'Uygun saatler eşleşme sırasında netleşir'),
    bio: toText(
      row.public_bio || row.bio,
      'Uzmanın çalışma alanları ve yaklaşımı Mindora ekibi tarafından doğrulandıktan sonra burada görüntülenir.'
    ),
    approach: toText(
      row.approach,
      'İlk görüşmede ihtiyaçlar netleştirilir ve kişiye uygun destek süreci planlanır.'
    ),
  }
}

async function getExpertBySlug(slug: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await (supabase as any)
    .from('experts')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('PUBLIC_EXPERT_PROFILE_QUERY_ERROR', error)
    return null
  }

  if (!data) return null

  const status = toText(data.status).toLowerCase()
  const isActive = data.is_active !== false

  if (!isActive || status === 'rejected' || status === 'passive') {
    return null
  }

  return normalizeExpert(data as ExpertRow)
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params

  if (!slug || !isSafeSlug(slug)) {
    return {
      title: 'Uzman Profili | Mindora',
    }
  }

  const expert = await getExpertBySlug(slug)

  if (!expert) {
    return {
      title: 'Uzman Profili Bulunamadı | Mindora',
    }
  }

  return {
    title: `${expert.name} | Mindora`,
    description: `${expert.name} - ${expert.title}. Online psikolojik destek sürecine Mindora ile güvenli şekilde başlayın.`,
  }
}

export default async function PublicExpertProfilePage({ params }: PageProps) {
  const { slug } = await params

  if (!slug || !isSafeSlug(slug)) {
    notFound()
  }

  const expert = await getExpertBySlug(slug)

  if (!expert) {
    notFound()
  }

  const matchingHref = `/eslesme?expert=${encodeURIComponent(expert.slug)}`
  const hasSpecialties = expert.specialties.length > 0
  const hasFocusAreas = expert.focusAreas.length > 0
  const hasEducation = expert.education.length > 0
  const hasCertificates = expert.certificates.length > 0

  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="border-b border-black/5 bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_380px] lg:items-center lg:py-14">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] bg-black text-white shadow-sm ring-1 ring-black/10">
              {expert.profileImageUrl ? (
                <img
                  src={expert.profileImageUrl}
                  alt={`${expert.name} profil fotoğrafı`}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black">
                  {expert.imageInitials}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  Onaylı uzman profili
                </span>
                <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">
                  Online görüşme
                </span>
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                {expert.name}
              </h1>

              <p className="mt-3 text-base font-bold text-neutral-600">
                {expert.title}
                {expert.experienceYears > 0 ? ` • ${expert.experienceYears} yıl deneyim` : ''}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {(hasSpecialties ? expert.specialties : ['Online psikolojik destek']).slice(0, 6).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-700 ring-1 ring-black/10"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-neutral-500">Seans ücreti</p>
            <p className="mt-2 text-3xl font-black text-black">
              {formatMoney(expert.sessionPrice)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {expert.sessionDurationMinutes} dk online görüşme
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href={matchingHref}
                className="flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-neutral-800"
              >
                Bu uzmanla eşleşme iste
              </Link>
              <Link
                href="/uzmanlar"
                className="flex w-full items-center justify-center rounded-2xl border border-black/10 bg-[#f7f2eb] px-5 py-3 text-sm font-black text-black transition hover:bg-white"
              >
                Diğer uzmanları gör
              </Link>
            </div>

            <p className="mt-5 text-xs leading-5 text-neutral-500">
              Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa 112 ile iletişime geç.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Hakkında">
            <p className="text-sm leading-7 text-neutral-600">{expert.bio}</p>
          </InfoCard>

          <InfoCard title="Çalışma Yaklaşımı">
            <p className="text-sm leading-7 text-neutral-600">{expert.approach}</p>
          </InfoCard>

          <InfoCard title="Çalıştığı Konular">
            {hasFocusAreas ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {expert.focusAreas.map((area) => (
                  <div
                    key={area}
                    className="rounded-2xl border border-black/5 bg-[#f7f2eb] px-4 py-3 text-sm font-bold text-neutral-700"
                  >
                    {area}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-neutral-600">
                Destek alanı ön eşleşme formundaki ihtiyacına göre netleştirilir.
              </p>
            )}
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard title="Müsaitlik Özeti">
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-sm font-black text-emerald-800">Görüşme planlaması</p>
              <p className="mt-1 text-sm leading-6 text-emerald-700">
                {expert.availabilityText}
              </p>
            </div>
          </InfoCard>

          <InfoCard title="Eğitim">
            <List items={expert.education} emptyText="Eğitim bilgisi henüz eklenmedi." />
          </InfoCard>

          <InfoCard title="Sertifikalar">
            <List items={expert.certificates} emptyText="Sertifika bilgisi henüz eklenmedi." />
          </InfoCard>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14">
        <div className="rounded-[2rem] bg-black p-8 text-white shadow-sm md:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight">
                Bu uzmanla görüşmek ister misin?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                Kısa ön eşleşme formunu doldur. Mindora ekibi ihtiyacına ve uygun zamanına göre süreci güvenli şekilde başlatsın.
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

function List({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm leading-7 text-neutral-600">{emptyText}</p>
  }

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
