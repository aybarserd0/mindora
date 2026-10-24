import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Onaylı Psikologlar',
  description: 'Belgeleri tek tek kontrol edilmiş psikologları incele. Ücretler baştan yazar, görüşmeler kaydedilmez, düzenli süpervizyon alan uzmanlar rozetle görünür.',
  alternates: { canonical: '/uzmanlar' },
  openGraph: { title: 'Onaylı Psikologlar | Mindora', description: 'Belgeleri tek tek kontrol edilmiş psikologları incele. Ücretler baştan yazar, görüşmeler kaydedilmez, düzenli süpervizyon alan uzmanlar rozetle görünür.', url: '/uzmanlar', siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
