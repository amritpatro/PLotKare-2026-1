import { logger } from '@/lib/monitoring/logger'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireSupabaseBrowserEnv, requireSupabaseServiceEnv } from '@/lib/supabase/env'
import { resetPasswordSchema } from '@/lib/validation/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { recordAuditLog } from '@/lib/audit'
import { hasTransactionalEmailConfiguration, sendTransactionalEmail } from '@/lib/email/resend'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

async function sendRecoveryWithTransactionalEmail(email: string, origin: string) {
  if (!hasTransactionalEmailConfiguration()) {
    return { delivered: false as const, reason: 'not_configured' as const }
  }

  const { url, serviceRoleKey } = requireSupabaseServiceEnv()
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error || !data.properties?.hashed_token) {
    return { delivered: false as const, reason: 'link_unavailable' as const }
  }

  const recoveryUrl = new URL('/auth/callback', origin)
  recoveryUrl.searchParams.set('flow', 'recovery')
  recoveryUrl.searchParams.set('type', 'recovery')
  recoveryUrl.searchParams.set('token_hash', data.properties.hashed_token)
  recoveryUrl.searchParams.set('next', '/update-password')
  const safeUrl = escapeHtml(recoveryUrl.toString())

  const delivery = await sendTransactionalEmail({
    to: email,
    subject: 'Reset your PlotKare password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h1 style="font-family:Georgia,serif;color:#8B1538">Reset your PlotKare password</h1>
        <p>Use the secure link below to choose a new password. This link is intended only for the account owner.</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#8B1538;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px">
            Choose a new password
          </a>
        </p>
        <p style="color:#666;font-size:13px">If you did not request this change, you can ignore this email.</p>
      </div>
    `,
    text: `Reset your PlotKare password: ${recoveryUrl.toString()}\n\nIf you did not request this change, ignore this email.`,
  })

  return {
    delivered: delivery.skipped === false && !('error' in delivery),
    reason: delivery.skipped === false && !('error' in delivery) ? null : 'delivery_failed',
  }
}

function response(
  request: NextRequest,
  body: Record<string, unknown>,
  status = 200,
  cookiesToSet: CookieToSet[] = [],
) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const result = NextResponse.json(status >= 400 ? { ...body, requestId } : body, {
    status,
    headers: { 'X-Request-ID': requestId },
  })
  cookiesToSet.forEach(({ name, value, options }) => result.cookies.set(name, value, options))
  return result
}

export async function POST(request: NextRequest) {
  if (await isRateLimited(request)) {
    return response(request, { error: 'Too many requests. Please wait and try again.' }, 429)
  }

  const body = await request.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse({ email: body?.email })
  if (!parsed.success) return response(request, { error: 'Enter a valid email address' }, 400)

  const { url, anonKey } = requireSupabaseBrowserEnv()
  const cookiesToSet: CookieToSet[] = []
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
  const redirectTo = `${request.nextUrl.origin}/auth/callback?flow=recovery&next=${encodeURIComponent('/update-password')}`
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo })
  let deliveryFallbackReason: string | null = null

  if (error) {
    const fallback = await sendRecoveryWithTransactionalEmail(parsed.data.email, request.nextUrl.origin).catch((fallbackError) => {
      logger.error('Password recovery fallback crashed', {
        requestId: request.headers.get('x-request-id'),
        error: fallbackError instanceof Error ? fallbackError.message : 'unknown',
      })
      return { delivered: false as const, reason: 'fallback_crashed' as const }
    })
    deliveryFallbackReason = fallback.reason
    if (!fallback.delivered) {
      logger.error('Password recovery email delivery failed', {
        requestId: request.headers.get('x-request-id'),
        reason: fallback.reason,
      })
    }
  }

  await recordAuditLog({
    action: 'auth.password_reset_requested',
    entityType: 'auth_session',
    metadata: {
      email: parsed.data.email,
      supabase_delivery_failed: Boolean(error),
      fallback_reason: deliveryFallbackReason,
    },
  })

  return response(
    request,
    { message: 'If an account exists for that email, a reset link has been sent.' },
    200,
    cookiesToSet,
  )
}
