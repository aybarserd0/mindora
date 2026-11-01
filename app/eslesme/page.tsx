import type { Metadata } from 'next'
import Header from '@/components/Header'
import { PROFESSION_CONFIG, professionFromSlug } from '@/lib/professions'
import EslesmeForm from './EslesmeForm'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const profession = professionFromSlug((await searchParams).meslek)
  const config = PROFESSION_CONFIG[profession]
  const description = `Kısa formu doldur, belgeleri kontrol edilmiş ${config.plural.toLocaleLowerCase('tr-TR')} arasından sana uygun olanı ücretsiz önerelim.`
  const title = profession === 'psychologist' ? 'Ücretsiz Ön Eşleşme' : `${config.label} için Ücretsiz Ön Eşleşme`
  return {
    title,
    description,
    alternates: { canonical: profession === 'psychologist' ? '/eslesme' : `/eslesme?meslek=${config.slug}` },
    openGraph: { title: `${title} | Mindora`, description, siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
  }
}

export default async function EslesmePage({ searchParams }: Props) {
  const profession = professionFromSlug((await searchParams).meslek)
  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />
      {/* key: meslek değişince form sıfırlanır */}
      <EslesmeForm key={profession} profession={profession} />
    </main>
  )
}
