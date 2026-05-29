import { NextResponse } from 'next/server'
import { z } from 'zod'
import { distanceMeters, notifyAdmins, readAssignedInspection, requiredAudit, requireFieldAgentApiContext } from '@/lib/agent/inspection'

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(1000),
  capturedAt: z.string().datetime(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireFieldAgentApiContext()
  if ('response' in context) return context.response
  const parsedParams = paramsSchema.safeParse(await params)
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: 'Valid GPS coordinates are required.' }, { status: 400 })
  }

  const inspection = await readAssignedInspection(context, parsedParams.data.id)
  if (!inspection) return NextResponse.json({ error: 'Assigned inspection not found.' }, { status: 404 })
  if (!['scheduled', 'in_progress'].includes(inspection.status)) {
    return NextResponse.json({ error: 'This inspection is no longer available for arrival capture.' }, { status: 409 })
  }
  if (inspection.arrival_captured_at) {
    return NextResponse.json({ error: 'Arrival evidence has already been recorded.' }, { status: 409 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  const targetLat = Number(inspection.target_latitude ?? property?.latitude)
  const targetLng = Number(inspection.target_longitude ?? property?.longitude)
  if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
    return NextResponse.json({ error: 'This plot does not have confirmed coordinates. Ask operations to update it.' }, { status: 409 })
  }

  const distance = distanceMeters(parsedBody.data.latitude, parsedBody.data.longitude, targetLat, targetLng)
  const radius = Number(inspection.proximity_radius_meters ?? 50)
  const accurate = parsedBody.data.accuracyMeters <= 50
  const inRadius = distance <= radius

  if (!accurate || !inRadius) {
    await requiredAudit(context, 'agent.inspection.arrival_rejected', inspection.id, {
      accuracy_meters: parsedBody.data.accuracyMeters,
      distance_meters: Math.round(distance),
      radius_meters: radius,
      accurate,
      in_radius: inRadius,
    })
    return NextResponse.json(
      {
        error: !accurate ? 'GPS accuracy is too low. Move to an open area and try again.' : 'Not at plot location. Move closer and try again.',
        accuracyMeters: parsedBody.data.accuracyMeters,
        distanceMeters: Math.round(distance),
      },
      { status: 422 },
    )
  }

  const timestamp = new Date().toISOString()
  const { error } = await context.admin
    .from('inspections')
    .update({
      target_latitude: targetLat,
      target_longitude: targetLng,
      arrival_latitude: parsedBody.data.latitude,
      arrival_longitude: parsedBody.data.longitude,
      arrival_accuracy_meters: parsedBody.data.accuracyMeters,
      arrival_distance_meters: distance,
      arrival_captured_at: parsedBody.data.capturedAt,
      arrival_verified: true,
      started_at: timestamp,
      status: 'in_progress',
      workflow_step: 'photos',
      sync_status: 'synced',
    })
    .eq('id', inspection.id)
    .eq('assigned_employee_id', context.employee.id)

  if (error) return NextResponse.json({ error: 'Arrival could not be recorded.' }, { status: 500 })
  await requiredAudit(context, 'agent.inspection.arrival_verified', inspection.id, {
    accuracy_meters: parsedBody.data.accuracyMeters,
    distance_meters: Math.round(distance),
    radius_meters: radius,
  })

  return NextResponse.json({ ok: true, distanceMeters: Math.round(distance), accuracyMeters: parsedBody.data.accuracyMeters })
}
