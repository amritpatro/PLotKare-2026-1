'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ADMIN_TASK_PRIORITIES, ADMIN_TASK_STATUSES } from '@/lib/admin/status'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/supabase/env'
import { requirePageRole } from '@/lib/supabase/role-guard'

const taskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(ADMIN_TASK_STATUSES),
  priority: z.enum(ADMIN_TASK_PRIORITIES),
  dueAt: z.string().trim().optional().or(z.literal('')),
})

const fieldAgentInvitationSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  workerType: z.enum(['internal', 'vendor']),
  vendorId: z.string().uuid().optional().or(z.literal('')),
  assignedCorridor: z.string().trim().min(2).max(120),
})

function employeesRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/employees?${kind}=${code}`)
}

export async function updateEmployeeTask(formData: FormData) {
  const parsed = taskUpdateSchema.safeParse({
    taskId: formData.get('taskId'),
    status: formData.get('status'),
    priority: formData.get('priority'),
    dueAt: formData.get('dueAt') ?? '',
  })

  if (!parsed.success) employeesRedirect('error', 'invalid_task_update')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()
  const { taskId, status, priority } = parsed.data
  const dueAt = parsed.data.dueAt || null

  const { data: existing, error: existingError } = await supabase
    .from('admin_task_assignments')
    .select('id,status,priority,due_at,assigned_employee_id,entity_type,entity_id')
    .eq('id', taskId)
    .maybeSingle()

  if (existingError || !existing) {
    console.error('Admin task lookup failed:', existingError)
    employeesRedirect('error', 'task_update_failed')
  }

  const { error } = await supabase
    .from('admin_task_assignments')
    .update({ status, priority, due_at: dueAt })
    .eq('id', taskId)

  if (error) {
    console.error('Admin task update failed:', error)
    employeesRedirect('error', 'task_update_failed')
  }

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.employee_task.updated',
    entityType: 'admin_task_assignment',
    entityId: taskId,
    metadata: {
      previous_status: existing.status,
      previous_priority: existing.priority,
      previous_due_at: existing.due_at,
      status,
      priority,
      due_at: dueAt,
      assigned_employee_id: existing.assigned_employee_id,
      source_entity_type: existing.entity_type,
      source_entity_id: existing.entity_id,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/employees')
  revalidatePath('/admin/dashboard/audit')
  employeesRedirect('success', 'task_updated')
}

export async function inviteFieldAgent(formData: FormData) {
  const parsed = fieldAgentInvitationSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    workerType: formData.get('workerType'),
    vendorId: formData.get('vendorId') ?? '',
    assignedCorridor: formData.get('assignedCorridor'),
  })

  if (!parsed.success) employeesRedirect('error', 'invalid_field_agent_invitation')

  const { user } = await requirePageRole(['admin'])
  const admin = createSupabaseAdminClient()
  const { fullName, email, workerType, assignedCorridor } = parsed.data
  const vendorId = parsed.data.vendorId || null

  if (workerType === 'vendor') {
    if (!vendorId) employeesRedirect('error', 'approved_vendor_required')
    const { data: vendor } = await admin
      .from('vendors')
      .select('id')
      .eq('id', vendorId)
      .eq('active', true)
      .eq('verification_status', 'approved')
      .maybeSingle()
    if (!vendor) employeesRedirect('error', 'approved_vendor_required')
  }

  const redirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent('/update-password')}`
  const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  })

  if (inviteError || !data.user) {
    console.error('Field agent invitation failed:', inviteError)
    employeesRedirect('error', 'field_agent_invitation_failed')
  }

  const profileId = data.user.id
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      role: 'employee',
      employee_role: 'field_inspection_agent',
      onboarding_completed: true,
      role_assigned_at: new Date().toISOString(),
      role_assigned_by: user.id,
    })
    .eq('id', profileId)

  if (profileError) {
    console.error('Field agent profile activation failed:', profileError)
    employeesRedirect('error', 'field_agent_invitation_failed')
  }

  const { error: employeeError } = await admin.from('employees').upsert(
    {
      profile_id: profileId,
      employee_role: 'field_inspection_agent',
      worker_type: workerType,
      vendor_id: workerType === 'vendor' ? vendorId : null,
      assigned_corridor: assignedCorridor,
      active: true,
    },
    { onConflict: 'profile_id' },
  )

  if (employeeError) {
    console.error('Field agent employee record failed:', employeeError)
    employeesRedirect('error', 'field_agent_invitation_failed')
  }

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.field_agent.invited',
    entityType: 'employee',
    entityId: profileId,
    metadata: { email, worker_type: workerType, vendor_id: vendorId, assigned_corridor: assignedCorridor },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/employees')
  revalidatePath('/admin/dashboard/audit')
  employeesRedirect('success', 'field_agent_invited')
}
