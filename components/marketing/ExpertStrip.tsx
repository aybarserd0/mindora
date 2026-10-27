import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Avatar } from '@/components/marketing/Mocks'
import Reveal from '@/components/marketing/Reveal'

const MIN_EXPERTS_WITH_PHOTO = 3
const MAX_EXPERTS = 6

type StripExpert = { id: string; name: string; title: string | null; areas: string | null; photo_url: string | null }

function isHttpUrl(url: string | null) {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr-TR'))
    .join('')
}

function firstArea(areas: string | null) {
  return areas?.split(',').map((a) => a.trim()).filter(Boolean)[0] ?? null
}

async function getStripExperts(): Promise<StripExpert[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('experts')
      .select('id, name, title, areas, photo_url')
      .eq('status', 'approved')
      .neq('account_type', 'supervision_only')
      .not('photo_url', 'is', null)
      .order('created_at', { ascending: true })
      .limit(20)
    if (error || !data) return []
    return (data as StripExpert[]).filter((e) => e.name && isHttpUrl(e.photo_url)).slice(0, MAX_EXPERTS)
  } catch {
    return []
  }
}

// Önizlemede tasarımı görebilmek için örnek kartlar. Yüz fotoğrafı kullanılmaz,
// canlı sitede hiç gösterilmez.
const SAMPLE_EXPERTS: StripExpert[] = [
  { id: 's1', name: 'Örnek Uzman', title: 'Klinik Psikolog', areas: 'Kaygı ve stres', photo_url: null },
  { id: 's2', name: 'Örnek Uzman', title: 'Uzman Psikolog', areas: 'İlişki ve aile', photo_url: null },
  { id: 's3', name: 'Örnek Uzman', title: 'Psikolog', areas: 'Özgüven', photo_url: null },
  { id: 's4', name: 'Örnek Uzman', title: 'Klinik Psikolog', areas: 'Tükenmişlik', photo_url: null },
]

export default async function ExpertStrip() {
  const experts = await getStripExperts()
  const isPreview = process.env.VERCEL_ENV === 'preview'
  const enoughReal = experts.length >= MIN_EXPERTS_WITH_PHOTO
  if (!enoughReal && !isPreview) return null
  const list = enoughReal ? experts : SAMPLE_EXPERTS

  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Uzmanlarımızdan bazıları</h2>
            <p className="mt-3 max-w-xl text-lg leading-8 text-slate-600">
              Hepsinin diploması ve unvanı tek tek kontrol edildi.
            </p>
          </div>
          <Link href="/uzmanlar" className="font-semibold text-pine-800 underline decoration-pine-300 underline-offset-4 hover:decoration-pine-700">
            Tüm uzmanları gör
          </Link>
        </Reveal>

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {list.map((expert) => (
            <li key={expert.id}>
              <Link href="/uzmanlar" className="group block rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-pine-100">
                  {expert.photo_url ? (
                    // Uzman fotoğrafları farklı alan adlarından gelebilir; optimizasyon dışı bırakıldı
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={expert.photo_url} alt={`${expert.name} profil fotoğrafı`} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Avatar initials={initials(expert.name)} size="lg" />
                    </div>
                  )}
                </div>
                <p className="mt-3 truncate font-display font-semibold text-slate-900">{expert.name}</p>
                <p className="truncate text-sm text-slate-500">{expert.title || 'Psikolog'}</p>
                {firstArea(expert.areas) ? (
                  <p className="mt-2 inline-block max-w-full truncate rounded-full bg-pine-50 px-2.5 py-1 text-xs font-medium text-pine-800">
                    {firstArea(expert.areas)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
        {!enoughReal ? (
          <p className="mt-4 text-xs text-slate-400">
            Önizleme: örnek kartlar. Canlı sitede bu bölüm, fotoğrafı olan en az {MIN_EXPERTS_WITH_PHOTO} onaylı uzman olunca gerçek profillerle görünür.
          </p>
        ) : null}
      </div>
    </section>
  )
}
