import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { requireSupabaseBrowserEnv } from '@/lib/supabase/env'
import { signupSchema } from '@/lib/validation/auth'
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
  const { data, error } = await supabase.auth.signUp({
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

  if (error) {
    return response(request, { error: 'We could not create the account right now. Please try again later.' }, 503)
  }

  const result = response(request, {
    sessionCreated: Boolean(data.session && data.user),
    awaitingEmailConfirmation: Boolean(data.user && !data.session),
    destination: onboardingPath,
  })
  cookiesToSet.forEach(({ name, value, options }) => result.cookies.set(name, value, options))
  return result
}
