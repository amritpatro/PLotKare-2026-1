import { z } from 'zod'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/api/auth'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { upsertVerificationRequest } from '@/lib/verification-requests'

const paramsSchema = z.object({ id: z.string().uuid() })
const actionSchema = z.object({
  action: z.literal('request_withdrawal'),
  reason: z.string().trim().min(5).max(500),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoleContext(['plot_seller', 'land_owner', 'customer', 'admin'])
  if ('response' in context) return context.response

  const parsedParams = paramsSchema.safeParse(await params)
  if (!parsedParams.success) return apiError('Document ID is invalid.', 400, 'INVALID_DOCUMENT_ID')
  const parsed = actionSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const admin = createSupabaseAdminClient()
  const { data: document, error } = await admin
    .from('property_documents')
    .select('id,uploaded_by,verification_status')
    .eq('id', parsedParams.data.id)
    .maybeSingle()

  if (error || !document) return apiError('Document was not found.', 404, 'DOCUMENT_NOT_FOUND')
  if (!context.isAdmin && document.uploaded_by !== context.user.id) {
    return apiError('You cannot withdraw this document.', 403, 'FORBIDDEN')
  }
  if (['withdrawal_requested', 'withdrawn', 'expired'].includes(document.verification_status)) {
    return apiError('This document cannot be withdrawn again.', 409, 'INVALID_DOCUMENT_STATE')
  }

  const requestedAt = new Date().toISOString()
  const { error: updateError } = await admin
    .from('property_documents')
    .update({
      verification_status: 'withdrawal_requested',
      withdrawal_requested_at: requestedAt,
      review_reason: parsed.data.reason,
    })
    .eq('id', document.id)
  if (updateError) return apiError('Withdrawal request could not be saved.', 400, 'WITHDRAWAL_FAILED')

  await upsertVerificationRequest(admin, {
    entityType: 'document',
    entityId: document.id,
    requesterId: document.uploaded_by,
    status: 'withdrawal_requested',
    adminNotes: parsed.data.reason,
    metadata: { workflow_action: 'withdrawal_requested', requested_at: requestedAt },
  })

  await admin.from('verification_events').insert({
    entity_type: 'document',
    entity_id: document.id,
    previous_status: document.verification_status,
    new_status: 'withdrawal_requested',
    actor_id: context.user.id,
    note: parsed.data.reason,
    metadata: { requested_at: requestedAt },
  })

  await recordAuditLog({
    actorId: context.user.id,
    action: 'document.withdrawal_requested',
    entityType: 'document',
    entityId: document.id,
    metadata: { previous_status: document.verification_status, reason: parsed.data.reason },
  })

  return apiOk({ id: document.id, status: 'withdrawal_requested' })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoleContext(['plot_seller', 'land_owner', 'customer', 'admin'])
  if ('response' in context) return context.response

  const parsedParams = paramsSchema.safeParse(await params)
  if (!parsedParams.success) return apiError('Document ID is invalid.', 400, 'INVALID_DOCUMENT_ID')

  const admin = createSupabaseAdminClient()
  const { data: document } = await admin
    .from('property_documents')
    .select('id,uploaded_by,bucket,object_path,upload_finalized_at')
    .eq('id', parsedParams.data.id)
    .maybeSingle()
  if (!document) return apiError('Document was not found.', 404, 'DOCUMENT_NOT_FOUND')
  if (!context.isAdmin && document.uploaded_by !== context.user.id) return apiError('Forbidden.', 403, 'FORBIDDEN')
  if (document.upload_finalized_at) {
    return apiError('Submitted evidence is retained. Request withdrawal instead.', 409, 'USE_WITHDRAWAL')
  }

  if (document.object_path) await admin.storage.from(document.bucket).remove([document.object_path])
  const { error } = await admin.from('property_documents').delete().eq('id', document.id)
  if (error) return apiError('Draft could not be deleted.', 400, 'DELETE_FAILED')

  await recordAuditLog({
    actorId: context.user.id,
    action: 'document.draft_deleted',
    entityType: 'document',
    entityId: document.id,
  })
  return apiOk({ id: document.id, deleted: true })
}
