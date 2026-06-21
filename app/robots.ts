import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindora-delta.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/uzmanlar',
          '/uzmanlar/',
          '/eslesme',
          '/psikolojik-testler',
          '/sss',
          '/hakkimizda',
          '/uzman-basvuru',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/client/dashboard',
          '/client/dashboard/',
          '/client/chat',
          '/client/chat/',
          '/client/session',
          '/client/session/',
          '/expert/dashboard',
          '/expert/dashboard/',
          '/expert/chat',
          '/expert/chat/',
          '/expert/session',
          '/expert/session/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
