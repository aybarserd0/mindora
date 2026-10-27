import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Avatar } from '@/components/marketing/Mocks'
import Reveal from '@/components/marketing/Reveal'
import { PROFESSION_CONFIG, toProfession, type Profession } from '@/lib/professions'

const MIN_EXPERTS_WITH_PHOTO = 3
const MAX_EXPERTS = 6

type StripExpert = { id: string; name: string; title: string | null; areas: string | null; photo_url: string | null; profession?: string | null }

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

async function getStripExperts(profession: Profession | 'all'): Promise<StripExpert[]> {
  try {
    let query = getSupabaseAdmin()
      .from('experts')
      .select('id, name, title, areas, photo_url, profession')
      .eq('status', 'approved')
      .neq('account_type', 'supervision_only')
    if (profession !== 'all') query = query.eq('profession', profession)
    const { data, error } = await query
      .not('photo_url', 'is', null)
      .order('created_at', { ascending: true })
      .limit(30)
    if (error || !data) return []
    return (data as StripExpert[]).filter((e) => e.name && isHttpUrl(e.photo_url)).slice(0, MAX_EXPERTS)
  } catch {
    return []
  }
}

// Önizlemede tasarımı görebilmek için örnek kartlar. Yüz fotoğrafı kullanılmaz,
// canlı sitede hiç gösterilmez.
function sampleExperts(profession: Profession | 'all'): StripExpert[] {
  const pick = (p: Profession, i: number): StripExpert => ({
    id: `s-${p}-${i}`,
    name: 'Örnek Uzman',
    title: PROFESSION_CONFIG[p].label,
    areas: PROFESSION_CONFIG[p].expert.areas[i],
    photo_url: null,
    profession: p,
  })
  if (profession === 'all') {
    return [pick('psychologist', 0), pick('dietitian', 0), pick('trainer', 0), pick('psychologist', 1), pick('dietitian', 1), pick('trainer', 4)]
  }
  return [0, 1, 2, 3].map((i) => pick(profession, i))
}

export default async function ExpertStrip({ profession = 'all' }: { profession?: Profession | 'all' }) {
  const config = profession === 'all' ? null : PROFESSION_CONFIG[profession]
  const experts = await getStripExperts(profession)
  const isPreview = process.env.VERCEL_ENV === 'preview'
  const enoughReal = experts.length >= MIN_EXPERTS_WITH_PHOTO
  if (!enoughReal && !isPreview) return null
  const list = enoughReal ? experts : sampleExperts(profession)
  const listHref = !config || profession === 'psychologist' ? '/uzmanlar' : `/uzmanlar?meslek=${config.slug}`

  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{!config ? 'Uzmanlarımızdan bazıları' : `${config.plural}imizden bazıları`}</h2>
            <p className="mt-3 max-w-xl text-lg leading-8 text-slate-600">
              {!config ? 'Psikolog, diyetisyen ve antrenörlerimizin belgeleri tek tek kontrol edildi.' : 'Hepsinin belgeleri tek tek kontrol edildi.'}
            </p>
          </div>
          <Link href={listHref} className="font-semibold text-pine-800 underline decoration-pine-300 underline-offset-4 hover:decoration-pine-700">
            Tümünü gör
          </Link>
        </Reveal>

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {list.map((expert) => (
            <li key={expert.id}>
              <Link href={listHref} className="group block rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg">
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
                <p className="truncate text-sm text-slate-500">{expert.title || PROFESSION_CONFIG[toProfession(expert.profession)].label}</p>
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
