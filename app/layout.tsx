import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import RootAppShell from '@/components/RootAppShell'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindora-delta.vercel.app'
const siteName = 'Mindora'
const defaultTitle = 'Mindora | Online Psikolojik Destek Platformu'
const defaultDescription =
  'Mindora; psikolojik destek almak isteyen kişileri uygun uzmanlarla buluşturan, güvenli online görüşme ve ön eşleşme platformudur.'

const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || ''

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    'Mindora',
    'online psikolog',
    'online terapi',
    'online psikolojik destek',
    'psikolojik destek',
    'psikolog eşleşme',
    'uzman psikolog',
    'terapi platformu',
    'kaygı testi',
    'depresyon testi',
    'stres testi',
    'psikolojik testler',
    'Türkiye online psikolog',
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: 'health',
  alternates: {
    canonical: '/',
    languages: {
      'tr-TR': '/',
    },
  },
  openGraph: {
    title: defaultTitle,
    description:
      'Mindora ile psikolojik destek sürecine güvenli, sade ve online şekilde başlayın. Uygun uzmanlarla eşleşin, online görüşme sürecinizi yönetin.',
    url: '/',
    siteName,
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mindora Online Psikolojik Destek Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description:
      'Psikolojik destek almak isteyen kişiler için güvenli online ön eşleşme ve görüşme platformu.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  verification: {
    google: googleSiteVerification || undefined,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4f46e5',
}

function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    sameAs: [],
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}#website`,
    name: siteName,
    url: siteUrl,
    inLanguage: 'tr-TR',
    publisher: {
      '@id': `${siteUrl}#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/uzmanlar?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${siteUrl}#service`,
    name: 'Online Psikolojik Destek Ön Eşleşme Hizmeti',
    provider: {
      '@id': `${siteUrl}#organization`,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Türkiye',
    },
    serviceType: 'Online psikolojik destek ve uzman eşleştirme',
    description: defaultDescription,
    url: siteUrl,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c'),
        }}
      />
    </>
  )
}

function AnalyticsScripts() {
  if (!googleAnalyticsId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
        strategy="afterInteractive"
      />
      <Script id="mindora-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          gtag('config', '${googleAnalyticsId}', {
            anonymize_ip: true,
            send_page_view: true
          });
        `}
      </Script>
    </>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="h-full scroll-smooth antialiased">
      <body className="min-h-full bg-[#f7f2eb] text-[#171717]">
        <AnalyticsScripts />
        <JsonLd />
        <ToastProvider>
          <RootAppShell>{children}</RootAppShell>
        </ToastProvider>
      </body>
    </html>
  )
}
