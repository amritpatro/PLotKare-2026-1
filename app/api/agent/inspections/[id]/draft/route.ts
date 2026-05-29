import { NextResponse } from 'next/server'
import { z } from 'zod'
import { FIELD_CHECKLIST } from '@/lib/agent/field-spec'
import { notifyAdmins, readAssignedInspection, requiredAudit, requireFieldAgentApiContext } from '@/lib/agent/inspection'

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  checklist: z.array(z.object({ code: z.string(), answer: z.boolean(), note: z.string().trim().max(500).optional() })),
  documentChecks: z.array(z.object({
    documentId: z.string().uuid().nullable().optional(),
    label: z.string().trim().min(1).max(120),
    observedStatus: z.string().trim().max(80).optional(),
    result: z.enum(['confirmed', 'reminder', 'review_needed']),
    note: z.string().trim().max(500).optional(),
  })).default([]),
  amenityChecks: z.array(z.object({
    activeAmenityId: z.string().uuid(),
    condition: z.enum(['good', 'needs_attention', 'damaged', 'not_found']),
    note: z.string().trim().max(500).optional(),
    photoId: z.string().uuid().nullable().optional(),
  })).default([]),
  flags: z.array(z.object({
    type: z.enum(['encroachment', 'access', 'vegetation', 'waste', 'water_logging', 'survey_marker', 'document_due', 'amenity_issue', 'other']),
    severity: z.enum(['normal', 'high', 'urgent']).default('normal'),
    description: z.string().trim().min(3).max(1000),
    photoId: z.string().uuid().nullable().optional(),
  })).default([]),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireFieldAgentApiContext()
  if ('response' in context) return context.response
  const parsedParams = paramsSchema.safeParse(await params)
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: 'Complete valid field checks before continuing.' }, { status: 400 })
  }
  const inspection = await readAssignedInspection(context, parsedParams.data.id)
  if (!inspection || !inspection.arrival_verified || !['in_progress', 'correction_required'].includes(inspection.status)) {
    return NextResponse.json({ error: 'Inspection is not ready for field results.' }, { status: 409 })
  }
  const validCodes = new Set(FIELD_CHECKLIST.map((item) => item.code))
  if (parsedBody.data.checklist.some((answer) => !validCodes.has(answer.code as never))) {
    return NextResponse.json({ error: 'Checklist contains an unsupported question.' }, { status: 400 })
  }
  if (parsedBody.data.amenityChecks.some((item) => !item.photoId)) {
    return NextResponse.json({ error: 'Every active amenity requires a current evidence photo.' }, { status: 400 })
  }
  if (parsedBody.data.amenityChecks.some((item) => item.condition !== 'good' && !item.note?.trim())) {
    return NextResponse.json({ error: 'Amenity issues require a description.' }, { status: 400 })
  }

  const checklistRows = parsedBody.data.checklist.map((answer) => ({
    inspection_id: inspection.id,
    question_code: answer.code,
    answer: answer.answer,
    note: answer.note || null,
    created_by: context.user.id,
  }))
  const documentRows = parsedBody.data.documentChecks.map((item) => ({
    inspection_id: inspection.id,
    document_id: item.documentId ?? null,
    label: item.label,
    observed_status: item.observedStatus ?? null,
    result: item.result,
    note: item.note || null,
    created_by: context.user.id,
  }))
  const amenityRows = parsedBody.data.amenityChecks.map((item) => ({
    inspection_id: inspection.id,
    active_amenity_id: item.activeAmenityId,
    condition: item.condition,
    note: item.note || null,
    photo_id: item.photoId ?? null,
    created_by: context.user.id,
  }))

  const results = await Promise.all([
    checklistRows.length
      ? context.admin.from('inspection_checklist_answers').upsert(checklistRows, { onConflict: 'inspection_id,question_code' })
      : Promise.resolve({ error: null }),
    documentRows.length
      ? context.admin.from('inspection_document_checks').upsert(documentRows, { onConflict: 'inspection_id,label' })
      : Promise.resolve({ error: null }),
    amenityRows.length
      ? context.admin.from('inspection_amenity_checks').upsert(amenityRows, { onConflict: 'inspection_id,active_amenity_id' })
      : Promise.resolve({ error: null }),
  ])
  const error = results.find((result) => result.error)?.error
  if (error) return NextResponse.json({ error: 'Field checks could not be saved.' }, { status: 500 })

  await context.admin
    .from('inspection_flags')
    .delete()
    .eq('inspection_id', inspection.id)
    .eq('raised_by', context.user.id)
    .eq('status', 'open')

  if (parsedBody.data.flags.length) {
    const { error: flagError } = await context.admin.from('inspection_flags').insert(
      parsedBody.data.flags.map((flag) => ({
        inspection_id: inspection.id,
        flag_type: flag.type,
        severity: flag.severity,
        description: flag.description,
        photo_id: flag.photoId ?? null,
        raised_by: context.user.id,
      })),
    )
    if (flagError) return NextResponse.json({ error: 'Issue flags could not be saved.' }, { status: 500 })
    if (parsedBody.data.flags.some((flag) => flag.severity === 'urgent' || flag.type === 'encroachment')) {
      await notifyAdmins(context, 'Urgent field inspection flag', `${inspection.inspection_reference} needs immediate operations review.`, {
        inspection_id: inspection.id,
        inspection_reference: inspection.inspection_reference,
      })
    }
  }

  const { error: workflowError } = await context.admin.from('inspections').update({ workflow_step: 'review', sync_status: 'synced' }).eq('id', inspection.id)
  if (workflowError) return NextResponse.json({ error: 'Inspection progress could not be recorded.' }, { status: 500 })
  await requiredAudit(context, 'agent.inspection.field_checks_saved', inspection.id, {
    checklist_count: checklistRows.length,
    document_check_count: documentRows.length,
    amenity_check_count: amenityRows.length,
    flag_count: parsedBody.data.flags.length,
  })
  return NextResponse.json({ ok: true })
}
