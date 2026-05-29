'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { generateInspectionReportPdf } from '@/lib/agent/report-pdf'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const scheduleSchema = z.object({
  propertyId: z.string().uuid(),
  plotId: z.string().uuid().optional().or(z.literal('')),
  employeeId: z.string().uuid(),
  scheduledFor: z.string().min(1),
  planSnapshot: z.enum(['basic', 'complete_care', 'premium']),
})
const coordinateSchema = z.object({
  propertyId: z.string().uuid(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})
const reviewSchema = z.object({
  inspectionId: z.string().uuid(),
  action: z.enum(['approve_release', 'correction_required', 'reject']),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
})

function returnToReports(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/inspection-reports?${kind}=${code}`)
}

async function audit(admin: ReturnType<typeof createSupabaseAdminClient>, actorId: string, action: string, id: string, metadata: Record<string, unknown>) {
  const { error } = await admin.from('audit_logs').insert({ actor_id: actorId, action, entity_type: 'inspection', entity_id: id, metadata })
  if (error) throw error
}

export async function confirmPropertyCoordinates(formData: FormData) {
  const parsed = coordinateSchema.safeParse({
    propertyId: formData.get('propertyId'),
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
  })
  if (!parsed.success) returnToReports('error', 'invalid_coordinates')
  const { user } = await requirePageRole(['admin'])
  const admin = createSupabaseAdminClient()
  const { data: property } = await admin.from('properties').select('id,verification_status').eq('id', parsed.data.propertyId).maybeSingle()
  if (!property || property.verification_status !== 'approved') returnToReports('error', 'verified_property_required')
  const { error } = await admin
    .from('properties')
    .update({
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      coordinates_confirmed_at: new Date().toISOString(),
      coordinates_confirmed_by: user.id,
      coordinates_source: 'admin_verified',
    })
    .eq('id', property.id)
  if (error) returnToReports('error', 'coordinate_confirmation_failed')
  await audit(admin, user.id, 'admin.property.coordinates_confirmed', property.id, {
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    coordinates_source: 'admin_verified',
  })
  revalidatePath('/admin/dashboard/inspection-reports')
  returnToReports('success', 'coordinates_confirmed')
}

export async function scheduleFieldInspection(formData: FormData) {
  const parsed = scheduleSchema.safeParse({
    propertyId: formData.get('propertyId'),
    plotId: formData.get('plotId') ?? '',
    employeeId: formData.get('employeeId'),
    scheduledFor: formData.get('scheduledFor'),
    planSnapshot: formData.get('planSnapshot'),
  })
  if (!parsed.success) returnToReports('error', 'invalid_assignment')
  const { user } = await requirePageRole(['admin'])
  const admin = createSupabaseAdminClient()
  const scheduledDate = new Date(parsed.data.scheduledFor)
  const dayStart = new Date(scheduledDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(scheduledDate)
  dayEnd.setHours(23, 59, 59, 999)
  const [{ data: property }, { data: employee }] = await Promise.all([
    admin.from('properties').select('id,latitude,longitude,owner_profile_id,verification_status,coordinates_confirmed_at').eq('id', parsed.data.propertyId).maybeSingle(),
    admin.from('employees').select('id,employee_role,active').eq('id', parsed.data.employeeId).maybeSingle(),
  ])
  if (!property || property.verification_status !== 'approved' || property.latitude == null || property.longitude == null || !property.coordinates_confirmed_at) returnToReports('error', 'coordinates_required')
  if (!employee?.active || employee.employee_role !== 'field_inspection_agent') returnToReports('error', 'field_agent_required')
  const { data: existingAssignment } = await admin
    .from('inspections')
    .select('id')
    .eq('property_id', property.id)
    .gte('scheduled_for', dayStart.toISOString())
    .lte('scheduled_for', dayEnd.toISOString())
    .in('status', ['scheduled', 'in_progress', 'submitted', 'under_review', 'correction_required', 'approved'])
    .limit(1)
    .maybeSingle()
  if (existingAssignment) returnToReports('error', 'duplicate_assignment')
  let selectedPlotId = parsed.data.plotId || null
  if (!selectedPlotId) {
    const { data: firstPlot } = await admin
      .from('plots')
      .select('id')
      .eq('property_id', property.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    selectedPlotId = firstPlot?.id ?? null
  }

  const { data: inspection, error } = await admin.from('inspections').insert({
    property_id: property.id,
    plot_id: selectedPlotId,
    assigned_employee_id: employee.id,
    requested_by: user.id,
    status: 'scheduled',
    scheduled_for: scheduledDate.toISOString(),
    plan_snapshot: parsed.data.planSnapshot,
    target_latitude: property.latitude,
    target_longitude: property.longitude,
    proximity_radius_meters: 50,
    requirements_snapshot: {
      corner_photos: ['north', 'south', 'east', 'west'],
      document_checks: parsed.data.planSnapshot !== 'basic',
      amenity_checks: parsed.data.planSnapshot !== 'basic',
    },
  }).select('id,inspection_reference').single()
  if (error || !inspection) returnToReports('error', 'assignment_failed')
  await audit(admin, user.id, 'admin.inspection.field_assigned', inspection.id, { assigned_employee_id: employee.id, property_id: property.id })
  await admin.from('notifications').insert({
    recipient_id: (await admin.from('employees').select('profile_id').eq('id', employee.id).single()).data?.profile_id,
    actor_id: user.id,
    title: 'New field inspection assigned',
    message: `${inspection.inspection_reference} is scheduled for field execution.`,
    category: 'inspection',
    metadata: { inspection_id: inspection.id },
  })
  revalidatePath('/agent')
  revalidatePath('/admin/dashboard/inspection-reports')
  returnToReports('success', 'inspection_assigned')
}

export async function reviewFieldInspection(formData: FormData) {
  const parsed = reviewSchema.safeParse({ inspectionId: formData.get('inspectionId'), action: formData.get('action'), note: formData.get('note') ?? '' })
  if (!parsed.success) returnToReports('error', 'invalid_review')
  const { user } = await requirePageRole(['admin'])
  const admin = createSupabaseAdminClient()
  const { data: inspection } = await admin
    .from('inspections')
    .select('id,inspection_reference,property_id,plot_id,assigned_employee_id,status,plan_snapshot,arrival_latitude,arrival_longitude,arrival_accuracy_meters,arrival_distance_meters,arrival_captured_at,submitted_at,properties(title,address,city,owner_profile_id),plots(plot_number,location)')
    .eq('id', parsed.data.inspectionId)
    .maybeSingle()
  if (!inspection || !['submitted', 'under_review', 'correction_required'].includes(inspection.status)) returnToReports('error', 'review_unavailable')
  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  if (!property?.owner_profile_id) returnToReports('error', 'owner_required')
  const { data: report } = await admin.from('inspection_reports').select('id').eq('inspection_id', inspection.id).maybeSingle()
  if (!report) returnToReports('error', 'report_missing')

  if (parsed.data.action !== 'approve_release') {
    const status = parsed.data.action === 'reject' ? 'rejected' : 'correction_required'
    await Promise.all([
      admin.from('inspections').update({ status, review_notes: parsed.data.note || null, reviewed_at: new Date().toISOString() }).eq('id', inspection.id),
      admin.from('inspection_reports').update({ delivery_status: status, review_notes: parsed.data.note || null, reviewed_by: user.id }).eq('id', report.id),
    ])
    await audit(admin, user.id, `admin.inspection.${status}`, inspection.id, { note: parsed.data.note || null })
    if (inspection.assigned_employee_id) {
      const { data: agent } = await admin.from('employees').select('profile_id').eq('id', inspection.assigned_employee_id).maybeSingle()
      if (agent?.profile_id) await admin.from('notifications').insert({ recipient_id: agent.profile_id, actor_id: user.id, title: 'Inspection needs attention', message: parsed.data.note || `Inspection ${status.replaceAll('_', ' ')}.`, category: 'inspection', metadata: { inspection_id: inspection.id } })
    }
    revalidatePath('/agent/reports')
    revalidatePath('/admin/dashboard/inspection-reports')
    returnToReports('success', status)
  }

  const [{ data: photos }, { data: checklist }, { data: flags }, { data: documents }, { data: amenities }, { data: owner }, { data: employee }] = await Promise.all([
    admin.from('inspection_photos').select('id,direction,subject,bucket,object_path,mime_type,latitude,longitude,accuracy_meters,captured_at').eq('inspection_id', inspection.id).eq('upload_status', 'finalized').order('created_at'),
    admin.from('inspection_checklist_answers').select('question_code,answer,note').eq('inspection_id', inspection.id).order('created_at'),
    admin.from('inspection_flags').select('flag_type,description').eq('inspection_id', inspection.id),
    admin.from('inspection_document_checks').select('label,result,note').eq('inspection_id', inspection.id),
    admin.from('inspection_amenity_checks').select('condition,note,active_amenities(amenities(name))').eq('inspection_id', inspection.id),
    admin.from('profiles').select('full_name,email').eq('id', property.owner_profile_id).maybeSingle(),
    inspection.assigned_employee_id ? admin.from('employees').select('profile_id,profiles(full_name,email)').eq('id', inspection.assigned_employee_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const imagePhotos = await Promise.all((photos ?? []).map(async (photo: any) => {
    const result = await admin.storage.from(photo.bucket).download(photo.object_path)
    return {
      label: `${String(photo.direction || photo.subject).toUpperCase()} evidence`,
      coordinates: `GPS: ${photo.latitude}, ${photo.longitude}; accuracy ${Math.round(Number(photo.accuracy_meters || 0))} m`,
      capturedAt: photo.captured_at ? new Date(photo.captured_at).toLocaleString('en-IN') : 'Timestamp unavailable',
      bytes: result.data ? new Uint8Array(await result.data.arrayBuffer()) : null,
      mimeType: photo.mime_type,
    }
  }))
  const plot = Array.isArray(inspection.plots) ? inspection.plots[0] : inspection.plots
  const agentProfile = employee && (Array.isArray((employee as any).profiles) ? (employee as any).profiles[0] : (employee as any).profiles)
  const reportDate = new Date(inspection.submitted_at || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'long' })
  const bytes = await generateInspectionReportPdf({
    reference: inspection.inspection_reference,
    reportDate,
    plotLabel: plot?.plot_number || property.title || 'Plot',
    address: plot?.location || [property.address, property.city].filter(Boolean).join(', '),
    ownerName: owner?.full_name || owner?.email || 'Property owner',
    plan: String(inspection.plan_snapshot).replaceAll('_', ' '),
    agentName: agentProfile?.full_name || agentProfile?.email || 'PlotKare field agent',
    arrival: `${inspection.arrival_latitude}, ${inspection.arrival_longitude}; accuracy ${Math.round(Number(inspection.arrival_accuracy_meters || 0))} m; distance ${Math.round(Number(inspection.arrival_distance_meters || 0))} m`,
    photos: imagePhotos,
    checklist: (checklist ?? []).map((row: any) => ({ label: String(row.question_code).replaceAll('_', ' '), result: row.answer ? 'Yes' : 'No', note: row.note })),
    flags: (flags ?? []).map((row: any) => ({ type: String(row.flag_type).replaceAll('_', ' '), description: row.description })),
    documents: (documents ?? []).map((row: any) => ({ label: row.label, result: String(row.result).replaceAll('_', ' '), note: row.note })),
    amenities: (amenities ?? []).map((row: any) => {
      const active = Array.isArray(row.active_amenities) ? row.active_amenities[0] : row.active_amenities
      const amenity = Array.isArray(active?.amenities) ? active.amenities[0] : active?.amenities
      return { label: amenity?.name || 'Amenity', condition: String(row.condition).replaceAll('_', ' '), note: row.note }
    }),
  })
  const reportPath = `${property.owner_profile_id}/${inspection.id}/${inspection.inspection_reference}.pdf`
  const upload = await admin.storage.from('inspection-reports').upload(reportPath, bytes, { contentType: 'application/pdf', upsert: true })
  if (upload.error) returnToReports('error', 'pdf_failed')
  const deliveredAt = new Date().toISOString()
  await Promise.all([
    admin.from('inspection_reports').update({ status: 'Completed', delivery_status: 'released', report_file_path: reportPath, reviewed_by: user.id, review_notes: parsed.data.note || null, approved_at: deliveredAt, released_at: deliveredAt, email_delivery_status: 'pending' }).eq('id', report.id),
    admin.from('inspections').update({ status: 'delivered', reviewed_at: deliveredAt, approved_at: deliveredAt, delivered_at: deliveredAt, review_notes: parsed.data.note || null }).eq('id', inspection.id),
    admin.from('notifications').insert({ recipient_id: property.owner_profile_id, actor_id: user.id, title: 'Inspection report available', message: `${inspection.inspection_reference} has been reviewed and released.`, category: 'inspection', metadata: { inspection_id: inspection.id, report_id: report.id } }),
  ])
  const email = owner?.email ? await sendTransactionalEmail({
    to: owner.email,
    subject: `PlotKare inspection report ${inspection.inspection_reference}`,
    text: `Your verified field inspection report ${inspection.inspection_reference} is now available in your PlotKare dashboard.`,
    html: `<p>Your verified field inspection report <strong>${inspection.inspection_reference}</strong> is now available in your PlotKare dashboard.</p>`,
  }) : { skipped: true as const, reason: 'Owner email is unavailable' }
  await admin.from('inspection_reports').update({
    email_delivery_status: email.skipped ? 'skipped' : 'error' in email && email.error ? 'failed' : 'sent',
    delivery_error: email.skipped ? email.reason : 'error' in email ? email.error : null,
  }).eq('id', report.id)
  await audit(admin, user.id, 'admin.inspection.report_released', inspection.id, { report_id: report.id, report_path: reportPath })
  revalidatePath('/admin/dashboard/inspection-reports')
  revalidatePath('/owner/services')
  returnToReports('success', 'report_released')
}
