import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireSupabaseBrowserEnv, requireSupabaseServiceEnv } from '@/lib/supabase/env'
import { signupSchema } from '@/lib/validation/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { recordAuditLog } from '@/lib/audit'
import {
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  isAuthServiceUnavailableError,
} from '@/lib/auth/auth-service-status'
import { ensureAuthProfile } from '@/lib/auth/profile-bootstrap'
import { hasTransactionalEmailConfiguration, sendTransactionalEmail } from '@/lib/email/resend'
import { formatAuthError } from '@/lib/supabase/auth-redirect'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

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
  const email = parsed.data.email.toLowerCase()
  const emailRedirectTo = `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}`

  // Supabase's hosted SMTP can reject or delay confirmation messages. When the
  // production Resend integration is configured, create the same short-lived
  // Supabase signup link and deliver it through the configured transactional
  // provider instead. The verification token never reaches the browser/API.
  if (hasTransactionalEmailConfiguration()) {
    try {
      const { serviceRoleKey } = requireSupabaseServiceEnv()
      const admin = createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: parsed.data.password,
        options: {
          redirectTo: emailRedirectTo,
          data: {
            full_name: parsed.data.fullName,
            customer_type: parsed.data.customerType,
            onboarding_status: 'in_progress',
          },
        },
      })

      if (!error && data.properties.action_link) {
        const confirmationUrl = data.properties.action_link
        const safeUrl = escapeHtml(confirmationUrl)
        const delivery = await sendTransactionalEmail({
          to: email,
          subject: 'Confirm your PlotKare account',
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a"><h1 style="font-family:Georgia,serif;color:#8B1538">Confirm your account</h1><p>Confirm your email to begin setting up your PlotKare workspace.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#8B1538;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px">Confirm email</a></p><p style="color:#666;font-size:13px">If you did not request this account, you can ignore this email.</p></div>`,
          text: `Confirm your PlotKare account: ${confirmationUrl}`,
        })

        if (!delivery.skipped && !('error' in delivery)) {
          const createdNewAuthUser = Boolean(data.user && (data.user.identities?.length ?? 0) > 0)
          let workspacePreparationPending = false
          if (createdNewAuthUser && data.user) {
            try {
              await ensureAuthProfile({
                userId: data.user.id,
                email,
                fullName: parsed.data.fullName,
                customerType: parsed.data.customerType,
              })
            } catch {
              workspacePreparationPending = true
            }
          }

          await recordAuditLog({
            actorId: createdNewAuthUser ? data.user?.id ?? null : null,
            action: 'auth.signup_requested',
            entityType: 'auth_session',
            entityId: createdNewAuthUser ? data.user?.id ?? null : null,
            metadata: {
              email,
              customer_type: parsed.data.customerType,
              confirmation_delivery: 'resend',
              workspace_preparation_pending: workspacePreparationPending,
            },
          })

          return response(request, {
            sessionCreated: false,
            awaitingEmailConfirmation: true,
            workspacePreparationPending,
            destination: onboardingPath,
          })
        }
      }
    } catch {
      // Fall through to Supabase's normal sign-up flow when a server-only
      // credential is unavailable. This keeps development environments simple.
    }
  }

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

  const signUpResult = await supabase.auth
    .signUp({
      email,
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
    return response(request, { error: formatAuthError(error) }, error.status && error.status < 500 ? error.status : 503)
  }

  // Supabase intentionally returns an obfuscated user with no identities for an
  // already-registered email. Never bootstrap that user: a repeat signup must
  // not be able to change an existing account's role or onboarding state.
  const createdNewAuthUser = Boolean(
    data.user && (Boolean(data.session) || (data.user.identities?.length ?? 0) > 0),
  )
  let workspacePreparationPending = false

  if (createdNewAuthUser && data.user) {
    try {
      await ensureAuthProfile({
        userId: data.user.id,
        email: parsed.data.email.toLowerCase(),
        fullName: parsed.data.fullName,
        customerType: parsed.data.customerType,
      })
    } catch (profileError) {
      // Authentication already succeeded. Let confirmation/first sign-in retry
      // the idempotent profile bootstrap instead of reporting a false signup failure.
      workspacePreparationPending = true
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
    }
  }

  await recordAuditLog({
    actorId: createdNewAuthUser ? data.user?.id ?? null : null,
    action: 'auth.signup_requested',
    entityType: 'auth_session',
    entityId: createdNewAuthUser ? data.user?.id ?? null : null,
    metadata: {
      email: parsed.data.email,
      customer_type: parsed.data.customerType,
      awaiting_email_confirmation: Boolean(!data.session),
      workspace_preparation_pending: workspacePreparationPending,
    },
  })

  const result = response(request, {
    sessionCreated: Boolean(createdNewAuthUser && data.session),
    // Keep this generic when confirmation is enabled so signup cannot reveal
    // whether an email address already belongs to an account.
    awaitingEmailConfirmation: Boolean(!data.session),
    workspacePreparationPending,
    destination: onboardingPath,
  })
  cookiesToSet.forEach(({ name, value, options }) => result.cookies.set(name, value, options))
  return result
}
