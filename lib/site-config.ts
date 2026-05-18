/** Canonical site URL for metadata, sitemap, and JSON-LD (set in production via env). */
export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (env) return env.replace(/\/$/, '')
  return 'https://plotkare.in'
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
  const u = absoluteUrl(base)
  return u.endsWith('/') ? u : `${u}/`
}

export const SITE_NAME = 'PlotKare'
