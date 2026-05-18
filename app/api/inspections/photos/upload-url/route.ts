import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { inspectionUploadSchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const parsed = inspectionUploadSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const ownerId = context.isAdmin && parsed.data.ownerId ? parsed.data.ownerId : context.user.id
  if (!context.isAdmin) {
    const { data: plot, error: plotError } = await context.supabase
      .from('plots')
      .select('id')
      .eq('id', parsed.data.plotId)
      .eq('owner_id', context.user.id)
      .single()

    if (plotError || !plot) return apiError('Plot not found for this account.', 404, 'PLOT_NOT_FOUND')
  }

  const objectPath = `${ownerId}/${parsed.data.plotId}/${Date.now()}-${safeFileName(parsed.data.fileName)}`
  const admin = createSupabaseAdminClient()
  const { data: upload, error: uploadError } = await admin.storage
    .from('inspection-photos')
    .createSignedUploadUrl(objectPath)

  if (uploadError) return apiError(uploadError.message, 400, 'SIGNED_UPLOAD_FAILED')

  const { data: photo, error: photoError } = await admin
    .from('inspection_photos')
    .insert({
      owner_id: ownerId,
      plot_id: parsed.data.plotId,
      report_id: parsed.data.reportId ?? null,
      bucket: 'inspection-photos',
      object_path: objectPath,
      mime_type: parsed.data.contentType,
      size_bytes: parsed.data.sizeBytes ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      captured_at: parsed.data.capturedAt ?? null,
      caption: parsed.data.caption ?? null,
    })
    .select('*')
    .single()

  if (photoError) return apiError(photoError.message, 400, 'PHOTO_METADATA_FAILED')

  await recordAuditLog({
    actorId: context.user.id,
    action: 'inspection_photo.upload_url_created',
    entityType: 'inspection_photo',
    entityId: photo.id,
    metadata: { objectPath },
  })

  return apiOk({ upload, photo }, { status: 201 })
}
