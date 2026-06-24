import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { requireSupabaseBrowserEnv } from '@/lib/supabase/env'
import { loginSchema } from '@/lib/validation/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { recordAuditLog } from '@/lib/audit'

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
  const next = typeof body?.next === 'string' && body.next.startsWith('/') ? body.next : undefined
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

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) {
    await recordAuditLog({
      action: 'auth.login_failed',
      entityType: 'auth_session',
      metadata: { email: parsed.data.email, mode, reason: error?.name ?? 'invalid_credentials' },
    })
    return NextResponse.json(
      { error: 'Unable to sign in. Please check your credentials and try again.' },
      { status: 401 },
    )
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
      return NextResponse.json({ error: 'This account does not have admin access.' }, { status: 403 })
    }
  }

  const destination =
    mode === 'admin'
      ? next ?? '/admin/dashboard'
      : await resolvePostLoginRedirect(supabase, data.user.id, next ?? '/auth/choose-role', data.user.user_metadata)

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
