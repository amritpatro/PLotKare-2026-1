'use server'

import { logger } from '@/lib/monitoring/logger'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { inspectionTypeFromProperty } from '@/lib/agent/inspection-templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { reverseGeocodeLabel } from '@/lib/maps/reverse-geocode'

const assignmentSchema = z.object({
  reportId: z.string().uuid(),
  assignedEmployeeId: z.string().uuid(),
  scheduledFor: z.string().trim().optional().or(z.literal('')),
  acknowledgeUnverifiedLocation: z.coerce.boolean().optional().default(false),
})

const coordinateNumber = (min: number, max: number) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.coerce.number().min(min).max(max))

const coordinateSchema = z.object({
  reportId: z.string().uuid(),
  latitude: coordinateNumber(-90, 90),
  longitude: coordinateNumber(-180, 180),
})

function inspectionRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/inspection-reports?${kind}=${code}`)
}

export async function updateInspectionReportCoordinates(formData: FormData) {
  const parsed = coordinateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) inspectionRedirect('error', 'invalid_coordinates')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()

  const { data: report, error: reportError } = await supabase
    .from('inspection_reports')
    .select('id,plot_id')
    .eq('id', parsed.data.reportId)
    .maybeSingle()

  if (reportError || !report?.plot_id) {
    logger.error('Inspection report coordinate lookup failed:', reportError)
    inspectionRedirect('error', 'coordinates_save_failed')
  }

  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .select('id,property_id')
    .eq('id', report.plot_id)
    .maybeSingle()

  if (plotError || !plot) {
    logger.error('Plot coordinate lookup failed:', plotError)
    inspectionRedirect('error', 'coordinates_save_failed')
  }

  const now = new Date().toISOString()
  const targetPlaceLabel = await reverseGeocodeLabel(parsed.data.latitude, parsed.data.longitude)
  const { error: plotUpdateError } = await supabase
    .from('plots')
    .update({
      target_latitude: parsed.data.latitude,
      target_longitude: parsed.data.longitude,
      coordinates_confirmed_at: now,
      coordinates_confirmed_by: user.id,
      target_place_label: targetPlaceLabel,
    })
    .eq('id', plot.id)

  if (plotUpdateError) {
    logger.error('Plot coordinate update failed:', plotUpdateError)
    inspectionRedirect('error', 'coordinates_save_failed')
  }

  if (plot.property_id) {
    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update({
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
      })
      .eq('id', plot.property_id)

    if (propertyUpdateError) {
      logger.error('Property coordinate update failed:', propertyUpdateError)
      inspectionRedirect('error', 'coordinates_save_failed')
    }
  }

  await supabase
    .from('inspections')
    .update({
      target_latitude: parsed.data.latitude,
      target_longitude: parsed.data.longitude,
      target_place_label: targetPlaceLabel,
    })
    .eq('plot_id', plot.id)
    .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.inspection.coordinates_updated',
    entityType: 'inspection_report',
    entityId: report.id,
    metadata: {
      plot_id: plot.id,
      property_id: plot.property_id,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  })

  revalidatePath('/admin/dashboard/inspection-reports')
  revalidatePath('/agent')
  inspectionRedirect('success', 'coordinates_saved')
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
    logger.error('Field agent lookup failed:', employeeError)
    inspectionRedirect('error', 'invalid_field_agent')
  }

  const { data: report, error: reportError } = await supabase
    .from('inspection_reports')
    .select('id,owner_id,plot_id,month,status,finding')
    .eq('id', parsed.data.reportId)
    .maybeSingle()

  if (reportError || !report) {
    logger.error('Inspection report lookup failed:', reportError)
    inspectionRedirect('error', 'assignment_failed')
  }

  if (!report.plot_id) {
    inspectionRedirect('error', 'plot_required')
  }

  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .select('id,property_id,plot_number,location,target_latitude,target_longitude,target_place_label,location_status,google_maps_link,address_landmark')
    .eq('id', report.plot_id)
    .maybeSingle()

  if (plotError || !plot?.property_id) {
    logger.error('Plot property lookup failed:', plotError)
    inspectionRedirect('error', 'property_required')
  }

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id,latitude,longitude,asset_type,property_kind')
    .eq('id', plot.property_id)
    .maybeSingle()

  if (propertyError || !property) {
    logger.error('Inspection property lookup failed:', propertyError)
    inspectionRedirect('error', 'property_required')
  }

  const plotTargetLatitude = Number(plot.target_latitude)
  const plotTargetLongitude = Number(plot.target_longitude)
  const hasVerifiedLocation =
    plot.location_status === 'verified' && Number.isFinite(plotTargetLatitude) && Number.isFinite(plotTargetLongitude)

  if (!hasVerifiedLocation && !parsed.data.acknowledgeUnverifiedLocation) {
    inspectionRedirect('error', 'verified_location_required')
  }

  const scheduledFor = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor).toISOString() : null
  const targetLatitude = hasVerifiedLocation ? plotTargetLatitude : null
  const targetLongitude = hasVerifiedLocation ? plotTargetLongitude : null
  const targetPlaceLabel =
    hasVerifiedLocation && targetLatitude != null && targetLongitude != null
      ? plot.target_place_label || (await reverseGeocodeLabel(targetLatitude, targetLongitude))
      : plot.address_landmark || plot.location || 'Location pending admin verification'
  const inspectionPropertyType = inspectionTypeFromProperty({
    assetType: property.asset_type,
    propertyKind: property.property_kind,
    hasPlot: Boolean(report.plot_id),
  })

  const { data: existingInspection, error: existingError } = await supabase
    .from('inspections')
    .select('id,status,assigned_employee_id')
    .eq('plot_id', report.plot_id)
    .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    logger.error('Inspection lookup failed:', existingError)
    inspectionRedirect('error', 'assignment_failed')
  }

  const assignmentPayload = {
    property_id: plot.property_id,
    plot_id: report.plot_id,
    assigned_employee_id: employee.id,
    requested_by: user.id,
    status: 'scheduled',
    scheduled_for: scheduledFor,
    target_latitude: targetLatitude,
    target_longitude: targetLongitude,
    target_place_label: targetPlaceLabel,
    inspection_property_type: inspectionPropertyType,
    proximity_radius_meters: 50,
    workflow_step: 'briefing',
    sync_status: 'server',
    summary: report.finding || `Inspection assigned for ${plot.plot_number || plot.location || report.month}.`,
  }

  let inspectionId = existingInspection?.id ?? null
  const previousAssignee = existingInspection?.assigned_employee_id ?? null

  if (existingInspection?.id) {
    const { error: updateError } = await supabase
      .from('inspections')
      .update(assignmentPayload)
      .eq('id', existingInspection.id)

    if (updateError) {
      logger.error('Inspection assignment update failed:', updateError)
      inspectionRedirect('error', 'assignment_failed')
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from('inspections')
      .insert(assignmentPayload)
      .select('id')
      .single()

    if (createError || !created) {
      logger.error('Inspection assignment create failed:', createError)
      inspectionRedirect('error', 'assignment_failed')
    }
    inspectionId = created.id
  }

  const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
  const agentName = profile?.full_name || profile?.email || 'Assigned field agent'

  const { error: reportUpdateError } = await supabase
    .from('inspection_reports')
    .update({
      inspection_id: inspectionId,
      agent_name: agentName,
      status: 'Scheduled',
      delivery_status: 'pending_review',
      email_delivery_status: 'not_ready',
    })
    .eq('id', report.id)

  if (reportUpdateError) {
    logger.error('Inspection report assignment marker failed:', reportUpdateError)
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
      verified_location: hasVerifiedLocation,
      unverified_location_acknowledged: !hasVerifiedLocation,
      inspection_property_type: inspectionPropertyType,
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
      verifiedLocation: hasVerifiedLocation,
      unverifiedLocationAcknowledged: !hasVerifiedLocation,
      inspectionPropertyType,
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
