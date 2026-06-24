import type { MetadataRoute } from 'next'
import { getCanonicalSiteUrl, withBasePath } from '@/lib/site-config'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/dashboard/',
        '/auth/',
        '/api/',
        '/onboarding/',
        '/login/',
        '/signup/',
        '/forgot-password/',
        '/update-password/',
        '/settings/',
        '/seller/',
        '/owner/',
        '/customer/',
        '/employee/',
        '/godmode/',
        '/agent/',
      ],
    },
    sitemap: `${getCanonicalSiteUrl()}${withBasePath('/sitemap.xml')}`,
  }
}
