import type { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const siteUrl = getSiteUrl()

type ExpertSitemapRow = {
  slug?: string | null
  status?: string | null
  account_status?: string | null
  updated_at?: string | null
  created_at?: string | null
}

const staticRoutes = [
  {
    path: '/',
    priority: 1,
    changeFrequency: 'daily' as const,
  },
  {
    path: '/uzmanlar',
    priority: 0.95,
    changeFrequency: 'daily' as const,
  },
  {
    path: '/eslesme',
    priority: 0.9,
    changeFrequency: 'weekly' as const,
  },
  {
    path: '/psikolojik-testler',
    priority: 0.85,
    changeFrequency: 'weekly' as const,
  },
  {
    path: '/sss',
    priority: 0.75,
    changeFrequency: 'monthly' as const,
  },
  {
    path: '/hakkimizda',
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  },
  {
    path: '/uzman-basvuru',
    priority: 0.65,
    changeFrequency: 'monthly' as const,
  },
]

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString()
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function isPublicExpert(expert: ExpertSitemapRow) {
  const status = normalizeStatus(expert.status)
  const accountStatus = normalizeStatus(expert.account_status)

  const hiddenStatuses = ['rejected', 'passive', 'inactive', 'hidden', 'blocked']
  const approvedStatuses = ['approved', 'onaylı', 'onayli', 'active', 'aktif']

  if (hiddenStatuses.includes(status) || hiddenStatuses.includes(accountStatus)) {
    return false
  }

  if (!status) return true

  return approvedStatuses.includes(status)
}

async function getExpertRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getSupabaseAdmin() as any

    const { data, error } = await supabase
      .from('experts')
      .select('slug, status, account_status, updated_at, created_at')
      .not('slug', 'is', null)
      .limit(5000)

    if (error) {
      console.warn('SITEMAP_EXPERTS_QUERY_ERROR', error.message)
      return []
    }

    return ((data || []) as ExpertSitemapRow[])
      .filter((expert) => expert.slug && isPublicExpert(expert))
      .map((expert) => ({
        url: absoluteUrl(`/uzmanlar/${expert.slug}`),
        lastModified: expert.updated_at || expert.created_at || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (error) {
    console.warn('SITEMAP_EXPERTS_UNEXPECTED_ERROR', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const expertRoutes = await getExpertRoutes()

  const staticEntries = staticRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  return [...staticEntries, ...expertRoutes]
}
