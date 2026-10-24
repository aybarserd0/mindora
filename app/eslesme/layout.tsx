import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Ücretsiz Ön Eşleşme',
  description: 'Kimi seçeceğini bilmek zorunda değilsin. Kısa formu doldur, belgeleri kontrol edilmiş psikologlar arasından sana uygun olanları ücretsiz önerelim.',
  alternates: { canonical: '/eslesme' },
  openGraph: { title: 'Ücretsiz Ön Eşleşme | Mindora', description: 'Kimi seçeceğini bilmek zorunda değilsin. Kısa formu doldur, belgeleri kontrol edilmiş psikologlar arasından sana uygun olanları ücretsiz önerelim.', url: '/eslesme', siteName: 'Mindora', locale: 'tr_TR', type: 'website' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
