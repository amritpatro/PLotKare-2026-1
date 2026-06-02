import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireSupabaseBrowserEnv } from '@/lib/supabase/env'
import { resetPasswordSchema } from '@/lib/validation/auth'

function response(request: NextRequest, body: Record<string, unknown>, status = 200) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  return NextResponse.json(status >= 400 ? { ...body, requestId } : body, {
    status,
    headers: { 'X-Request-ID': requestId },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse({ email: body?.email })
  if (!parsed.success) return response(request, { error: 'Enter a valid email address' }, 400)

  const { url, anonKey } = requireSupabaseBrowserEnv()
  const supabase = createClient(url, anonKey)
  const redirectTo = `${request.nextUrl.origin}/update-password/`
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo })

  if (error) {
    console.error('Password reset request failed', { requestId: request.headers.get('x-request-id') })
    return response(request, { error: 'Unable to send a reset link. Please try again or contact support.' }, 400)
  }

  return response(request, { message: 'If an account exists for that email, a reset link has been sent.' })
}
