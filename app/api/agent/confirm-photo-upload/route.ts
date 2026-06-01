import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  inspectionId: z.string().uuid(),
  direction: z.string().trim().min(2).max(40),
  storagePath: z.string().trim().min(10),
  sizeBytes: z.coerce.number().int().positive().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracy: z.coerce.number().positive().optional(),
  capturedAt: z.string().datetime().optional(),
})

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response
  if (context.profile.role !== 'employee') {
    return NextResponse.json({ ok: false, error: { code: 'FIELD_AGENT_REQUIRED', message: 'Field agent access is required.' } }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_CONFIRMATION', message: parsed.error.issues[0]?.message || 'Upload confirmation is invalid.' } }, { status: 400 })
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

  const { data: inspection } = await admin
    .from('inspections')
    .select('id,assigned_employee_id')
    .eq('id', parsed.data.inspectionId)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (!inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  const { error } = await admin
    .from('inspection_photos')
    .update({
      upload_status: 'complete',
      finalized_at: new Date().toISOString(),
      size_bytes: parsed.data.sizeBytes ?? null,
      compressed_size_bytes: parsed.data.sizeBytes ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      accuracy_meters: parsed.data.accuracy ?? null,
      captured_at: parsed.data.capturedAt ?? new Date().toISOString(),
    })
    .eq('inspection_id', parsed.data.inspectionId)
    .eq('agent_employee_id', employee.id)
    .eq('direction', parsed.data.direction)
    .eq('object_path', parsed.data.storagePath)

  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_CONFIRM_FAILED', message: error.message } }, { status: 400 })
  }

  return NextResponse.json({ ok: true, success: true })
}
