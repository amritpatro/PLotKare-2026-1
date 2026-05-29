import { NextResponse } from 'next/server'
import { FIELD_CHECKLIST } from '@/lib/agent/field-spec'
import { notifyAdmins, readAssignedInspection, requiredAudit, requireFieldAgentApiContext } from '@/lib/agent/inspection'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireFieldAgentApiContext()
  if ('response' in context) return context.response
  const { id } = await params
  const inspection = await readAssignedInspection(context, id)
  if (!inspection || !inspection.arrival_verified || !['in_progress', 'correction_required'].includes(inspection.status)) {
    return NextResponse.json({ error: 'This inspection is not open for submission.' }, { status: 409 })
  }

  const [photosResult, answersResult, flagsResult, amenityResult, activeAmenityResult] = await Promise.all([
    context.admin.from('inspection_photos').select('id,direction,subject').eq('inspection_id', inspection.id).eq('upload_status', 'finalized'),
    context.admin.from('inspection_checklist_answers').select('question_code,answer').eq('inspection_id', inspection.id),
    context.admin.from('inspection_flags').select('id,flag_type,severity').eq('inspection_id', inspection.id),
    context.admin.from('inspection_amenity_checks').select('id,active_amenity_id,condition,note,photo_id').eq('inspection_id', inspection.id),
    inspection.plot_id ? context.admin.from('active_amenities').select('id').eq('plot_id', inspection.plot_id) : Promise.resolve({ data: [] }),
  ])
  const photos = photosResult.data ?? []
  const answerRows = answersResult.data ?? []
  const missingCorners = ['north', 'south', 'east', 'west'].filter((direction) => !photos.some((photo) => photo.direction === direction))
  const missingQuestions = FIELD_CHECKLIST.filter((question) => !answerRows.some((answer) => answer.question_code === question.code))
  if (missingCorners.length || missingQuestions.length) {
    return NextResponse.json({
      error: 'Complete all required photos and checklist answers before submission.',
      missingCorners,
      missingQuestions: missingQuestions.map((item) => item.label),
    }, { status: 409 })
  }
  const encroachment = answerRows.find((answer) => answer.question_code === 'encroachment_observed')?.answer === true
  const issuePhotoCount = photos.filter((photo) => photo.subject === 'issue').length
  const hasEncroachmentFlag = (flagsResult.data ?? []).some((flag) => flag.flag_type === 'encroachment')
  if (encroachment && (!hasEncroachmentFlag || issuePhotoCount < 2)) {
    return NextResponse.json({ error: 'Encroachment requires a description and two issue photos.' }, { status: 409 })
  }
  const amenityRows = amenityResult.data ?? []
  const activeAmenityIds = (activeAmenityResult.data ?? []).map((item) => item.id)
  const missingAmenityEvidence = activeAmenityIds.filter((id) => !amenityRows.some((row) => row.active_amenity_id === id && row.photo_id))
  if (missingAmenityEvidence.length) {
    return NextResponse.json({ error: 'Every active amenity requires a current evidence photo.' }, { status: 409 })
  }
  if (amenityRows.some((item) => item.condition !== 'good' && (!item.note || !String(item.note).trim()))) {
    return NextResponse.json({ error: 'Amenity issues require notes and supporting photos.' }, { status: 409 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  if (!property?.owner_profile_id) return NextResponse.json({ error: 'The property owner is not linked.' }, { status: 409 })
  const timestamp = new Date().toISOString()
  const month = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
  const finding = (flagsResult.data ?? []).length
    ? `${flagsResult.data?.length} field flag(s) submitted for review.`
    : 'Field inspection submitted without reported concerns.'

  const reportPayload = {
    inspection_id: inspection.id,
    owner_id: property.owner_profile_id,
    plot_id: inspection.plot_id,
    month,
    agent_name: context.profile.full_name || context.profile.email || 'PlotKare field agent',
    finding,
    status: 'Draft',
    delivery_status: 'pending_review',
    email_delivery_status: 'not_ready',
  }
  const { data: existingReport } = await context.admin.from('inspection_reports').select('id').eq('inspection_id', inspection.id).maybeSingle()
  const reportResult = existingReport
    ? await context.admin.from('inspection_reports').update(reportPayload).eq('id', existingReport.id)
    : await context.admin.from('inspection_reports').insert(reportPayload)
  const reportError = reportResult.error
  if (reportError) return NextResponse.json({ error: 'Review report could not be prepared.' }, { status: 500 })

  const { error: inspectionError } = await context.admin.from('inspections').update({
    status: 'submitted',
    workflow_step: 'submitted',
    submitted_at: timestamp,
    summary: finding,
    sync_status: 'synced',
  }).eq('id', inspection.id).eq('assigned_employee_id', context.employee.id)
  if (inspectionError) return NextResponse.json({ error: 'Inspection submission failed.' }, { status: 500 })

  const { error: workError } = await context.admin.from('employee_work_logs').insert({
    employee_id: context.employee.id,
    profile_id: context.user.id,
    entity_type: 'inspections',
    entity_id: inspection.id,
    action: 'field_inspection_submitted',
    previous_status: inspection.status,
    new_status: 'submitted',
    note: finding,
    metadata: { inspection_reference: inspection.inspection_reference, evidence_count: photos.length },
  })
  if (workError) return NextResponse.json({ error: 'Work log could not be recorded.' }, { status: 500 })
  await requiredAudit(context, 'agent.inspection.submitted', inspection.id, {
    inspection_reference: inspection.inspection_reference,
    evidence_count: photos.length,
    flag_count: (flagsResult.data ?? []).length,
  })
  await notifyAdmins(context, 'Inspection ready for review', `${inspection.inspection_reference} has new verified field evidence.`, {
    inspection_id: inspection.id,
    inspection_reference: inspection.inspection_reference,
    status: 'submitted',
  })
  return NextResponse.json({ ok: true, inspectionReference: inspection.inspection_reference })
}
