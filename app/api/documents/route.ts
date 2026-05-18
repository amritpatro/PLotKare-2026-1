import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { documentMetadataSchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

export async function GET() {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const query = context.supabase.from('documents').select('*').order('created_at', { ascending: false })
  const scopedQuery = context.isAdmin ? query : query.eq('owner_id', context.user.id)
  const { data, error } = await scopedQuery
  if (error) return apiError(error.message, 400, 'DOCUMENTS_FETCH_FAILED')

  return apiOk({ documents: data ?? [] })
}

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const parsed = documentMetadataSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const ownerId = context.isAdmin && parsed.data.ownerId ? parsed.data.ownerId : context.user.id
  const supabase = context.isAdmin ? createSupabaseAdminClient() : context.supabase
  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id: ownerId,
      plot_id: parsed.data.plotId ?? null,
      title: parsed.data.title,
      bucket: parsed.data.bucket,
      object_path: parsed.data.objectPath,
      mime_type: parsed.data.mimeType ?? null,
      size_bytes: parsed.data.sizeBytes ?? null,
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'DOCUMENT_CREATE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'document.created', entityType: 'document', entityId: data.id })
  return apiOk({ document: data }, { status: 201 })
}
