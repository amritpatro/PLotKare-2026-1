import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk } from '@/lib/api/response'

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const { error: fetchError, data: doc } = await context.supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !doc) {
    return apiError('Document not found.', 404, 'NOT_FOUND')
  }

  if (doc.owner_id !== context.user.id && !context.isAdmin) {
    return apiError('Unauthorized to delete this document.', 403, 'FORBIDDEN')
  }

  const { error: deleteError } = await context.supabase.from('documents').delete().eq('id', params.id)
  if (deleteError) return apiError(deleteError.message, 400, 'DELETE_FAILED')

  return apiOk({ deleted: true })
}
