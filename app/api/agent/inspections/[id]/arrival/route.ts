import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { distanceMeters, inspectionJsonArray } from '@/lib/agent/server'
import { recordAuditLog } from '@/lib/audit'
import { getArrivalStatus } from '@/lib/utils/haversine'

const bodySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().positive(),
  capturedAt: z.string().datetime(),
  confirmOutsideRadius: z.coerce.boolean().optional().default(false),
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
    .select('id,status,assigned_employee_id,photos,target_latitude,target_longitude,properties(latitude,longitude)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  const targetLatitude = inspection.target_latitude == null ? Number(property?.latitude) : Number(inspection.target_latitude)
  const targetLongitude = inspection.target_longitude == null ? Number(property?.longitude) : Number(inspection.target_longitude)

  if (!Number.isFinite(targetLatitude) || !Number.isFinite(targetLongitude)) {
    return NextResponse.json({ ok: false, error: { code: 'TARGET_COORDINATES_REQUIRED', message: 'Location not set for this plot. Contact your admin to add the plot location.' } }, { status: 409 })
  }

  const distance = Math.round(distanceMeters(parsed.data, { latitude: targetLatitude, longitude: targetLongitude }))
  const weakAccuracy = parsed.data.accuracy > 80
  const arrivalStatus = getArrivalStatus(distance)
  const verified = arrivalStatus === 'verified' && !weakAccuracy
  const outsideRadius = arrivalStatus === 'outside-radius'

  if (weakAccuracy || arrivalStatus === 'too-far' || (outsideRadius && !parsed.data.confirmOutsideRadius)) {
    return NextResponse.json({
      ok: false,
      error: {
        code: weakAccuracy ? 'WEAK_GPS' : arrivalStatus === 'too-far' ? 'TOO_FAR_FROM_PLOT' : 'OUTSIDE_RADIUS_CONFIRM_REQUIRED',
        message: weakAccuracy
          ? 'Weak GPS — move to open area and wait'
          : arrivalStatus === 'too-far'
            ? 'You are too far from the plot. Please walk to the plot before starting the inspection.'
            : 'You appear to be a little far from the plot. Are you sure you are at the right location?',
      },
      distanceMeters: distance,
      canConfirmOutsideRadius: outsideRadius && !weakAccuracy,
    }, { status: 409 })
  }

  const event = {
    type: 'arrival',
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy: parsed.data.accuracy,
    captured_at: parsed.data.capturedAt,
    distance_meters: distance,
    verified,
    outside_radius: outsideRadius,
    target_latitude: targetLatitude,
    target_longitude: targetLongitude,
    submitted_by: context.user.id,
  }

  const { error: updateError } = await admin
    .from('inspections')
    .update({
      status: inspection.status === 'scheduled' || inspection.status === 'requested' ? 'in_progress' : inspection.status,
      workflow_step: 'photos',
      started_at: new Date().toISOString(),
      arrival_latitude: parsed.data.latitude,
      arrival_longitude: parsed.data.longitude,
      arrival_accuracy_meters: parsed.data.accuracy,
      arrival_distance_meters: distance,
      arrival_captured_at: parsed.data.capturedAt,
      arrival_verified: verified,
      target_latitude: targetLatitude,
      target_longitude: targetLongitude,
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

  return NextResponse.json({
    ok: true,
    success: true,
    nextStep: 'photos',
    distanceMeters: distance,
    verified,
    arrival: event,
  })
}
