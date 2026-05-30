import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { distanceMeters, inspectionJsonArray } from '@/lib/agent/server'
import { recordAuditLog } from '@/lib/audit'

const bodySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().positive(),
  capturedAt: z.string().datetime(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  if (context.profile.role !== 'employee') {
    return NextResponse.json({ ok: false, error: { code: 'FIELD_AGENT_REQUIRED', message: 'Field agent access is required.' } }, { status: 403 })
  }

  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_ARRIVAL', message: 'GPS payload is invalid.' } }, { status: 400 })
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
    .select('id,status,assigned_employee_id,photos,properties(latitude,longitude)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  const targetLatitude = Number(property?.latitude)
  const targetLongitude = Number(property?.longitude)

  if (!Number.isFinite(targetLatitude) || !Number.isFinite(targetLongitude)) {
    return NextResponse.json({ ok: false, error: { code: 'TARGET_COORDINATES_REQUIRED', message: 'Admin must confirm plot coordinates before this inspection can start.' } }, { status: 409 })
  }

  const distance = Math.round(distanceMeters(parsed.data, { latitude: targetLatitude, longitude: targetLongitude }))
  const verified = distance <= 50 && parsed.data.accuracy <= 100
  if (!verified) {
    return NextResponse.json({
      ok: false,
      error: {
        code: 'OUT_OF_RADIUS',
        message: parsed.data.accuracy > 100 ? 'GPS accuracy is too weak. Move to an open area and try again.' : 'You are not within 50 meters of the plot.',
      },
      distanceMeters: distance,
      accuracy: parsed.data.accuracy,
    }, { status: 409 })
  }

  const event = {
    type: 'arrival',
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy: parsed.data.accuracy,
    captured_at: parsed.data.capturedAt,
    distance_meters: distance,
    verified: true,
    submitted_by: context.user.id,
  }

  const { error: updateError } = await admin
    .from('inspections')
    .update({
      status: inspection.status === 'scheduled' || inspection.status === 'requested' ? 'in_progress' : inspection.status,
      photos: [...inspectionJsonArray(inspection.photos), event],
    })
    .eq('id', inspection.id)
    .eq('assigned_employee_id', employee.id)

  if (updateError) {
    return NextResponse.json({ ok: false, error: { code: 'ARRIVAL_SAVE_FAILED', message: updateError.message } }, { status: 400 })
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'agent.arrival_verified',
    entityType: 'inspections',
    entityId: inspection.id,
    metadata: event,
  })

  return NextResponse.json({ ok: true, arrival: event })
}
