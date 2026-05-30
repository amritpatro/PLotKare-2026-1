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
    .select('id,status,assigned_employee_id,property_id,plot_id,photos,properties(owner_profile_id,title)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  const requiredDirections = new Set(['north', 'south', 'east', 'west'])
  const submittedDirections = new Set(parsed.data.photos.map((photo) => photo.direction.toLowerCase()))
  for (const direction of requiredDirections) {
    if (!submittedDirections.has(direction)) {
      return NextResponse.json({ ok: false, error: { code: 'MISSING_REQUIRED_PHOTO', message: `Capture ${direction} boundary photo before submitting.` } }, { status: 400 })
    }
  }

  const hasEncroachment = parsed.data.checklist.some((answer) => answer.key === 'encroachment' && answer.value === true)
  const issuePhotos = parsed.data.photos.filter((photo) => photo.direction.startsWith('issue'))
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

  const { error: updateError } = await admin
    .from('inspections')
    .update({
      status: parsed.data.actionRequired ? 'needs_followup' : 'completed',
      completed_at: new Date().toISOString(),
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
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_SUBMIT_FAILED', message: updateError.message } }, { status: 400 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  if (property?.owner_profile_id) {
    const month = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
    await admin.from('inspection_reports').insert({
      owner_id: property.owner_profile_id,
      plot_id: inspection.plot_id ?? null,
      month,
      agent_name: context.profile.email ?? 'PlotKare field agent',
      finding: parsed.data.summary,
      status: parsed.data.actionRequired ? 'Action Needed' : 'Completed',
    })
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'agent.inspection_submitted',
    entityType: 'inspections',
    entityId: inspection.id,
    metadata: {
      status: parsed.data.actionRequired ? 'needs_followup' : 'completed',
      photo_count: parsed.data.photos.length,
      action_required: parsed.data.actionRequired,
    },
  })

  return NextResponse.json({ ok: true })
}
