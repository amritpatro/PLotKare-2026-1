import { NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordAuditLog } from '@/lib/audit'

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxCompressedBytes = 900_000

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  if (context.profile.role !== 'employee') {
    return NextResponse.json({ ok: false, error: { code: 'FIELD_AGENT_REQUIRED', message: 'Field agent access is required.' } }, { status: 403 })
  }

  const { id } = await params
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_REQUIRED', message: 'Photo file is required.' } }, { status: 400 })
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_TYPE_UNSUPPORTED', message: 'Only JPEG, PNG, and WEBP photos are supported.' } }, { status: 400 })
  }

  if (file.size > maxCompressedBytes) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_TOO_LARGE', message: 'Photo must be compressed below 800KB before upload.' } }, { status: 413 })
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
    .select('id,plot_id,assigned_employee_id,properties(owner_profile_id)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Assigned inspection was not found.' } }, { status: 404 })
  }

  const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
  const ownerId = property?.owner_profile_id
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: { code: 'OWNER_REQUIRED', message: 'Inspection property owner is missing.' } }, { status: 409 })
  }

  const direction = String(form.get('direction') || 'evidence').toLowerCase()
  const subject = String(form.get('subject') || direction)
  const latitude = Number(form.get('latitude'))
  const longitude = Number(form.get('longitude'))
  const accuracy = Number(form.get('accuracy'))
  const capturedAt = String(form.get('capturedAt') || new Date().toISOString())
  const objectPath = `${ownerId}/${inspection.id}/${Date.now()}-${direction}-${safeFileName(file.name || 'evidence.jpg')}`

  const { error: uploadError } = await admin.storage
    .from('inspection-photos')
    .upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_UPLOAD_FAILED', message: uploadError.message } }, { status: 400 })
  }

  const { data: photo, error: photoError } = await admin
    .from('inspection_photos')
    .insert({
      owner_id: ownerId,
      plot_id: inspection.plot_id ?? null,
      bucket: 'inspection-photos',
      object_path: objectPath,
      mime_type: file.type,
      size_bytes: file.size,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      captured_at: capturedAt,
      caption: `${subject} (${direction})`,
    })
    .select('id,bucket,object_path,size_bytes,caption')
    .single()

  if (photoError) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_METADATA_FAILED', message: photoError.message } }, { status: 400 })
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'agent.photo_uploaded',
    entityType: 'inspection_photo',
    entityId: photo.id,
    metadata: {
      inspection_id: inspection.id,
      direction,
      subject,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
    },
  })

  return NextResponse.json({ ok: true, photo })
}
