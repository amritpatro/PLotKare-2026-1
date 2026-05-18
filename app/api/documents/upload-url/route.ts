import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { documentUploadSchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const parsed = documentUploadSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const ownerId = context.isAdmin && parsed.data.ownerId ? parsed.data.ownerId : context.user.id
  const objectPath = `${ownerId}/${Date.now()}-${safeFileName(parsed.data.fileName)}`
  const admin = createSupabaseAdminClient()

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
