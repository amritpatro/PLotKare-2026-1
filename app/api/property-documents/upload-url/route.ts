import { z } from 'zod'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/api/auth'
import { DOCUMENT_MAX_BYTES, findDocumentRequirement, type DocumentRole } from '@/lib/documents/catalog'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const uploadSchema = z.object({
  propertyId: z.string().uuid().nullable().optional(),
  propertyRequestId: z.string().uuid().nullable().optional(),
  documentType: z.string().trim().min(2).max(80),
  fileName: z.string().trim().min(1).max(220),
  contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.coerce.number().int().positive().max(DOCUMENT_MAX_BYTES),
})

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

async function resolvePropertyScope(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string, role: string, propertyId?: string | null, propertyRequestId?: string | null) {
  if (role === 'customer') {
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle()

    if (customerError) throw customerError

    if (!propertyId) {
      if (propertyRequestId) {
        const { data: propertyRequest, error: requestError } = await admin
          .from('customer_property_requests')
          .select('id')
          .eq('id', propertyRequestId)
          .eq('requester_id', userId)
          .in('status', ['submitted', 'under_review', 'needs_clarification'])
          .maybeSingle()
        if (requestError) throw requestError
        if (!propertyRequest) throw new Error('This property request is not available for document evidence.')
        return { propertyId: null, propertyRequestId, customerId: customer?.id ?? null, plotId: null }
      }
      return { propertyId: null, propertyRequestId: null, customerId: customer?.id ?? null, plotId: null }
    }

    const { data: link, error: linkError } = await admin
      .from('customer_property_links')
      .select('property_id,customer_id')
      .eq('property_id', propertyId)
      .eq('customer_id', customer?.id ?? '00000000-0000-0000-0000-000000000000')
      .maybeSingle()

    if (linkError) throw linkError
    if (!link) throw new Error('This property is not linked to your customer account.')
    const { data: plot } = await admin.from('plots').select('id').eq('property_id', propertyId).maybeSingle()
    return { propertyId, propertyRequestId: null, customerId: customer?.id ?? null, plotId: plot?.id ?? null }
  }

  if (!propertyId) throw new Error('Choose a property before uploading this document.')

  if (role === 'land_owner') {
    const { data: property, error } = await admin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('owner_profile_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!property) throw new Error('This property is not owned by your account.')
  }

  if (role === 'plot_seller') {
    const { data: seller, error: sellerError } = await admin
      .from('sellers')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle()
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
  return { propertyId, propertyRequestId: null, customerId: null, plotId: plot?.id ?? null }
}

export async function POST(request: Request) {
  const context = await requireRoleContext(['plot_seller', 'land_owner', 'customer', 'admin'])
  if ('response' in context) return context.response

  const parsed = uploadSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const admin = createSupabaseAdminClient()

  try {
    const role: DocumentRole =
      context.profile.role === 'plot_seller' ? 'seller' : context.profile.role === 'land_owner' ? 'owner' : 'customer'
    const requirement = context.isAdmin ? null : findDocumentRequirement(role, parsed.data.documentType)
    if (!context.isAdmin && !requirement) return apiError('Select a supported document type.', 400, 'INVALID_DOCUMENT_TYPE')
    if (!context.isAdmin && requirement?.propertyScoped && !parsed.data.propertyId && role !== 'customer') {
      return apiError('Choose a property before uploading this document.', 400, 'PROPERTY_REQUIRED')
    }

    const scope = context.isAdmin
      ? { propertyId: parsed.data.propertyId ?? null, customerId: null, plotId: null }
      : await resolvePropertyScope(admin, context.user.id, context.profile.role, parsed.data.propertyId, parsed.data.propertyRequestId)

    const bucket = 'property-documents'
    const objectPath = `${context.user.id}/${Date.now()}-${safeFileName(parsed.data.fileName)}`

    const { data: upload, error: uploadError } = await admin.storage.from(bucket).createSignedUploadUrl(objectPath)
    if (uploadError) return apiError(uploadError.message, 400, 'SIGNED_UPLOAD_FAILED')

    return apiOk({
      upload,
      pendingDocument: {
        propertyId: scope.propertyId,
        propertyRequestId: 'propertyRequestId' in scope ? scope.propertyRequestId : null,
        plotId: scope.plotId,
        customerId: scope.customerId,
        documentType: parsed.data.documentType,
        title: requirement?.label ?? parsed.data.documentType,
        category: requirement?.category ?? 'Operational Documents',
        description: requirement?.description ?? null,
        requirementLevel: requirement?.required ? 'mandatory' : 'optional',
        bucket,
        objectPath,
        mimeType: parsed.data.contentType,
        sizeBytes: parsed.data.sizeBytes,
      },
    }, { status: 201 })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Document upload failed.', 400, 'DOCUMENT_UPLOAD_FAILED')
  }
}
