import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readAssignedInspection, requiredAudit, requireFieldAgentApiContext } from '@/lib/agent/inspection'

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  objectPath: z.string().min(1),
  direction: z.enum(['north', 'south', 'east', 'west', 'issue', 'amenity']),
  subject: z.enum(['boundary', 'issue', 'amenity']),
  mimeType: z.enum(['image/webp', 'image/jpeg']),
  sizeBytes: z.number().int().positive().max(819200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(1000),
  capturedAt: z.string().datetime(),
  note: z.string().trim().max(500).optional(),
  activeAmenityId: z.string().uuid().optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireFieldAgentApiContext()
  if ('response' in context) return context.response
  const parsedParams = paramsSchema.safeParse(await params)
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: 'Evidence metadata is invalid.' }, { status: 400 })
  }
  const inspection = await readAssignedInspection(context, parsedParams.data.id)
  if (!inspection || !inspection.arrival_verified || !['in_progress', 'correction_required'].includes(inspection.status)) {
    return NextResponse.json({ error: 'Inspection is not active.' }, { status: 409 })
  }
  const expectedPrefix = `${context.user.id}/${inspection.id}/`
  if (!parsedBody.data.objectPath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'Evidence upload path is not authorized.' }, { status: 403 })
  }

  const pathParts = parsedBody.data.objectPath.split('/')
  const objectName = pathParts.pop() ?? ''
  const directory = pathParts.join('/')
  const { data: uploaded } = await context.admin.storage.from('inspection-photos').list(directory, { search: objectName, limit: 2 })
  const storedObject = uploaded?.find((entry) => entry.name === objectName)
  if (!storedObject) return NextResponse.json({ error: 'Uploaded evidence was not found.' }, { status: 409 })

  const plot = Array.isArray(inspection.plots) ? inspection.plots[0] : inspection.plots
  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  if (!property?.owner_profile_id) {
    return NextResponse.json({ error: 'This inspection has no linked property owner.' }, { status: 409 })
  }
  const { data: photo, error } = await context.admin
    .from('inspection_photos')
    .insert({
      owner_id: property.owner_profile_id,
      plot_id: plot?.id ?? inspection.plot_id,
      inspection_id: inspection.id,
      agent_employee_id: context.employee.id,
      bucket: 'inspection-photos',
      object_path: parsedBody.data.objectPath,
      mime_type: parsedBody.data.mimeType,
      size_bytes: parsedBody.data.sizeBytes,
      compressed_size_bytes: parsedBody.data.sizeBytes,
      direction: parsedBody.data.direction,
      subject: parsedBody.data.subject,
      latitude: parsedBody.data.latitude,
      longitude: parsedBody.data.longitude,
      accuracy_meters: parsedBody.data.accuracyMeters,
      captured_at: parsedBody.data.capturedAt,
      note: parsedBody.data.note ?? null,
      active_amenity_id: parsedBody.data.activeAmenityId ?? null,
      upload_status: 'finalized',
      finalized_at: new Date().toISOString(),
    })
    .select('id,direction,subject,captured_at,compressed_size_bytes')
    .single()

  if (error) return NextResponse.json({ error: 'Evidence could not be finalized.' }, { status: 500 })
  await requiredAudit(context, 'agent.inspection.evidence_finalized', inspection.id, {
    photo_id: photo.id,
    direction: photo.direction,
    subject: photo.subject,
    compressed_size_bytes: photo.compressed_size_bytes,
  })
  return NextResponse.json({ ok: true, photo })
}
