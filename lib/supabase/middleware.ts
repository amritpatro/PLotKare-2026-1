import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireSupabaseBrowserEnv } from './env'
import { dashboardPathForRole, effectiveRoleForProfile, isUserRole, type UserRole } from './types'

function isPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function hasCompletedOnboarding(profile: {
  onboarding_completed?: boolean | null
  onboarding_status?: string | null
}) {
  return profile.onboarding_completed === true || profile.onboarding_status === 'completed'
}

function onboardingPathForRole(role: UserRole, customerType?: string | null) {
  const type =
    customerType ||
    (role === 'plot_seller'
      ? 'plot_seller'
      : role === 'land_owner'
      ? 'land_owner'
      : role === 'customer'
      ? 'plot_buyer'
      : null)

  if (type === 'plot_seller') return '/onboarding/plot-seller'
  if (type === 'land_owner') return '/onboarding/land-owner'
  if (type === 'plot_buyer') return '/onboarding/plot-buyer'
  return null
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
  const protectedRoutes = ['/dashboard', '/seller', '/owner', '/customer', '/employee', '/admin', '/agent', '/onboarding']

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

  // Role-specific routes
  const adminRoutes = ['/admin', '/godmode']
  const employeeRoutes = ['/employee', '/agent']
  const sellerRoutes = ['/seller']
  const ownerRoutes = ['/owner']
  const customerRoutes = ['/customer']

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, employee_role, customer_type, onboarding_completed, onboarding_status')
      .eq('id', user.id)
      .single()

    if (!profile || !isUserRole(profile.role)) {
      return NextResponse.redirect(new URL('/auth/choose-role', request.url))
    }

    const role = effectiveRoleForProfile(profile)
    if (!role || !isUserRole(role)) {
      return NextResponse.redirect(new URL('/auth/choose-role', request.url))
    }

    let employeeRole = profile.employee_role
    if (role === 'employee') {
      const { data: employee } = await supabase
        .from('employees')
        .select('employee_role,active')
        .eq('profile_id', user.id)
        .maybeSingle()
      if (employee?.active !== false && employee?.employee_role) {
        employeeRole = employee.employee_role
      }
    }
    const isAdminRoute = isPrefix(pathname, adminRoutes)
    const isEmployeeRoute = isPrefix(pathname, employeeRoutes)
    const isAgentRoute = isPrefix(pathname, ['/agent'])
    const isSellerRoute = isPrefix(pathname, sellerRoutes)
    const isOwnerRoute = isPrefix(pathname, ownerRoutes)
    const isCustomerRoute = isPrefix(pathname, customerRoutes)
    const isOnboardingRoute = isPrefix(pathname, ['/onboarding'])
    const isLegacyDashboardRoute = isPrefix(pathname, ['/dashboard'])
    const onboardingComplete = hasCompletedOnboarding(profile)
    const onboardingPath = onboardingPathForRole(role, profile.customer_type)

    if (isOnboardingRoute) {
      if (onboardingComplete) {
        return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
      }

      if (!onboardingPath) {
        return NextResponse.redirect(new URL('/auth/choose-role', request.url))
      }

      if (pathname !== onboardingPath && !pathname.startsWith(`${onboardingPath}/`)) {
        return NextResponse.redirect(new URL(onboardingPath, request.url))
      }

      return response
    }

    if (isLegacyDashboardRoute) {
      return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
    }

    if (!onboardingComplete && (role === 'plot_seller' || role === 'land_owner' || role === 'customer')) {
      return NextResponse.redirect(new URL(onboardingPath ?? '/auth/choose-role', request.url))
    }

    if (role === 'employee' && employeeRole === 'field_inspection_agent' && isEmployeeRoute && !isAgentRoute) {
      return NextResponse.redirect(new URL('/agent', request.url))
    }

    if (isAgentRoute && !(role === 'employee' && employeeRole === 'field_inspection_agent')) {
      return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
    }

    const allowed =
      (isAdminRoute && role === 'admin') ||
      (isEmployeeRoute && role === 'employee') ||
      (isSellerRoute && (role === 'plot_seller' || role === 'admin')) ||
      (isOwnerRoute && (role === 'land_owner' || role === 'admin')) ||
      (isCustomerRoute && (role === 'customer' || role === 'admin')) ||
      (!isAdminRoute && !isEmployeeRoute && !isSellerRoute && !isOwnerRoute && !isCustomerRoute)

    if (!allowed) {
      return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
    }
  }

  return response
}
