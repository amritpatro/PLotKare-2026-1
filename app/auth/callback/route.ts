import { NextRequest, NextResponse } from 'next/server'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function redirectTo(origin: string, path: string) {
  return NextResponse.redirect(`${origin}${path}`)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return redirectTo(origin, '/auth/login?error=no_code')
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Auth callback error:', error)
    return redirectTo(origin, '/auth/login?error=auth_failed')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirectTo(origin, '/auth/login')
  }

  const destination = await resolvePostLoginRedirect(
    supabase,
    user.id,
    next.startsWith('/') ? next : '/dashboard',
  )

  return redirectTo(origin, destination)
}
