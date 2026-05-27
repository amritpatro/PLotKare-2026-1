import { z } from 'zod'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/api/auth'
import { DOCUMENT_MAX_BYTES, findDocumentRequirement, type DocumentRole } from '@/lib/documents/catalog'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { upsertVerificationRequest } from '@/lib/verification-requests'

const finalizeSchema = z.object({
  propertyId: z.string().uuid().nullable(),
  propertyRequestId: z.string().uuid().nullable().optional(),
  plotId: z.string().uuid().nullable(),
  customerId: z.string().uuid().nullable(),
  documentType: z.string().trim().min(2).max(80),
  bucket: z.literal('property-documents'),
  objectPath: z.string().trim().min(5).max(500),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.coerce.number().int().positive().max(DOCUMENT_MAX_BYTES),
  replacesDocumentId: z.string().uuid().nullable().optional(),
})

async function resolveAuthorizedScope(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  profileRole: string,
  requirement: ReturnType<typeof findDocumentRequirement> | null,
  propertyId: string | null,
  propertyRequestId: string | null,
) {
  if (profileRole === 'customer') {
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer) throw new Error('A customer profile is required for document uploads.')

    if (!requirement?.propertyScoped) {
      return { propertyId: null, propertyRequestId: null, plotId: null, customerId: customer.id }
    }

    if (propertyRequestId) {
      const { data: propertyRequest, error } = await admin
        .from('customer_property_requests')
        .select('id')
        .eq('id', propertyRequestId)
        .eq('requester_id', userId)
        .in('status', ['submitted', 'under_review', 'needs_clarification'])
        .maybeSingle()
      if (error) throw error
      if (!propertyRequest) throw new Error('This property request is not available for document evidence.')
      return { propertyId: null, propertyRequestId, plotId: null, customerId: customer.id }
    }

    if (!propertyId) throw new Error('Select a linked property or pending request for this document.')
    const { data: link, error } = await admin
      .from('customer_property_links')
      .select('property_id')
      .eq('property_id', propertyId)
      .eq('customer_id', customer.id)
      .maybeSingle()
    if (error) throw error
    if (!link) throw new Error('This property is not linked to your customer account.')
    const { data: plot } = await admin.from('plots').select('id').eq('property_id', propertyId).maybeSingle()
    return { propertyId, propertyRequestId: null, plotId: plot?.id ?? null, customerId: customer.id }
  }

  if (!propertyId) throw new Error('Choose a property before uploading this document.')
  if (profileRole === 'land_owner') {
    const { data: property, error } = await admin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('owner_profile_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!property) throw new Error('This property is not owned by your account.')
  }
  if (profileRole === 'plot_seller') {
    const { data: seller, error: sellerError } = await admin.from('sellers').select('id').eq('profile_id', userId).maybeSingle()
    if (sellerError) throw sellerError
    const { data: property, error } = await admin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('seller_id', seller?.id ?? '00000000-0000-0000-0000-000000000000')
      .maybeSingle()
    if (error) throw error
    if (!property) throw new Error('This property is not attached to your seller account.')
  }
  const { data: plot } = await admin.from('plots').select('id').eq('property_id', propertyId).maybeSingle()
  return { propertyId, propertyRequestId: null, plotId: plot?.id ?? null, customerId: null }
}

export async function POST(request: Request) {
  const context = await requireRoleContext(['plot_seller', 'land_owner', 'customer', 'admin'])
  if ('response' in context) return context.response

  const parsed = finalizeSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  if (!parsed.data.objectPath.startsWith(`${context.user.id}/`)) {
    return apiError('Uploaded file path is not owned by this account.', 403, 'FORBIDDEN')
  }

  const role: DocumentRole =
    context.profile.role === 'plot_seller' ? 'seller' : context.profile.role === 'land_owner' ? 'owner' : 'customer'
  const requirement = context.isAdmin ? null : findDocumentRequirement(role, parsed.data.documentType)
  if (!context.isAdmin && !requirement) return apiError('Select a supported document type.', 400, 'INVALID_DOCUMENT_TYPE')

  const admin = createSupabaseAdminClient()
  let scope = {
    propertyId: parsed.data.propertyId,
    propertyRequestId: parsed.data.propertyRequestId ?? null,
    plotId: parsed.data.plotId,
    customerId: parsed.data.customerId,
  }
  try {
    if (!context.isAdmin) {
      scope = await resolveAuthorizedScope(
        admin,
        context.user.id,
        context.profile.role,
        requirement,
        parsed.data.propertyId,
        parsed.data.propertyRequestId ?? null,
      )
    }
    if (parsed.data.replacesDocumentId && !context.isAdmin) {
      const { data: replaced, error: replacementError } = await admin
        .from('property_documents')
        .select('id')
        .eq('id', parsed.data.replacesDocumentId)
        .eq('uploaded_by', context.user.id)
        .eq('document_type', parsed.data.documentType)
        .maybeSingle()
      if (replacementError) throw replacementError
      if (!replaced) throw new Error('Replacement document does not belong to your upload history.')
    }
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Document scope could not be verified.', 403, 'DOCUMENT_SCOPE_FORBIDDEN')
  }

  const { data: objects, error: objectError } = await admin.storage
    .from(parsed.data.bucket)
    .list(context.user.id, { search: parsed.data.objectPath.slice(context.user.id.length + 1), limit: 1 })
  if (objectError || !objects?.some((object) => `${context.user.id}/${object.name}` === parsed.data.objectPath)) {
    return apiError('Upload did not finish. Please choose the file and try again.', 400, 'UPLOAD_NOT_FINALIZED')
  }

  const { data: document, error } = await admin
    .from('property_documents')
    .insert({
      property_id: scope.propertyId,
      property_request_id: scope.propertyRequestId,
      plot_id: scope.plotId,
      customer_id: scope.customerId,
      uploaded_by: context.user.id,
      document_type: parsed.data.documentType,
      title: requirement?.label ?? parsed.data.documentType,
      category: requirement?.category ?? 'Operational Documents',
      description: requirement?.description ?? null,
      requirement_level: requirement?.required ? 'mandatory' : 'optional',
      bucket: parsed.data.bucket,
      object_path: parsed.data.objectPath,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.sizeBytes,
      upload_finalized_at: new Date().toISOString(),
      replaces_document_id: parsed.data.replacesDocumentId ?? null,
      verification_status: 'submitted',
      visibility: context.profile.role === 'customer' ? 'customer' : context.profile.role === 'plot_seller' ? 'seller' : 'owner',
    })
    .select('id,bucket,object_path')
    .single()

  if (error || !document) return apiError(error?.message ?? 'Document metadata could not be saved.', 400, 'DOCUMENT_METADATA_FAILED')

  await upsertVerificationRequest(admin, {
    entityType: 'document',
    entityId: document.id,
    requesterId: context.user.id,
    status: 'submitted',
    priority: 'normal',
    metadata: { document_type: parsed.data.documentType, property_id: scope.propertyId, property_request_id: scope.propertyRequestId },
  })
  await recordAuditLog({
    actorId: context.user.id,
    action: 'document.submitted',
    entityType: 'document',
    entityId: document.id,
    metadata: { document_type: parsed.data.documentType, property_id: scope.propertyId, property_request_id: scope.propertyRequestId },
  })

  return apiOk({ document }, { status: 201 })
}
