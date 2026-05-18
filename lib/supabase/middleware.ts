import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireSupabaseBrowserEnv } from './env'

function isPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, anonKey } = requireSupabaseBrowserEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const pathname = request.nextUrl.pathname

  // Routes that require authentication
  const protectedRoutes = ['/dashboard', '/admin', '/agent', '/onboarding']

  // Routes that are ALWAYS public (never redirect)
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/auth/choose-role',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/login',
    '/signup',
    '/forgot-password',
    '/update-password',
    '/admin/login',
    '/api/contact',
    '/api/support/contact',
    '/api/webhook',
    '/api/webhooks',
  ]

  // Admin-only routes
  const adminRoutes = ['/admin', '/godmode']

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  if (isPublicRoute) return response

  const isProtectedRoute = isPrefix(pathname, protectedRoutes)

  if (isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const isAdminRoute = isPrefix(pathname, adminRoutes)
    if (!isAdminRoute) return response

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}
