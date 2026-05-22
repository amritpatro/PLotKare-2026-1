import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './server'
import { dashboardPathForRole, isUserRole, type UserRole } from './types'

export async function requirePageRole(allowedRoles: UserRole[]) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,employee_role,onboarding_completed,onboarding_status,customer_type')
    .eq('id', user.id)
    .single()

  if (!profile || !isUserRole(profile.role)) redirect('/auth/choose-role')

  if (!allowedRoles.includes(profile.role)) {
    redirect(dashboardPathForRole(profile.role))
  }

  return { user, profile: { ...profile, role: profile.role as UserRole } }
}
