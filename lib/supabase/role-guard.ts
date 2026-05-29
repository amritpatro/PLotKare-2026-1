import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './server'
import { dashboardPathForProfile, effectiveRoleForProfile, isUserRole, type UserRole } from './types'

export async function requirePageRole(allowedRoles: UserRole[]) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,full_name,avatar_path,role,employee_role,onboarding_completed,onboarding_status,customer_type')
    .eq('id', user.id)
    .single()

  if (!profile || !isUserRole(profile.role)) redirect('/auth/choose-role')

  const role = effectiveRoleForProfile(profile)
  if (!role || !isUserRole(role)) redirect('/auth/choose-role')

  if (!allowedRoles.includes(role)) {
    redirect(dashboardPathForProfile({ role, employee_role: profile.employee_role }))
  }

  return { user, profile: { ...profile, role } }
}

export async function requireFieldAgentPage() {
  const context = await requirePageRole(['employee'])
  const supabase = await createSupabaseServerClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('id,profile_id,employee_role,active,worker_type,vendor_id,assigned_corridor')
    .eq('profile_id', context.user.id)
    .eq('employee_role', 'field_inspection_agent')
    .eq('active', true)
    .maybeSingle()

  if (!employee) redirect('/employee')

  return { ...context, employee }
}
