'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const assignmentSchema = z.object({
  reportId: z.string().uuid(),
  assignedEmployeeId: z.string().uuid(),
  scheduledFor: z.string().trim().optional().or(z.literal('')),
})

function inspectionRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/inspection-reports?${kind}=${code}`)
}

export async function assignInspectionReport(formData: FormData) {
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) inspectionRedirect('error', 'invalid_assignment')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id,profile_id,employee_role,active,profiles(full_name,email)')
    .eq('id', parsed.data.assignedEmployeeId)
    .eq('employee_role', 'field_inspection_agent')
    .maybeSingle()

  if (employeeError || !employee || employee.active === false) {
    console.error('Field agent lookup failed:', employeeError)
    inspectionRedirect('error', 'invalid_field_agent')
  }

  const { data: report, error: reportError } = await supabase
    .from('inspection_reports')
    .select('id,owner_id,plot_id,month,status,finding')
    .eq('id', parsed.data.reportId)
    .maybeSingle()

  if (reportError || !report) {
    console.error('Inspection report lookup failed:', reportError)
    inspectionRedirect('error', 'assignment_failed')
  }

  if (!report.plot_id) {
    inspectionRedirect('error', 'plot_required')
  }

  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .select('id,property_id,plot_number,location')
    .eq('id', report.plot_id)
    .maybeSingle()

  if (plotError || !plot?.property_id) {
    console.error('Plot property lookup failed:', plotError)
    inspectionRedirect('error', 'property_required')
  }

  const scheduledFor = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor).toISOString() : null

  const { data: existingInspection, error: existingError } = await supabase
    .from('inspections')
    .select('id,status,assigned_employee_id')
    .eq('plot_id', report.plot_id)
    .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    console.error('Inspection lookup failed:', existingError)
    inspectionRedirect('error', 'assignment_failed')
  }

  const assignmentPayload = {
    property_id: plot.property_id,
    plot_id: report.plot_id,
    assigned_employee_id: employee.id,
    requested_by: user.id,
    status: 'scheduled',
    scheduled_for: scheduledFor,
    summary: report.finding || `Inspection assigned for ${plot.plot_number || plot.location || report.month}.`,
  }

  let inspectionId = existingInspection?.id ?? null
  let previousAssignee = existingInspection?.assigned_employee_id ?? null

  if (existingInspection?.id) {
    const { error: updateError } = await supabase
      .from('inspections')
      .update(assignmentPayload)
      .eq('id', existingInspection.id)

    if (updateError) {
      console.error('Inspection assignment update failed:', updateError)
      inspectionRedirect('error', 'assignment_failed')
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from('inspections')
      .insert(assignmentPayload)
      .select('id')
      .single()

    if (createError || !created) {
      console.error('Inspection assignment create failed:', createError)
      inspectionRedirect('error', 'assignment_failed')
    }
    inspectionId = created.id
  }

  const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
  const agentName = profile?.full_name || profile?.email || 'Assigned field agent'

  const { error: reportUpdateError } = await supabase
    .from('inspection_reports')
    .update({
      agent_name: agentName,
      status: 'Scheduled',
    })
    .eq('id', report.id)

  if (reportUpdateError) {
    console.error('Inspection report assignment marker failed:', reportUpdateError)
    inspectionRedirect('error', 'assignment_failed')
  }

  await supabase.from('admin_task_assignments').upsert(
    {
      entity_type: 'inspection',
      entity_id: inspectionId,
      assigned_employee_id: employee.id,
      assigned_by: user.id,
      status: 'open',
      priority: 'normal',
      due_at: scheduledFor,
      metadata: {
        source: 'inspection_report_assignment',
        report_id: report.id,
        plot_id: report.plot_id,
      },
    },
    { onConflict: 'entity_type,entity_id,assigned_employee_id' },
  )

  await supabase.from('notifications').insert({
    recipient_id: employee.profile_id,
    actor_id: user.id,
    title: 'Inspection assigned',
    message: `${plot.plot_number || plot.location || 'A plot'} has been assigned for field inspection.`,
    category: 'inspection',
    metadata: {
      inspection_id: inspectionId,
      report_id: report.id,
      plot_id: report.plot_id,
    },
  })

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.inspection.assigned',
    entityType: 'inspections',
    entityId: inspectionId,
    metadata: {
      report_id: report.id,
      plot_id: report.plot_id,
      previous_assigned_employee_id: previousAssignee,
      assigned_employee_id: employee.id,
      scheduled_for: scheduledFor,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/inspection-reports')
  revalidatePath('/admin/dashboard/employees')
  revalidatePath('/employee')
  revalidatePath('/agent')
  revalidatePath('/agent/reports')
  inspectionRedirect('success', 'inspection_assigned')
}
