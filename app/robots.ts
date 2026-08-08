import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()

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
