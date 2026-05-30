import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type FieldAgentContext = {
  userId: string
  email: string | null
  fullName: string | null
  employeeId: string
}

export async function requireFieldAgentPage(): Promise<FieldAgentContext> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,employee_role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'employee') {
    redirect('/employee')
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('id,active,employee_role')
    .eq('profile_id', user.id)
    .eq('employee_role', 'field_inspection_agent')
    .maybeSingle()

  if (!employee?.id || employee.active === false || employee.employee_role !== 'field_inspection_agent') redirect('/employee')

  return {
    userId: user.id,
    email: profile.email ?? user.email ?? null,
    fullName: profile.full_name ?? null,
    employeeId: employee.id,
  }
}

export async function getAssignedInspectionForAgent(inspectionId: string, employeeId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('inspections')
    .select(
      'id,property_id,plot_id,customer_id,assigned_employee_id,status,scheduled_for,completed_at,summary,photos,created_at,properties(id,title,address,city,state,latitude,longitude,owner_profile_id),plots(id,plot_number,location,sq_yards,facing)',
    )
    .eq('id', inspectionId)
    .eq('assigned_employee_id', employeeId)
    .maybeSingle()

  if (error) throw error
  return data
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6371000
  const toRad = (value: number) => (value * Math.PI) / 180
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const deltaLat = toRad(b.latitude - a.latitude)
  const deltaLng = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function inspectionJsonArray(value: unknown) {
  return Array.isArray(value) ? value : []
}
