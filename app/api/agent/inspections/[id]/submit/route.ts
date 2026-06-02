import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { inspectionJsonArray } from '@/lib/agent/server'
import { recordAuditLog } from '@/lib/audit'

const answerSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.boolean().nullable(),
  note: z.string().optional().nullable(),
})

const submitSchema = z.object({
  summary: z.string().trim().min(10).max(3000),
  issueSeverity: z.enum(['normal', 'high', 'urgent']).default('normal'),
  actionRequired: z.boolean().default(false),
  notes: z.string().trim().max(3000).optional().nullable(),
  checklist: z.array(answerSchema).min(1),
  documents: z.array(z.object({ id: z.string(), label: z.string(), result: z.string(), note: z.string().optional().nullable() })).default([]),
  amenities: z.array(z.object({ id: z.string(), name: z.string(), condition: z.string(), note: z.string().optional().nullable(), photoId: z.string().optional().nullable() })).default([]),
  photos: z.array(z.object({ localId: z.string(), photoId: z.string(), direction: z.string(), subject: z.string(), capturedAt: z.string(), latitude: z.number().nullable(), longitude: z.number().nullable(), accuracy: z.number().nullable() })).min(4),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  if (context.profile.role !== 'employee') {
    return NextResponse.json({ ok: false, error: { code: 'FIELD_AGENT_REQUIRED', message: 'Field agent access is required.' } }, { status: 403 })
  }

  const { id } = await params
  const parsed = submitSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_SUBMISSION', message: parsed.error.issues[0]?.message || 'Inspection submission is invalid.' } }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { data: employee } = await admin
    .from('employees')
    .select('id,active,employee_role')
    .eq('profile_id', context.user.id)
    .eq('employee_role', 'field_inspection_agent')
    .maybeSingle()

  if (!employee?.id || employee.active === false) {
    return NextResponse.json({ ok: false, error: { code: 'INACTIVE_AGENT', message: 'Your field agent account is not active.' } }, { status: 403 })
  }

  const { data: inspection, error } = await admin
    .from('inspections')
    .select('id,status,assigned_employee_id,property_id,plot_id,photos,arrival_latitude,arrival_longitude,arrival_distance_meters,arrival_verified,properties(owner_profile_id,title)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  if (inspection.arrival_latitude == null || inspection.arrival_longitude == null || Number(inspection.arrival_distance_meters) > 300) {
    return NextResponse.json({ ok: false, error: { code: 'ARRIVAL_REQUIRED', message: 'Verify arrival at the plot before submitting.' } }, { status: 400 })
  }

  const { data: storedPhotos, error: photoReadError } = await admin
    .from('inspection_photos')
    .select('id,direction,upload_status')
    .eq('inspection_id', inspection.id)

  if (photoReadError) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_CHECK_FAILED', message: 'Could not verify inspection photos.' } }, { status: 400 })
  }

  const requiredDirections = new Set(['north', 'south', 'east', 'west'])
  const submittedDirections = new Set((storedPhotos ?? []).filter((photo) => photo.upload_status === 'complete').map((photo) => String(photo.direction).toLowerCase()))
  for (const direction of requiredDirections) {
    if (!submittedDirections.has(direction)) {
      return NextResponse.json({ ok: false, error: { code: 'MISSING_REQUIRED_PHOTO', message: `Capture ${direction} boundary photo before submitting.` } }, { status: 400 })
    }
  }

  const answeredChecklist = parsed.data.checklist.filter((answer) => answer.value !== null)
  if (answeredChecklist.length < 5) {
    return NextResponse.json({ ok: false, error: { code: 'CHECKLIST_INCOMPLETE', message: 'Answer all required checklist questions before submitting.' } }, { status: 400 })
  }

  const hasEncroachment = parsed.data.checklist.some((answer) => answer.key === 'encroachment' && answer.value === true)
  const issuePhotos = (storedPhotos ?? []).filter((photo) => String(photo.direction).startsWith('issue') && photo.upload_status === 'complete')
  if (hasEncroachment && issuePhotos.length < 2) {
    return NextResponse.json({ ok: false, error: { code: 'ENCROACHMENT_EVIDENCE_REQUIRED', message: 'Encroachment requires two issue photos.' } }, { status: 400 })
  }

  const payload = {
    type: 'field_submission',
    submitted_by: context.user.id,
    submitted_at: new Date().toISOString(),
    checklist: parsed.data.checklist,
    documents: parsed.data.documents,
    amenities: parsed.data.amenities,
    photos: parsed.data.photos,
    notes: parsed.data.notes ?? null,
  }

  const submittedAt = new Date().toISOString()
  const { error: updateError } = await admin
    .from('inspections')
    .update({
      status: 'completed',
      workflow_step: 'submitted',
      submitted_at: submittedAt,
      summary: parsed.data.summary,
      field_condition: parsed.data.issueSeverity === 'normal' ? 'stable' : 'attention_required',
      issue_severity: parsed.data.issueSeverity,
      action_required: parsed.data.actionRequired,
      employee_notes: parsed.data.notes ?? parsed.data.summary,
      photos: [...inspectionJsonArray(inspection.photos), payload],
    })
    .eq('id', inspection.id)
    .eq('assigned_employee_id', employee.id)

  if (updateError) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_SUBMIT_FAILED', message: 'Could not submit the inspection.' } }, { status: 400 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  if (property?.owner_profile_id) {
    const month = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
    const reportPayload = {
      owner_id: property.owner_profile_id,
      plot_id: inspection.plot_id ?? null,
      inspection_id: inspection.id,
      month,
      agent_name: context.profile.email ?? 'PlotKare field agent',
      finding: parsed.data.summary,
      status: parsed.data.actionRequired ? 'Action Needed' : 'Draft',
      delivery_status: 'pending',
      email_delivery_status: 'not_ready',
    }

    const { data: existingReport } = await admin
      .from('inspection_reports')
      .select('id')
      .eq('inspection_id', inspection.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingReport?.id) {
      await admin.from('inspection_reports').update(reportPayload).eq('id', existingReport.id)
    } else {
      await admin.from('inspection_reports').insert(reportPayload)
    }

    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin').limit(10)
    const adminNotifications = (admins ?? []).map((adminProfile) => ({
      recipient_id: adminProfile.id,
      actor_id: context.user.id,
      title: 'Inspection submitted for review',
      message: 'New inspection submitted for review',
      category: 'inspection',
      priority: parsed.data.actionRequired ? 'urgent' : 'normal',
      metadata: { inspection_id: inspection.id, plot_id: inspection.plot_id },
    }))
    if (adminNotifications.length) await admin.from('notifications').insert(adminNotifications)
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'agent.inspection_submitted',
    entityType: 'inspections',
    entityId: inspection.id,
    metadata: {
      status: parsed.data.actionRequired ? 'needs_followup' : 'completed',
      photo_count: (storedPhotos ?? []).filter((photo) => photo.upload_status === 'complete').length,
      issue_count: issuePhotos.length,
      arrival_distance_meters: inspection.arrival_distance_meters,
      action_required: parsed.data.actionRequired,
    },
  })

  return NextResponse.json({ ok: true, success: true, inspectionId: inspection.id, submittedAt })
}
