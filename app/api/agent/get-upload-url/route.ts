import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { inspectionPhotoSubjectForDirection } from '@/lib/agent/inspection-templates'

const schema = z.object({
  inspectionId: z.string().uuid(),
  direction: z.string().trim().min(2).max(40),
  mimeType: z.enum(['image/jpeg', 'image/png']),
})

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response
  if (await isRateLimited(request, { identifier: context.user.id })) {
    return NextResponse.json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many upload requests. Please wait and try again.' } }, { status: 429 })
  }
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

  const extension = parsed.data.mimeType === 'image/png' ? 'png' : 'jpg'
  const storagePath = `inspections/${parsed.data.inspectionId}/${safeSegment(parsed.data.direction)}_${Date.now()}.${extension}`
  const { data: upload, error: uploadError } = await admin.storage.from('inspection-photos').createSignedUploadUrl(storagePath)
  if (uploadError || !upload?.signedUrl) {
    return NextResponse.json({ ok: false, error: { code: 'SIGNED_UPLOAD_FAILED', message: 'Could not prepare upload.' } }, { status: 400 })
  }

  const photoPayload = {
      owner_id: ownerId,
      plot_id: inspection.plot_id ?? null,
      inspection_id: inspection.id,
      agent_employee_id: employee.id,
      bucket: 'inspection-photos',
      object_path: storagePath,
      mime_type: parsed.data.mimeType,
      direction: parsed.data.direction,
      subject: inspectionPhotoSubjectForDirection(parsed.data.direction),
      upload_status: 'pending',
    }

  const { data: existingPhoto } = await admin
    .from('inspection_photos')
    .select('id')
    .eq('inspection_id', inspection.id)
    .eq('agent_employee_id', employee.id)
    .eq('direction', parsed.data.direction)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const write = existingPhoto?.id
    ? admin.from('inspection_photos').update(photoPayload).eq('id', existingPhoto.id).select('id').single()
    : admin.from('inspection_photos').insert(photoPayload).select('id').single()

  const { data: photo, error: photoError } = await write

  if (photoError) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_METADATA_FAILED', message: 'Could not save photo metadata.' } }, { status: 400 })
  }

  return NextResponse.json({ ok: true, uploadUrl: upload.signedUrl, token: upload.token, storagePath, photoId: photo.id })
}
