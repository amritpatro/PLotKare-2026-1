import { getSiteUrl } from '@/lib/supabase/env'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isLocalDevHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname)
}

/** Origin used in auth email/OAuth redirect URLs (browser localhost wins over env). */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location
    if (isLocalDevHost(hostname)) {
      return origin.replace(/\/$/, '')
    }
  }

  return getSiteUrl()
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const origin = getAuthRedirectOrigin()
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
}

type AuthErrorLike = {
  message?: string
  status?: number
  name?: string
}

const SMTP_SETUP_HELP =
  'PlotKare cannot fix this in app code — Supabase failed to send the confirmation email. ' +
  'In Supabase: Authentication → Email → verify SMTP (or temporarily use the built-in sender). ' +
  'Authentication → URL Configuration → add Redirect URLs for your dev origin + /auth/callback ' +
  '(e.g. http://127.0.0.1:3002/auth/callback and http://localhost:3002/auth/callback). ' +
  'Check Authentication → Logs for the SMTP error detail.'

const REDIRECT_URL_HELP =
  'This redirect URL is not allowed by Supabase. Add your exact callback under Authentication → URL Configuration → Redirect URLs ' +
  '(e.g. http://127.0.0.1:3002/auth/callback and http://localhost:3002/auth/callback for your dev port).'

function isRedirectUrlError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('redirect') && (lower.includes('not allowed') || lower.includes('invalid'))
}

/** True when signup/reset failed because Supabase could not send email (SMTP, etc.). */
export function isAuthEmailDeliveryError(error: AuthErrorLike): boolean {
  const message = error.message?.trim() ?? ''
  const lower = message.toLowerCase()
  const status = error.status

  if (isRedirectUrlError(message)) return false

  return (
    status === 500 ||
    lower.includes('smtp') ||
    lower.includes('confirmation email') ||
    lower.includes('error sending') ||
    lower.includes('unable to send') ||
    (lower.includes('email') &&
      (lower.includes('send') || lower.includes('mail') || lower.includes('delivery')))
  )
}

export function formatAuthError(error: AuthErrorLike): string {
  const message = error.message?.trim() ?? ''
  const status = error.status

  if (isRedirectUrlError(message)) {
    return REDIRECT_URL_HELP
  }

  if (isAuthEmailDeliveryError(error)) {
    return SMTP_SETUP_HELP
  }

  if (message) return message

  return status
    ? `Authentication failed (${status}). Try again or contact support.`
    : 'Authentication failed. Try again or contact support.'
}

/** Signup succeeded but the user must confirm email before a session is issued. */
export function signupAwaitingEmailConfirmation(data: {
  session: unknown
  user: unknown
}): boolean {
  return Boolean(data.user) && !data.session
}
