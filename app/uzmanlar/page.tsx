import type { Metadata } from 'next'
import { PROFESSION_CONFIG, professionFromSlug } from '@/lib/professions'
import UzmanlarList from './UzmanlarList'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const profession = professionFromSlug((await searchParams).meslek)
  const config = PROFESSION_CONFIG[profession]
  const title = `Onaylı ${config.plural}`
  const description =
    profession === 'psychologist'
      ? 'Belgeleri tek tek kontrol edilmiş psikologları incele. Ücretler baştan yazar, görüşmeler kaydedilmez, düzenli süpervizyon alan uzmanlar rozetle görünür.'
      : `Belgeleri tek tek kontrol edilmiş ${config.plural.toLocaleLowerCase('tr-TR')} incele. Ücretler baştan yazar, görüşmeler kaydedilmez.`
  const canonical = profession === 'psychologist' ? '/uzmanlar' : `/uzmanlar?meslek=${config.slug}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | Mindora`, description, url: canonical, siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
  }
}

export default async function UzmanlarPage({ searchParams }: Props) {
  const profession = professionFromSlug((await searchParams).meslek)
  return <UzmanlarList key={profession} profession={profession} />
}
