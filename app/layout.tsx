import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'Mindora | Online Psikolojik Destek Platformu',
    template: '%s | Mindora',
  },
  description:
    'Mindora; psikolojik destek almak isteyen kişileri uygun uzmanlarla buluşturan, güvenli online görüşme ve ön eşleşme platformudur.',
  keywords: [
    'Mindora',
    'online psikolog',
    'online terapi',
    'psikolojik destek',
    'psikolog eşleşme',
    'kaygı testi',
    'psikolojik testler',
  ],
  authors: [{ name: 'Mindora' }],
  creator: 'Mindora',
  publisher: 'Mindora',
  metadataBase: new URL('https://mindora-delta.vercel.app'),
  openGraph: {
    title: 'Mindora | Online Psikolojik Destek Platformu',
    description:
      'Mindora ile psikolojik destek sürecine güvenli, sade ve online şekilde başlayın.',
    url: 'https://mindora-delta.vercel.app',
    siteName: 'Mindora',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mindora | Online Psikolojik Destek Platformu',
    description:
      'Psikolojik destek almak isteyen kişiler için güvenli online ön eşleşme platformu.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full bg-[#f7f2eb] text-[#171717]">
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
