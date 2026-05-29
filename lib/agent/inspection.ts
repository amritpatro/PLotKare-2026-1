import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireUserContext } from '@/lib/api/auth'

export type AgentContext = {
  user: { id: string; email?: string | null }
  profile: { id: string; full_name?: string | null; email?: string | null }
  employee: {
    id: string
    profile_id: string
    employee_role: string
    active: boolean
    worker_type?: string | null
    vendor_id?: string | null
    assigned_corridor?: string | null
  }
  admin: ReturnType<typeof createSupabaseAdminClient>
}

export async function requireFieldAgentApiContext(): Promise<AgentContext | { response: Response }> {
  const auth = await requireUserContext()
  if ('response' in auth) return auth
  if (auth.profile.role !== 'employee') {
    return { response: NextResponse.json({ error: 'Field agent access is required.' }, { status: 403 }) }
  }

  const admin = createSupabaseAdminClient()
  const { data: employee } = await admin
    .from('employees')
    .select('id,profile_id,employee_role,active,worker_type,vendor_id,assigned_corridor')
    .eq('profile_id', auth.user.id)
    .eq('employee_role', 'field_inspection_agent')
    .eq('active', true)
    .maybeSingle()

  if (!employee) {
    return { response: NextResponse.json({ error: 'An active field-agent assignment is required.' }, { status: 403 }) }
  }

  return {
    user: auth.user,
    profile: auth.profile,
    employee,
    admin,
  }
}

export async function readAssignedInspection(context: AgentContext, inspectionId: string) {
  const { data, error } = await context.admin
    .from('inspections')
    .select(
      'id,inspection_reference,property_id,plot_id,assigned_employee_id,status,workflow_step,plan_snapshot,requirements_snapshot,target_latitude,target_longitude,proximity_radius_meters,arrival_latitude,arrival_longitude,arrival_accuracy_meters,arrival_distance_meters,arrival_captured_at,arrival_verified,started_at,submitted_at,scheduled_for,summary,properties(id,title,address,city,state,latitude,longitude,owner_profile_id),plots(id,plot_number,location)',
    )
    .eq('id', inspectionId)
    .eq('assigned_employee_id', context.employee.id)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371000
  const deltaLat = radians(lat2 - lat1)
  const deltaLng = radians(lng2 - lng1)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function requiredAudit(
  context: AgentContext,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  const { error } = await context.admin.from('audit_logs').insert({
    actor_id: context.user.id,
    action,
    entity_type: 'inspection',
    entity_id: entityId,
    metadata,
  })

  if (error) throw new Error(`Audit persistence failed: ${error.message}`)
}

export async function notifyAdmins(
  context: AgentContext,
  title: string,
  message: string,
  metadata: Record<string, unknown>,
) {
  const { data: admins, error } = await context.admin.from('profiles').select('id').eq('role', 'admin')
  if (error) throw new Error(error.message)
  if (!admins?.length) return

  const { error: insertError } = await context.admin.from('notifications').insert(
    admins.map((admin) => ({
      recipient_id: admin.id,
      actor_id: context.user.id,
      title,
      message,
      category: 'inspection',
      metadata,
    })),
  )
  if (insertError) throw new Error(insertError.message)
}
