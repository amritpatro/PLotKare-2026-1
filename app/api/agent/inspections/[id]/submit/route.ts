import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { inspectionJsonArray } from '@/lib/agent/server'
import {
  getInspectionTemplate,
  getTriggeredIssueKeys,
  inspectionTypeFromProperty,
  requiredChecklistKeys,
} from '@/lib/agent/inspection-templates'
import { recordAuditLog } from '@/lib/audit'
import { logger } from '@/lib/monitoring/logger'

const answerSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.boolean().nullable(),
  note: z.string().optional().nullable(),
})

const submitSchema = z.object({
  propertyType: z.enum(['vacant_plot', 'apartment', 'house_villa', 'commercial']).optional(),
  summary: z.string().trim().min(10).max(3000),
  issueSeverity: z.enum(['normal', 'high', 'urgent']).default('normal'),
  actionRequired: z.boolean().default(false),
  notes: z.string().trim().max(3000).optional().nullable(),
  checklist: z.array(answerSchema).min(1),
  documents: z.array(z.object({ id: z.string(), label: z.string(), result: z.string(), note: z.string().optional().nullable() })).default([]),
  amenities: z.array(z.object({ id: z.string(), name: z.string(), condition: z.string(), note: z.string().optional().nullable(), photoId: z.string().optional().nullable() })).default([]),
  photos: z.array(z.object({ localId: z.string(), photoId: z.string(), direction: z.string(), subject: z.string(), capturedAt: z.string(), latitude: z.number().nullable(), longitude: z.number().nullable(), accuracy: z.number().nullable() })).min(1),
})

const completedPhotoStatuses = new Set(['complete', 'finalized'])

function fieldConditionForSubmission(issueSeverity: 'normal' | 'high' | 'urgent', actionRequired: boolean) {
  if (issueSeverity === 'urgent') return 'critical'
  if (issueSeverity === 'high' || actionRequired) return 'issue_found'
  return 'good'
}

function dbIssueSeverity(issueSeverity: 'normal' | 'high' | 'urgent') {
  return issueSeverity === 'normal' ? 'none' : issueSeverity
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response
  if (await isRateLimited(request, { identifier: context.user.id })) {
    return NextResponse.json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many inspection submissions. Please wait and try again.' } }, { status: 429 })
  }

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
    .select('id,status,assigned_employee_id,property_id,plot_id,photos,arrival_latitude,arrival_longitude,arrival_distance_meters,arrival_verified,inspection_property_type,properties(owner_profile_id,title,asset_type,property_kind)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  if (inspection.arrival_latitude == null || inspection.arrival_longitude == null || Number(inspection.arrival_distance_meters) > 200) {
    return NextResponse.json({ ok: false, error: { code: 'ARRIVAL_REQUIRED', message: 'Verify arrival at the property before submitting.' } }, { status: 400 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  const propertyType = inspectionTypeFromProperty({
    inspectionPropertyType: inspection.inspection_property_type ?? parsed.data.propertyType,
    assetType: property?.asset_type,
    propertyKind: property?.property_kind,
    hasPlot: Boolean(inspection.plot_id),
  })
  const template = getInspectionTemplate(propertyType)

  const { data: storedPhotos, error: photoReadError } = await admin
    .from('inspection_photos')
    .select('id,direction,upload_status')
    .eq('inspection_id', inspection.id)

  if (photoReadError) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_CHECK_FAILED', message: 'Could not verify inspection photos.' } }, { status: 400 })
  }

  const completedPhotos = (storedPhotos ?? []).filter((photo) => completedPhotoStatuses.has(String(photo.upload_status)))
  const submittedDirections = new Set(completedPhotos.map((photo) => String(photo.direction).toLowerCase()))
  for (const photoRequirement of template.requiredPhotos) {
    if (!submittedDirections.has(photoRequirement.key)) {
      return NextResponse.json({ ok: false, error: { code: 'MISSING_REQUIRED_PHOTO', message: `Capture ${photoRequirement.label.toLowerCase()} photo before submitting.` } }, { status: 400 })
    }
  }

  const requiredKeys = requiredChecklistKeys(template)
  const checklistByKey = new Map(parsed.data.checklist.map((answer) => [answer.key, answer.value]))
  const missingRequiredKey = Array.from(requiredKeys).find((key) => checklistByKey.get(key) == null)
  if (missingRequiredKey) {
    return NextResponse.json({ ok: false, error: { code: 'CHECKLIST_INCOMPLETE', message: `Answer all ${requiredKeys.size} required checklist questions before submitting.` } }, { status: 400 })
  }

  const triggeredIssueKeys = getTriggeredIssueKeys(template, parsed.data.checklist)
  const issuePhotos = completedPhotos.filter((photo) => String(photo.direction).startsWith('issue'))
  if (triggeredIssueKeys.length > 0 && issuePhotos.length < 2) {
    return NextResponse.json({ ok: false, error: { code: 'ISSUE_EVIDENCE_REQUIRED', message: 'Flagged conditions require two issue photos.' } }, { status: 400 })
  }

  const actionRequired = parsed.data.actionRequired || triggeredIssueKeys.length > 0

  const payload = {
    type: 'field_submission',
    property_type: propertyType,
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
      field_condition: fieldConditionForSubmission(parsed.data.issueSeverity, actionRequired),
      issue_severity: dbIssueSeverity(parsed.data.issueSeverity),
      action_required: actionRequired,
      employee_notes: parsed.data.notes ?? parsed.data.summary,
      photos: [...inspectionJsonArray(inspection.photos), payload],
    })
    .eq('id', inspection.id)
    .eq('assigned_employee_id', employee.id)

  if (updateError) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_SUBMIT_FAILED', message: 'Could not submit the inspection.' } }, { status: 400 })
  }

  if (property?.owner_profile_id) {
    const month = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
    const reportPayload = {
      owner_id: property.owner_profile_id,
      plot_id: inspection.plot_id ?? null,
      inspection_id: inspection.id,
      month,
      agent_name: context.profile.email ?? 'PlotKare field agent',
      finding: parsed.data.summary,
      status: actionRequired ? 'Action Needed' : 'Draft',
      delivery_status: 'pending_review',
      email_delivery_status: 'not_ready',
    }

    const { data: existingReport } = await admin
      .from('inspection_reports')
      .select('id')
      .eq('inspection_id', inspection.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const reportWrite = existingReport?.id
      ? await admin.from('inspection_reports').update(reportPayload).eq('id', existingReport.id)
      : await admin.from('inspection_reports').insert(reportPayload)

    if (reportWrite.error) {
      logger.error('Inspection report save failed:', reportWrite.error)
      return NextResponse.json({ ok: false, error: { code: 'REPORT_SAVE_FAILED', message: 'Inspection was submitted, but the review report could not be created.' } }, { status: 400 })
    }

    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin').limit(10)
    const adminNotifications = (admins ?? []).map((adminProfile) => ({
      recipient_id: adminProfile.id,
      actor_id: context.user.id,
      title: 'Inspection submitted for review',
      message: 'New inspection submitted for review',
      category: 'inspection',
      priority: actionRequired ? 'urgent' : 'normal',
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
      status: actionRequired ? 'needs_followup' : 'completed',
      inspection_property_type: propertyType,
      photo_count: completedPhotos.length,
      issue_count: issuePhotos.length,
      flagged_checklist_keys: triggeredIssueKeys,
      arrival_distance_meters: inspection.arrival_distance_meters,
      action_required: actionRequired,
    },
  })

  return NextResponse.json({ ok: true, success: true, inspectionId: inspection.id, submittedAt })
}
