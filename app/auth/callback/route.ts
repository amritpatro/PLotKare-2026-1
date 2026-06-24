import { logger } from '@/lib/monitoring/logger'
import { NextRequest, NextResponse } from 'next/server'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function safeRelativePath(path: string | null, fallback: string) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return fallback
  try {
    const base = new URL('https://plotkare.invalid')
    const candidate = new URL(path, base)
    if (candidate.origin !== base.origin) return fallback
    return `${candidate.pathname}${candidate.search}${candidate.hash}`
  } catch {
    return fallback
  }
}

function redirectTo(request: NextRequest, path: string) {
  const requestUrl = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin =
    process.env.NODE_ENV === 'development' || !forwardedHost
      ? requestUrl.origin
      : `${forwardedProto}://${forwardedHost}`

  return NextResponse.redirect(new URL(path, origin))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const verificationType = searchParams.get('type')
  const flow = searchParams.get('flow')
  const next = safeRelativePath(searchParams.get('next'), '/auth/choose-role')

  if (!code && !(tokenHash && verificationType === 'recovery')) {
    const destination = flow === 'recovery' ? '/forgot-password?error=invalid_link' : '/auth/login?error=no_code'
    return redirectTo(request, destination)
  }

  const supabase = await createSupabaseServerClient()

  const { error } =
    tokenHash && verificationType === 'recovery'
      ? await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code as string)
  if (error) {
    logger.error('Auth callback error:', error)
    const destination = flow === 'recovery' ? '/forgot-password?error=expired_link' : '/auth/login?error=auth_failed'
    return redirectTo(request, destination)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirectTo(request, flow === 'recovery' ? '/forgot-password?error=invalid_link' : '/auth/login')
  }

  if (flow === 'recovery') {
    return redirectTo(request, '/update-password')
  }

  const destination = await resolvePostLoginRedirect(
    supabase,
    user.id,
    next.startsWith('/') && !next.startsWith('/dashboard') ? next : '/auth/choose-role',
  )

  return redirectTo(request, destination)
}
