import type { MetadataRoute } from 'next'
import { canonicalPageUrl } from '@/lib/site-config'

/** Required for `output: 'export'` (static HTML export). */
export const dynamic = 'force-static'
import { getAllSlugs } from '@/lib/blog-posts'
import { getCorridorSlugs } from '@/lib/corridor-pages'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const core = ['/', '/listings/', '/blog/', '/demo/plot-3d/', '/privacy/', '/terms/', '/refund/', '/support/'].map((path) => ({
    url: canonicalPageUrl(path),
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }))

  const posts = getAllSlugs().map((slug) => ({
    url: canonicalPageUrl(`/blog/${slug}/`),
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  const corridors = getCorridorSlugs().map((slug) => ({
    url: canonicalPageUrl(`/corridors/${slug}/`),
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...core, ...posts, ...corridors]
}
