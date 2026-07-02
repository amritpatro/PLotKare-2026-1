import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { documentUploadSchema } from '@/lib/validation/app'
import { requireRoleContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { isRateLimited } from '@/lib/api/rate-limit'

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response
  if (await isRateLimited(request, { identifier: context.user.id })) {
    return apiError('Too many upload requests. Please wait and try again.', 429, 'RATE_LIMITED')
  }

  const parsed = documentUploadSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const ownerId = context.isAdmin && parsed.data.ownerId ? parsed.data.ownerId : context.user.id
  const objectPath = `${ownerId}/${Date.now()}-${safeFileName(parsed.data.fileName)}`
  const admin = createSupabaseAdminClient()

  if (parsed.data.plotId) {
    const plotQuery = admin.from('plots').select('id,owner_id').eq('id', parsed.data.plotId)
    const scopedPlotQuery = context.isAdmin ? plotQuery : plotQuery.eq('owner_id', context.user.id)
    const { data: plot, error: plotError } = await scopedPlotQuery.maybeSingle()
    if (plotError || !plot || plot.owner_id !== ownerId) {
      return apiError('This plot is not available for document upload.', 403, 'PLOT_SCOPE_FORBIDDEN')
    }
  }

  const { data: upload, error: uploadError } = await admin.storage
    .from(parsed.data.bucket)
    .createSignedUploadUrl(objectPath)

  if (uploadError) return apiError(uploadError.message, 400, 'SIGNED_UPLOAD_FAILED')

  const { data: document, error: documentError } = await admin
    .from('documents')
    .insert({
      owner_id: ownerId,
      plot_id: parsed.data.plotId ?? null,
      title: parsed.data.title,
      bucket: parsed.data.bucket,
      object_path: objectPath,
      mime_type: parsed.data.contentType,
      size_bytes: parsed.data.sizeBytes ?? null,
    })
    .select('*')
    .single()

  if (documentError) return apiError(documentError.message, 400, 'DOCUMENT_METADATA_FAILED')

  return apiOk({ upload, document }, { status: 201 })
}
