import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { distanceMeters, inspectionJsonArray } from '@/lib/agent/server'
import { recordAuditLog } from '@/lib/audit'
import { getArrivalStatus } from '@/lib/utils/haversine'
import { reverseGeocodeLabel } from '@/lib/maps/reverse-geocode'
import { logger } from '@/lib/monitoring/logger'

const bodySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().positive(),
  capturedAt: z.string().datetime(),
  confirmOutsideRadius: z.preprocess(
    (value) => value === true || value === 'true' || value === '1',
    z.boolean().optional().default(false),
  ),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response
  if (await isRateLimited(request, { identifier: context.user.id })) {
    return NextResponse.json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many inspection workflow requests. Please wait and try again.' } }, { status: 429 })
  }

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
    .select('id,status,assigned_employee_id,photos,target_latitude,target_longitude,properties(latitude,longitude),plots(target_latitude,target_longitude,location_status,google_maps_link,address_landmark)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  const plot = Array.isArray(inspection.plots) ? inspection.plots[0] : inspection.plots
  const plotVerified = plot?.location_status === 'verified'
  const inspectionTargetLatitude = Number(inspection.target_latitude)
  const inspectionTargetLongitude = Number(inspection.target_longitude)
  const plotTargetLatitude = Number(plot?.target_latitude)
  const plotTargetLongitude = Number(plot?.target_longitude)
  const targetLatitude = plotVerified
    ? Number.isFinite(inspectionTargetLatitude)
      ? inspectionTargetLatitude
      : plotTargetLatitude
    : Number.NaN
  const targetLongitude = plotVerified
    ? Number.isFinite(inspectionTargetLongitude)
      ? inspectionTargetLongitude
      : plotTargetLongitude
    : Number.NaN

  if (!Number.isFinite(targetLatitude) || !Number.isFinite(targetLongitude)) {
    return NextResponse.json({ ok: false, error: { code: 'TARGET_COORDINATES_REQUIRED', message: 'Verified plot location is missing. Contact admin before starting GPS arrival proof.' } }, { status: 409 })
  }

  const distance = Math.round(distanceMeters(parsed.data, { latitude: targetLatitude, longitude: targetLongitude }))
  const weakAccuracy = parsed.data.accuracy > 80
  const arrivalStatus = getArrivalStatus(distance)
  const verified = arrivalStatus === 'verified'
  const outsideRadius = arrivalStatus === 'outside-radius'

  if (arrivalStatus === 'too-far' || (outsideRadius && !parsed.data.confirmOutsideRadius)) {
    return NextResponse.json({
      ok: false,
      error: {
        code: arrivalStatus === 'too-far' ? 'TOO_FAR_FROM_PLOT' : 'OUTSIDE_RADIUS_CONFIRM_REQUIRED',
        message: arrivalStatus === 'too-far'
          ? 'You are more than 200m from the verified plot pin. Please walk closer before starting.'
          : 'You are 51-200m from the verified plot pin. Confirm only if you are at the right location.',
      },
      distanceMeters: distance,
      canConfirmOutsideRadius: outsideRadius,
    }, { status: 409 })
  }

  const placeLabel = await reverseGeocodeLabel(parsed.data.latitude, parsed.data.longitude)
  const event = {
    type: 'arrival',
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy: parsed.data.accuracy,
    captured_at: parsed.data.capturedAt,
    distance_meters: distance,
    verified,
    outside_radius: outsideRadius,
    override_confirmed: outsideRadius && parsed.data.confirmOutsideRadius,
    weak_accuracy: weakAccuracy,
    target_latitude: targetLatitude,
    target_longitude: targetLongitude,
    submitted_by: context.user.id,
    place_label: placeLabel,
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
      arrival_outside_radius: outsideRadius,
      arrival_place_label: placeLabel,
      target_latitude: targetLatitude,
      target_longitude: targetLongitude,
      photos: [...inspectionJsonArray(inspection.photos), event],
    })
    .eq('id', inspection.id)
    .eq('assigned_employee_id', employee.id)

  if (updateError) {
    logger.error('Arrival proof update failed:', updateError)
    return NextResponse.json({ ok: false, error: { code: 'ARRIVAL_SAVE_FAILED', message: 'Could not confirm arrival.' } }, { status: 400 })
  }

  await admin.from('agent_locations').insert({
    inspection_id: inspection.id,
    agent_id: employee.id,
    profile_id: context.user.id,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy_meters: parsed.data.accuracy,
    source: 'gps',
    captured_at: parsed.data.capturedAt,
    place_label: placeLabel,
  })

  await recordAuditLog({
    actorId: context.user.id,
    action: outsideRadius ? 'agent.arrival_override' : 'agent.arrival_verified',
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
    weakAccuracy,
    arrival: event,
  })
}
