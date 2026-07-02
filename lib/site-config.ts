const PRODUCTION_CANONICAL_URL = 'https://plotkare.in'
const DEPLOYMENT_FALLBACK_URL = 'https://p-lot-kare-2026-1.vercel.app'

function cleanUrl(value: string): string {
  return value.trim().replace(/\/$/, '')
}

function isPreviewOrLocalUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')
  } catch {
    return true
  }
}

/** Runtime site URL for auth redirects and absolute app links (set per environment). */
export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (env) return cleanUrl(env)
  if (process.env.VERCEL_URL) return cleanUrl(`https://${process.env.VERCEL_URL}`)
  return DEPLOYMENT_FALLBACK_URL
}

/** Public canonical URL for metadata, sitemap, and JSON-LD. Never default to preview hosts. */
export function getCanonicalSiteUrl(): string {
  const canonicalEnv = process.env.NEXT_PUBLIC_CANONICAL_SITE_URL?.trim()
  if (canonicalEnv) return cleanUrl(canonicalEnv)

  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (siteEnv && !isPreviewOrLocalUrl(siteEnv)) return cleanUrl(siteEnv)

  return PRODUCTION_CANONICAL_URL
}

export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ''
  if (!base) return path.startsWith('/') ? path : `/${path}`
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base.replace(/\/$/, '')}${p}`
}

export function absoluteUrl(path: string): string {
  const site = getSiteUrl()
  const rel = withBasePath(path)
  return `${site}${rel}`
}

/** Matches `trailingSlash: true` in Next config for canonical and sitemap URLs. */
export function canonicalPageUrl(path: string): string {
  const base = path === '/' || path === '' ? '/' : path.startsWith('/') ? path : `/${path}`
  const rel = withBasePath(base)
  const u = `${getCanonicalSiteUrl()}${rel}`
  return u.endsWith('/') ? u : `${u}/`
}

export const SITE_NAME = 'PlotKare'
