import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleContext } from '@/lib/api/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

function forbidden(message = 'You do not have access to this document.') {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    },
    { status: 403 },
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireRoleContext(['plot_seller', 'land_owner', 'customer', 'employee', 'admin'])
  if ('response' in context) return context.response
  if (await isRateLimited(request, { identifier: context.user.id })) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many document access requests. Please wait and try again.',
        },
      },
      { status: 429 },
    )
  }

  const parsedParams = paramsSchema.safeParse(await params)
  if (!parsedParams.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_DOCUMENT_ID',
          message: 'Document ID is invalid.',
        },
      },
      { status: 400 },
    )
  }

  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') === 'download' ? 'download' : 'preview'
  const admin = createSupabaseAdminClient()

  const { data: document, error: documentError } = await admin
    .from('property_documents')
    .select('id,property_id,customer_id,uploaded_by,assigned_employee_id,bucket,object_path,title')
    .eq('id', parsedParams.data.id)
    .maybeSingle()

  if (documentError || !document) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found.',
        },
      },
      { status: 404 },
    )
  }

  let allowed = context.isAdmin

  if (!allowed && document.uploaded_by === context.user.id) {
    allowed = true
  }

  if (!allowed && context.profile.role === 'employee') {
    const { data: employee } = await admin
      .from('employees')
      .select('id,active,employee_role')
      .eq('profile_id', context.user.id)
      .maybeSingle()

    const canReviewDocuments =
      Boolean(employee?.id) &&
      employee?.active !== false &&
      employee?.employee_role === 'verification_agent'

    if (canReviewDocuments && document.assigned_employee_id === employee?.id) {
      allowed = true
    } else if (canReviewDocuments) {
      const { data: verificationRequest } = await admin
        .from('verification_requests')
        .select('id')
        .eq('entity_type', 'document')
        .eq('entity_id', document.id)
        .eq('assigned_employee_id', employee?.id)
        .maybeSingle()

      allowed = Boolean(verificationRequest)
    }
  }

  if (!allowed && context.profile.role === 'customer') {
    const { data: customer } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', context.user.id)
      .maybeSingle()

    if (customer?.id && document.customer_id === customer.id) {
      allowed = true
    } else if (document.property_id && customer?.id) {
      const { data: link } = await admin
        .from('customer_property_links')
        .select('id')
        .eq('property_id', document.property_id)
        .eq('customer_id', customer.id)
        .maybeSingle()

      allowed = Boolean(link)
    }
  }

  if (!allowed && context.profile.role === 'land_owner' && document.property_id) {
    const { data: property } = await admin
      .from('properties')
      .select('id')
      .eq('id', document.property_id)
      .eq('owner_profile_id', context.user.id)
      .maybeSingle()

    allowed = Boolean(property)
  }

  if (!allowed && context.profile.role === 'plot_seller' && document.property_id) {
    const { data: seller } = await admin
      .from('sellers')
      .select('id')
      .eq('profile_id', context.user.id)
      .maybeSingle()

    if (seller?.id) {
      const { data: property } = await admin
        .from('properties')
        .select('id')
        .eq('id', document.property_id)
        .eq('seller_id', seller.id)
        .maybeSingle()

      allowed = Boolean(property)
    }
  }

  if (!allowed) {
    return forbidden()
  }

  const signedResult = await admin.storage.from(document.bucket).createSignedUrl(document.object_path, 90, {
    download: mode === 'download' ? `${document.title || 'plotkare-document'}` : undefined,
  })

  if (signedResult.error || !signedResult.data?.signedUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SIGNED_URL_FAILED',
          message: 'Could not prepare secure document access.',
        },
      },
      { status: 500 },
    )
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: context.isAdmin ? 'document.admin_accessed' : 'document.accessed',
    entityType: 'document',
    entityId: document.id,
    metadata: {
      mode,
      role: context.profile.role,
      property_id: document.property_id,
      customer_id: document.customer_id,
    },
  })

  return NextResponse.redirect(signedResult.data.signedUrl, { status: 302 })
}
