import type { MetadataRoute } from 'next'
import { canonicalPageUrl } from '@/lib/site-config'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/admin/', '/login/', '/signup/', '/godmode/', '/agent/'],
    },
    sitemap: canonicalPageUrl('/sitemap.xml'),
  }
}
