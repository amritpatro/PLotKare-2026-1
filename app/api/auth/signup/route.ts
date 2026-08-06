import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { requireSupabaseBrowserEnv } from '@/lib/supabase/env'
import { signupSchema } from '@/lib/validation/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { recordAuditLog } from '@/lib/audit'
import {
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  isAuthServiceUnavailableError,
} from '@/lib/auth/auth-service-status'
import { ensureAuthProfile } from '@/lib/auth/profile-bootstrap'

function response(request: NextRequest, body: Record<string, unknown>, status = 200) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  return NextResponse.json(status >= 400 ? { ...body, requestId } : body, {
    status,
    headers: { 'X-Request-ID': requestId },
  })
}

export async function POST(request: NextRequest) {
  if (await isRateLimited(request)) {
    return response(request, { error: 'Too many requests. Please wait and try again.' }, 429)
  }

  const body = await request.json().catch(() => null)
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return response(request, { error: parsed.error.issues[0]?.message ?? 'Please check the form fields.' }, 400)
  }

  const onboardingPath = `/onboarding/${parsed.data.customerType.replace('_', '-')}`
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

  const emailRedirectTo = `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}`
  const signUpResult = await supabase.auth
    .signUp({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: parsed.data.fullName,
          customer_type: parsed.data.customerType,
          onboarding_status: 'in_progress',
        },
      },
    })
    .catch(() => null)

  if (!signUpResult) {
    return response(request, { error: AUTH_SERVICE_UNAVAILABLE_MESSAGE }, 503)
  }

  const { data, error } = signUpResult
  if (isAuthServiceUnavailableError(error)) {
    return response(request, { error: AUTH_SERVICE_UNAVAILABLE_MESSAGE }, 503)
  }

  if (error) {
    await recordAuditLog({
      action: 'auth.signup_failed',
      entityType: 'auth_session',
      metadata: { email: parsed.data.email, customer_type: parsed.data.customerType, reason: error.name },
    })
    return response(request, { error: 'We could not create the account right now. Please try again later.' }, 503)
  }

  if (data.user) {
    try {
      await ensureAuthProfile({
        userId: data.user.id,
        email: parsed.data.email.toLowerCase(),
        fullName: parsed.data.fullName,
        customerType: parsed.data.customerType,
      })
    } catch (profileError) {
      await recordAuditLog({
        actorId: data.user.id,
        action: 'auth.signup_profile_bootstrap_failed',
        entityType: 'auth_session',
        entityId: data.user.id,
        metadata: {
          email: parsed.data.email,
          customer_type: parsed.data.customerType,
          reason: profileError instanceof Error ? profileError.name : 'unknown',
        },
      })
      return response(
        request,
        { error: 'Your account was created, but the workspace profile is not ready yet. Please contact support.' },
        500,
      )
    }
  }

  await recordAuditLog({
    actorId: data.user?.id ?? null,
    action: 'auth.signup_requested',
    entityType: 'auth_session',
    entityId: data.user?.id ?? null,
    metadata: {
      email: parsed.data.email,
      customer_type: parsed.data.customerType,
      awaiting_email_confirmation: Boolean(data.user && !data.session),
    },
  })

  const result = response(request, {
    sessionCreated: Boolean(data.session && data.user),
    awaitingEmailConfirmation: Boolean(data.user && !data.session),
    destination: onboardingPath,
  })
  cookiesToSet.forEach(({ name, value, options }) => result.cookies.set(name, value, options))
  return result
}
