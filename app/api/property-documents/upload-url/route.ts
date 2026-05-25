import { z } from 'zod'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { upsertVerificationRequest } from '@/lib/verification-requests'

const uploadSchema = z.object({
  propertyId: z.string().uuid().nullable().optional(),
  documentType: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  fileName: z.string().trim().min(1).max(220),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().positive().max(15 * 1024 * 1024),
})

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

async function resolvePropertyScope(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string, role: string, propertyId?: string | null) {
  if (role === 'customer') {
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle()

    if (customerError) throw customerError

    if (!propertyId) {
      return { propertyId: null, customerId: customer?.id ?? null, plotId: null }
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
    return { propertyId, customerId: customer?.id ?? null, plotId: plot?.id ?? null }
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
  return { propertyId, customerId: null, plotId: plot?.id ?? null }
}

export async function POST(request: Request) {
  const context = await requireRoleContext(['plot_seller', 'land_owner', 'customer', 'admin'])
  if ('response' in context) return context.response

  const parsed = uploadSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const admin = createSupabaseAdminClient()

  try {
    const scope = context.isAdmin
      ? { propertyId: parsed.data.propertyId ?? null, customerId: null, plotId: null }
      : await resolvePropertyScope(admin, context.user.id, context.profile.role, parsed.data.propertyId)

    const bucket = 'property-documents'
    const objectPath = `${context.user.id}/${Date.now()}-${safeFileName(parsed.data.fileName)}`

    const { data: upload, error: uploadError } = await admin.storage.from(bucket).createSignedUploadUrl(objectPath)
    if (uploadError) return apiError(uploadError.message, 400, 'SIGNED_UPLOAD_FAILED')

    const { data: document, error: documentError } = await admin
      .from('property_documents')
      .insert({
        property_id: scope.propertyId,
        plot_id: scope.plotId,
        customer_id: scope.customerId,
        uploaded_by: context.user.id,
        document_type: parsed.data.documentType,
        title: parsed.data.title,
        bucket,
        object_path: objectPath,
        mime_type: parsed.data.contentType,
        size_bytes: parsed.data.sizeBytes,
        verification_status: 'submitted',
        visibility: context.profile.role === 'customer' ? 'customer' : context.profile.role === 'plot_seller' ? 'seller' : 'owner',
      })
      .select('id,bucket,object_path')
      .single()

    if (documentError) return apiError(documentError.message, 400, 'DOCUMENT_METADATA_FAILED')

    await upsertVerificationRequest(admin, {
      entityType: 'document',
      entityId: document.id,
      requesterId: context.user.id,
      status: 'submitted',
      priority: 'normal',
      metadata: {
        document_type: parsed.data.documentType,
        property_id: scope.propertyId,
      },
    })

    return apiOk({ upload, document }, { status: 201 })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Document upload failed.', 400, 'DOCUMENT_UPLOAD_FAILED')
  }
}
