export const ADMIN_AUTH_KEY = 'plotkare_admin_auth'
export const ADMIN_CREDENTIALS = {
  email: 'admin@plotkare.in',
  password: 'PlotKare@Admin2025',
} as const

export function readAdminAuth(): { email: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ADMIN_AUTH_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { email?: string }
    if (o?.email === ADMIN_CREDENTIALS.email) return { email: o.email }
    return null
  } catch {
    return null
  }
}

export function writeAdminAuth() {
  localStorage.setItem(
    ADMIN_AUTH_KEY,
    JSON.stringify({ email: ADMIN_CREDENTIALS.email, at: Date.now() }),
  )
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_AUTH_KEY)
}
