'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ADMIN_TASK_PRIORITIES, ADMIN_TASK_STATUSES } from '@/lib/admin/status'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const taskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(ADMIN_TASK_STATUSES),
  priority: z.enum(ADMIN_TASK_PRIORITIES),
  dueAt: z.string().trim().optional().or(z.literal('')),
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
