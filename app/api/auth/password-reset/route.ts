import { logger } from '@/lib/monitoring/logger'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireSupabaseBrowserEnv } from '@/lib/supabase/env'
import { resetPasswordSchema } from '@/lib/validation/auth'
import { isRateLimited } from '@/lib/api/rate-limit'

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
  const parsed = resetPasswordSchema.safeParse({ email: body?.email })
  if (!parsed.success) return response(request, { error: 'Enter a valid email address' }, 400)

  const { url, anonKey } = requireSupabaseBrowserEnv()
  const supabase = createClient(url, anonKey, {
    auth: { flowType: 'implicit', autoRefreshToken: false, persistSession: false },
  })
  const redirectTo = `${request.nextUrl.origin}/update-password/`
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo })

  if (error) {
    logger.error('Password reset request failed', { requestId: request.headers.get('x-request-id') })
    return response(request, { error: 'We could not send the reset email right now. Please try again later.' }, 503)
  }

  return response(request, { message: 'If an account exists for that email, a reset link has been sent.' })
}
