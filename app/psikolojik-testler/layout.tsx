import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Psikolojik Farkındalık Testleri',
  description: 'Kaygı, stres, duygu durumu ve özgüven için kısa farkındalık testleri. Yanıtların cihazından çıkmaz; sonuçlar tanı koymaz.',
  alternates: { canonical: '/psikolojik-testler' },
  openGraph: { title: 'Psikolojik Farkındalık Testleri | Mindora', description: 'Kaygı, stres, duygu durumu ve özgüven için kısa farkındalık testleri. Yanıtların cihazından çıkmaz; sonuçlar tanı koymaz.', url: '/psikolojik-testler', siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
