import { NextRequest, NextResponse } from 'next/server'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function redirectTo(origin: string, path: string) {
  return NextResponse.redirect(`${origin}${path}`)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/auth/choose-role'

  if (!code) {
    return redirectTo(origin, '/login?error=no_code')
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Auth callback error:', error)
    return redirectTo(origin, '/login?error=auth_failed')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirectTo(origin, '/login')
  }

  const destination = await resolvePostLoginRedirect(
    supabase,
    user.id,
    next.startsWith('/') && !next.startsWith('/dashboard') ? next : '/auth/choose-role',
  )

  return redirectTo(origin, destination)
}
