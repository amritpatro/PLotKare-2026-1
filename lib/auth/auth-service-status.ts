export const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  'PlotKare sign-in is temporarily unavailable because the authentication service is not reachable.'

export const AUTH_SERVICE_RETRY_MESSAGE = 'Please retry in a moment. If this continues, check Supabase project status.'

export type AuthServiceStatusPayload = {
  available: boolean
  email: boolean
  google: boolean
  status: number | null
  message: string | null
  checkedAt: string
}

type AuthUpstreamErrorLike = {
  status?: number | string | null
  message?: string | null
  name?: string | null
}

export function normalizeAuthStatus(status: number | string | null | undefined): number | null {
  if (status === null || status === undefined || status === '') return null
  const parsed = Number(status)
  return Number.isFinite(parsed) ? parsed : null
}

export function isAuthServiceUnavailableStatus(status: number | string | null | undefined): boolean {
  const normalized = normalizeAuthStatus(status)
  if (normalized === null) return false
  return normalized === 0 || normalized === 521 || normalized === 522 || normalized === 523 || normalized === 524 || normalized >= 500
}

export function isAuthServiceUnavailableError(error: AuthUpstreamErrorLike | null | undefined): boolean {
  if (!error) return false
  if (isAuthServiceUnavailableStatus(error.status)) return true

  const message = `${error.name ?? ''} ${error.message ?? ''}`.toLowerCase()
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('cloudflare') ||
    message.includes('origin is unreachable') ||
    message.includes('web server is down') ||
    message.includes('service unavailable') ||
    message.includes('bad gateway') ||
    message.includes('gateway timeout')
  )
}

export function authServiceUnavailablePayload(status: number | string | null | undefined): AuthServiceStatusPayload {
  return {
    available: false,
    email: false,
    google: false,
    status: normalizeAuthStatus(status),
    message: AUTH_SERVICE_UNAVAILABLE_MESSAGE,
    checkedAt: new Date().toISOString(),
  }
}
