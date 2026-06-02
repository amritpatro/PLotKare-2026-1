import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const locationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().nonnegative().optional().nullable(),
  heading: z.coerce.number().min(0).max(359.999).optional().nullable(),
  speed: z.coerce.number().nonnegative().optional().nullable(),
  capturedAt: z.string().datetime(),
  source: z.enum(['gps', 'network', 'manual', 'simulated']).optional().default('gps'),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  if (context.profile.role !== 'employee') {
    return NextResponse.json({ ok: false, error: { code: 'FIELD_AGENT_REQUIRED', message: 'Field agent access is required.' } }, { status: 403 })
  }

  const { id } = await params
  const parsed = locationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_LOCATION', message: 'GPS payload is invalid.' } }, { status: 400 })
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

  const { data: inspection, error: inspectionError } = await admin
    .from('inspections')
    .select('id,assigned_employee_id,status')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (inspectionError || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  if (['completed', 'cancelled'].includes(String(inspection.status))) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_CLOSED', message: 'Tracking is closed for this inspection.' } }, { status: 409 })
  }

  const { error } = await admin.from('agent_locations').insert({
    inspection_id: inspection.id,
    agent_id: employee.id,
    profile_id: context.user.id,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy_meters: parsed.data.accuracy ?? null,
    heading: parsed.data.heading ?? null,
    speed_mps: parsed.data.speed ?? null,
    source: parsed.data.source,
    captured_at: parsed.data.capturedAt,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'LOCATION_SAVE_FAILED', message: 'Could not save the location update.' } }, { status: 400 })
  }

  return NextResponse.json({ ok: true, location: { inspectionId: inspection.id, capturedAt: parsed.data.capturedAt } })
}
