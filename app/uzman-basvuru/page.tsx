import type { Metadata } from 'next'
import Header from '@/components/Header'
import { PROFESSION_CONFIG, professionFromSlug } from '@/lib/professions'
import UzmanBasvuruForm from './UzmanBasvuruForm'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const profession = professionFromSlug((await searchParams).meslek)
  const config = PROFESSION_CONFIG[profession]
  const title = `${config.label} Olarak Başvur`
  const description = config.expert.heroLead
  return {
    title,
    description,
    openGraph: { title: `${title} | Mindora`, description, siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
    alternates: { canonical: profession === 'psychologist' ? '/uzman-basvuru' : `/uzman-basvuru?meslek=${config.slug}` },
  }
}

export default async function UzmanBasvuruPage({ searchParams }: Props) {
  const profession = professionFromSlug((await searchParams).meslek)
  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />
      <UzmanBasvuruForm key={profession} profession={profession} />
    </main>
  )
}
