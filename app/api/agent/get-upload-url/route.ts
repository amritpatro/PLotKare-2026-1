import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  inspectionId: z.string().uuid(),
  direction: z.string().trim().min(2).max(40),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response
  if (context.profile.role !== 'employee') {
    return NextResponse.json({ ok: false, error: { code: 'FIELD_AGENT_REQUIRED', message: 'Field agent access is required.' } }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_UPLOAD_REQUEST', message: parsed.error.issues[0]?.message || 'Upload request is invalid.' } }, { status: 400 })
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
    .select('id,plot_id,assigned_employee_id,properties(owner_profile_id)')
    .eq('id', parsed.data.inspectionId)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (!inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  const ownerId = property?.owner_profile_id
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: { code: 'OWNER_REQUIRED', message: 'Inspection owner is missing.' } }, { status: 409 })
  }

  const extension = parsed.data.mimeType === 'image/png' ? 'png' : parsed.data.mimeType === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `inspections/${parsed.data.inspectionId}/${safeSegment(parsed.data.direction)}_${Date.now()}.${extension}`
  const { data: upload, error: uploadError } = await admin.storage.from('inspection-photos').createSignedUploadUrl(storagePath)
  if (uploadError || !upload?.signedUrl) {
    return NextResponse.json({ ok: false, error: { code: 'SIGNED_UPLOAD_FAILED', message: uploadError?.message || 'Could not prepare upload.' } }, { status: 400 })
  }

  const { data: photo, error: photoError } = await admin
    .from('inspection_photos')
    .insert({
      owner_id: ownerId,
      plot_id: inspection.plot_id ?? null,
      inspection_id: inspection.id,
      agent_employee_id: employee.id,
      bucket: 'inspection-photos',
      object_path: storagePath,
      mime_type: parsed.data.mimeType,
      direction: parsed.data.direction,
      subject: parsed.data.direction,
      upload_status: 'pending',
    })
    .select('id')
    .single()

  if (photoError) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_METADATA_FAILED', message: photoError.message } }, { status: 400 })
  }

  return NextResponse.json({ ok: true, uploadUrl: upload.signedUrl, token: upload.token, storagePath, photoId: photo.id })
}
