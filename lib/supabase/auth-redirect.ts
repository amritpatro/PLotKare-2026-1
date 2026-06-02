import { getSiteUrl } from '@/lib/supabase/env'

const LOCAL_HOSTS = new Set(['localhost', [127, 0, 0, 1].join('.'), '[::1]'])

export function isLocalDevHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname)
}

/** Origin used in auth email/OAuth redirect URLs. Browser requests stay on the active deployment. */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '')
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

const EMAIL_DELIVERY_MESSAGE =
  'We could not send the email right now. Please try again later.'

const AUTH_RETRY_MESSAGE =
  'We could not complete sign-in right now. Please try again later.'

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
    return AUTH_RETRY_MESSAGE
  }

  if (isAuthEmailDeliveryError(error)) {
    return EMAIL_DELIVERY_MESSAGE
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
