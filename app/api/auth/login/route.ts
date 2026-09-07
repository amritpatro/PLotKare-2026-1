import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { requireSupabaseBrowserEnv } from '@/lib/supabase/env'
import { loginSchema } from '@/lib/validation/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { recordAuditLog } from '@/lib/audit'
import {
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  isAuthServiceUnavailableError,
} from '@/lib/auth/auth-service-status'
import { authUserBootstrapInput, ensureAuthProfile } from '@/lib/auth/profile-bootstrap'
import { safeRelativePath } from '@/lib/supabase/auth-redirect'

function requiresEmailConfirmation(error: { code?: string; message?: string } | null) {
  const code = error?.code?.toLowerCase()
  const message = error?.message?.toLowerCase() ?? ''
  return code === 'email_not_confirmed' || message.includes('email not confirmed')
}

export async function POST(request: NextRequest) {
  if (await isRateLimited(request)) {
    return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse({
    email: body?.email,
    password: body?.password,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please fill in all fields' },
      { status: 400 },
    )
  }

  const mode = body?.mode === 'admin' ? 'admin' : 'user'
  const requestedNext = typeof body?.next === 'string' ? body.next : null
  const next = requestedNext ? safeRelativePath(requestedNext, '/auth/choose-role') : undefined
  const { url, anonKey } = requireSupabaseBrowserEnv()
  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(nextCookies) {
        cookiesToSet.push(...nextCookies)
      },
    },
  })

  const signInResult = await supabase.auth.signInWithPassword(parsed.data).catch(() => null)
  if (!signInResult) {
    return NextResponse.json(
      { error: AUTH_SERVICE_UNAVAILABLE_MESSAGE },
      { status: 503 },
    )
  }

  const { data, error } = signInResult
  if (isAuthServiceUnavailableError(error)) {
    return NextResponse.json(
      { error: AUTH_SERVICE_UNAVAILABLE_MESSAGE },
      { status: 503 },
    )
  }

  if (error || !data.user) {
    await recordAuditLog({
      action: 'auth.login_failed',
      entityType: 'auth_session',
      metadata: { email: parsed.data.email, mode, reason: error?.name ?? 'invalid_credentials' },
    })
    return NextResponse.json(
      {
        error: requiresEmailConfirmation(error)
          ? 'Please confirm your email before signing in. Check your inbox and spam folder, then open the confirmation link.'
          : 'Unable to sign in. Please check your credentials and try again.',
      },
      { status: requiresEmailConfirmation(error) ? 403 : 401 },
    )
  }

  try {
    await ensureAuthProfile(authUserBootstrapInput(data.user))
  } catch (profileError) {
    await recordAuditLog({
      actorId: data.user.id,
      action: 'auth.login_profile_bootstrap_failed',
      entityType: 'auth_session',
      entityId: data.user.id,
      metadata: { mode, reason: profileError instanceof Error ? profileError.name : 'unknown' },
    })
    await supabase.auth.signOut()
    const profileResponse = NextResponse.json(
      { error: 'Your workspace profile is not ready yet. Please contact support.' },
      { status: 409 },
    )
    cookiesToSet.forEach(({ name, value, options }) => {
      profileResponse.cookies.set(name, value, options)
    })
    return profileResponse
  }

  if (mode === 'admin') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'admin') {
      await recordAuditLog({
        actorId: data.user.id,
        action: 'auth.admin_login_denied',
        entityType: 'auth_session',
        entityId: data.user.id,
        metadata: { mode },
      })
      await supabase.auth.signOut()
      const deniedResponse = NextResponse.json({ error: 'This account does not have admin access.' }, { status: 403 })
      cookiesToSet.forEach(({ name, value, options }) => {
        deniedResponse.cookies.set(name, value, options)
      })
      return deniedResponse
    }
  }

  const destination =
    mode === 'admin'
      ? next ?? '/admin/dashboard'
      : await resolvePostLoginRedirect(supabase, data.user.id, next, data.user.user_metadata)

  const response = NextResponse.json({ success: true, destination })
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  await recordAuditLog({
    actorId: data.user.id,
    action: 'auth.login_success',
    entityType: 'auth_session',
    entityId: data.user.id,
    metadata: { mode, destination },
  })

  return response
}
