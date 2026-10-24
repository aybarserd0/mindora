import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Psikolog Olarak Başvur',
  description: 'Mindora uzman ağına katıl: danışan eşleştirme, şeffaf ücretlendirme ve kıdemli meslektaşlarla süpervizyon tek platformda.',
  alternates: { canonical: '/uzman-basvuru' },
  openGraph: { title: 'Psikolog Olarak Başvur | Mindora', description: 'Mindora uzman ağına katıl: danışan eşleştirme, şeffaf ücretlendirme ve kıdemli meslektaşlarla süpervizyon tek platformda.', url: '/uzman-basvuru', siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
