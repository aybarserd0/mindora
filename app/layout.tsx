import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import '@fontsource-variable/onest'
import '@fontsource-variable/bricolage-grotesque'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import RootAppShell from '@/components/RootAppShell'
import { getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()
const siteName = 'Mindora'
const defaultTitle = 'Mindora | Online Psikolog, Diyetisyen ve Kişisel Antrenör'
const defaultDescription =
  'Mindora; psikolog, diyetisyen ve kişisel antrenör desteği arayanları belgeleri kontrol edilmiş uzmanlarla buluşturan güvenli online görüşme ve ön eşleşme platformudur.'

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
    'online diyetisyen',
    'diyetisyen',
    'online kişisel antrenör',
    'kişisel antrenör',
    'online pt',
    'psikolog eşleşme',
    'uzman psikolog',
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
      'Psikolog, diyetisyen ya da kişisel antrenör: Mindora sana uygun uzmanı ücretsiz önerir, görüşmeni online ve güvenle yaparsın.',
    url: '/',
    siteName,
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mindora: online psikolog, diyetisyen ve kişisel antrenör',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description:
      'Psikolog, diyetisyen ve kişisel antrenörlerle güvenli online ön eşleşme ve görüşme platformu.',
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
  themeColor: '#254a3f',
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
    name: 'Online Psikolog, Diyetisyen ve Kişisel Antrenör Eşleşme Hizmeti',
    provider: {
      '@id': `${siteUrl}#organization`,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Türkiye',
    },
    serviceType: 'Online psikolojik destek, diyetisyenlik ve kişisel antrenörlük için uzman eşleştirme',
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
      <body className="min-h-full bg-slate-50 text-slate-900">
        <AnalyticsScripts />
        <JsonLd />
        <ToastProvider>
          <RootAppShell>{children}</RootAppShell>
        </ToastProvider>
      </body>
    </html>
  )
}
