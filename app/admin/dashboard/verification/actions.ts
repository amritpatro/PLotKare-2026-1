'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  ADMIN_TASK_PRIORITIES,
  ADMIN_VERIFICATION_ENTITY_TYPES,
  ADMIN_VERIFICATION_STATUSES,
} from '@/lib/admin/status'
import { recordAuditLog } from '@/lib/audit'
import { syncVerifiedListingForProperty, syncVerifiedListingsForSeller } from '@/lib/listing-publishing'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { upsertVerificationRequest } from '@/lib/verification-requests'

const verificationActionSchema = z.object({
  entityType: z.enum(ADMIN_VERIFICATION_ENTITY_TYPES),
  entityId: z.string().uuid(),
  status: z.enum(ADMIN_VERIFICATION_STATUSES),
  assignedEmployeeId: z.string().uuid().optional().or(z.literal('')),
  priority: z.enum(ADMIN_TASK_PRIORITIES).optional().or(z.literal('')),
  dueAt: z.string().trim().optional().or(z.literal('')),
  escalationLevel: z.coerce.number().int().min(0).max(10).optional(),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  returnSection: z.enum(['verification', 'documents']).optional().default('verification'),
})

const propertyLinkReviewSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['under_review', 'approved', 'rejected', 'needs_clarification']),
  assignedEmployeeId: z.string().uuid().optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
})

const tableByEntity = {
  property: 'properties',
  seller: 'sellers',
  owner: 'owners',
  customer: 'customers',
  document: 'property_documents',
} as const

const statusColumnByEntity = {
  property: 'verification_status',
  seller: 'verification_status',
  owner: 'verification_status',
  customer: 'kyc_status',
  document: 'verification_status',
} as const

function verificationRedirect(kind: 'success' | 'error', code: string, section: 'verification' | 'documents' = 'verification'): never {
  redirect(`/admin/dashboard/${section}?${kind}=${code}`)
}

export async function updateVerificationStatus(formData: FormData) {
  const parsed = verificationActionSchema.safeParse({
    entityType: formData.get('entityType'),
    entityId: formData.get('entityId'),
    status: formData.get('status'),
    assignedEmployeeId: formData.get('assignedEmployeeId') ?? '',
    priority: formData.get('priority') ?? '',
    dueAt: formData.get('dueAt') ?? '',
    escalationLevel: formData.get('escalationLevel') ?? undefined,
    note: formData.get('note') ?? '',
    returnSection: formData.get('returnSection') ?? undefined,
  })

  if (!parsed.success) verificationRedirect('error', 'invalid_verification_action')

  const { user } = await requirePageRole(['admin'])
  const { entityType, entityId, status, note, returnSection } = parsed.data
  const assignedEmployeeId = parsed.data.assignedEmployeeId || null
  const priority = parsed.data.priority || 'normal'
  const dueAt = parsed.data.dueAt || null
  const escalationLevel = parsed.data.escalationLevel ?? 0
  const supabase = createSupabaseAdminClient()
  const statusColumn = statusColumnByEntity[entityType]

  if (assignedEmployeeId) {
    const { data: assignee, error: assigneeError } = await supabase
      .from('employees')
      .select('id,active,employee_role')
      .eq('id', assignedEmployeeId)
      .maybeSingle()

    if (
      assigneeError ||
      !assignee ||
      !assignee.active ||
      assignee.employee_role !== 'verification_agent'
    ) {
      console.error('Verification assignee validation failed:', assigneeError)
      verificationRedirect('error', 'invalid_verification_action', returnSection)
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from(tableByEntity[entityType])
    .select(`id,${statusColumn}`)
    .eq('id', entityId)
    .maybeSingle()

  if (existingError || !existing) {
    console.error('Admin verification lookup failed:', existingError)
    verificationRedirect('error', 'verification_update_failed', returnSection)
  }

  const updatePayload: Record<string, unknown> = {
    [statusColumn]: status,
    assigned_employee_id: assignedEmployeeId,
    priority,
    due_at: dueAt,
    escalation_level: escalationLevel,
  }

  if (note) {
    updatePayload.admin_notes = note
  }
  if (entityType === 'document') {
    updatePayload.review_reason = note || null
    updatePayload.reviewed_by = user.id
    updatePayload.reviewed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from(tableByEntity[entityType])
    .update(updatePayload)
    .eq('id', entityId)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('Admin verification update failed:', error)
    verificationRedirect('error', 'verification_update_failed', returnSection)
  }

  let listingPublishResult: unknown = null
  if (entityType === 'property') {
    const { error: plotStatusError } = await supabase
      .from('plots')
      .update({ verification_status: status })
      .eq('property_id', entityId)

    if (plotStatusError) {
      console.error('Admin plot verification sync failed:', plotStatusError)
      verificationRedirect('error', 'verification_update_failed', returnSection)
    }

    try {
      listingPublishResult = await syncVerifiedListingForProperty(supabase, entityId, user.id)
    } catch (publishError) {
      console.error('Admin listing publish sync failed:', publishError)
      verificationRedirect('error', 'verification_update_failed', returnSection)
    }
  }

  if (entityType === 'seller') {
    try {
      listingPublishResult = await syncVerifiedListingsForSeller(supabase, entityId, user.id)
    } catch (publishError) {
      console.error('Seller listing publish sync failed:', publishError)
      verificationRedirect('error', 'verification_update_failed', returnSection)
    }
  }

  if (assignedEmployeeId) {
    const { error: taskError } = await supabase.from('admin_task_assignments').upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        assigned_employee_id: assignedEmployeeId,
        assigned_by: user.id,
        status: status === 'approved' || status === 'rejected' ? 'completed' : 'open',
        priority,
        due_at: dueAt,
        escalation_level: escalationLevel,
        metadata: {
          source: 'verification_action',
          verification_status: status,
        },
      },
      { onConflict: 'entity_type,entity_id,assigned_employee_id' },
    )

    if (taskError) {
      console.error('Admin verification assignment failed:', taskError)
      verificationRedirect('error', 'verification_update_failed', returnSection)
    }
  }

  await upsertVerificationRequest(supabase, {
    entityType,
    entityId,
    assignedEmployeeId,
    status,
    priority,
    dueAt,
    escalationLevel,
    adminNotes: note || null,
    metadata: {
      source: 'admin_verification_action',
      status_column: statusColumn,
    },
  })

  const previousStatus = (existing as Record<string, unknown>)[statusColumn]
  const { error: eventError } = await supabase.from('verification_events').insert({
    entity_type: entityType,
    entity_id: entityId,
    previous_status: typeof previousStatus === 'string' ? previousStatus : null,
    new_status: status,
    actor_id: user.id,
    assigned_employee_id: assignedEmployeeId,
    priority,
    due_at: dueAt,
    escalation_level: escalationLevel,
    note: note || null,
    metadata: {
      status_column: statusColumn,
    },
  })

  if (eventError) {
    console.error('Admin verification event write failed:', eventError)
    verificationRedirect('error', 'verification_update_failed', returnSection)
  }

  if (note) {
    const { error: noteError } = await supabase.from('admin_internal_notes').insert({
      entity_type: entityType,
      entity_id: entityId,
      author_id: user.id,
      note,
      visibility: assignedEmployeeId ? 'assigned_employee' : 'admin',
      metadata: {
        source: 'verification_action',
        verification_status: status,
        assigned_employee_id: assignedEmployeeId,
      },
    })

    if (noteError) {
      console.error('Admin verification internal note write failed:', noteError)
      verificationRedirect('error', 'verification_update_failed', returnSection)
    }
  }

  await recordAuditLog({
    actorId: user.id,
    action: `admin.verification.${entityType}.${status}`,
    entityType,
    entityId,
    metadata: {
      previous_status: previousStatus ?? null,
      status,
      assigned_employee_id: assignedEmployeeId,
      priority,
      due_at: dueAt,
      escalation_level: escalationLevel,
      note: note || null,
      listing_publish_result: listingPublishResult,
    },
  })

  if (entityType === 'document') {
    const { data: document } = await supabase.from('property_documents').select('uploaded_by,title').eq('id', entityId).maybeSingle()
    if (document?.uploaded_by) {
      await supabase.from('notifications').insert({
        recipient_id: document.uploaded_by,
        actor_id: user.id,
        title: 'Document review updated',
        message: `${document.title || 'Document'} is now ${status.replaceAll('_', ' ')}.`,
        category: 'verification',
        metadata: { document_id: entityId, status },
      })
    }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/documents')
  revalidatePath('/admin/dashboard/verification')
  revalidatePath('/admin/dashboard/audit')
  verificationRedirect('success', 'verification_updated', returnSection)
}

export async function reviewCustomerPropertyRequest(formData: FormData) {
  const parsed = propertyLinkReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) verificationRedirect('error', 'invalid_verification_action')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()
  const { data: request, error } = await supabase
    .from('customer_property_requests')
    .select('id,customer_id,requester_id,property_kind,property_title,address,city,state,postal_code,relationship_type,status,linked_property_id')
    .eq('id', parsed.data.requestId)
    .maybeSingle()
  if (error || !request) verificationRedirect('error', 'verification_update_failed')

  let linkedPropertyId = request.linked_property_id as string | null
  if (parsed.data.status === 'approved' && !linkedPropertyId) {
    const { data: property, error: propertyError } = await supabase.from('properties').insert({
      property_kind: request.property_kind === 'apartment' ? 'apartment' : 'plot',
      title: request.property_title,
      address: request.address,
      city: request.city,
      state: request.state,
      postal_code: request.postal_code,
      current_customer_id: request.customer_id,
      lifecycle_status: 'managed',
      verification_status: 'approved',
      created_by: request.requester_id,
    }).select('id').single()
    if (propertyError || !property) verificationRedirect('error', 'verification_update_failed')
    linkedPropertyId = property.id

    const { error: linkError } = await supabase.from('customer_property_links').upsert({
      customer_id: request.customer_id,
      property_id: property.id,
      relationship_type: request.relationship_type,
      status: 'active',
      created_by: user.id,
    }, { onConflict: 'customer_id,property_id,relationship_type' })
    if (linkError) verificationRedirect('error', 'verification_update_failed')
  }

  const assignedEmployeeId = parsed.data.assignedEmployeeId || null
  if (assignedEmployeeId) {
    const { data: assignee, error: assigneeError } = await supabase
      .from('employees')
      .select('id,active,employee_role')
      .eq('id', assignedEmployeeId)
      .maybeSingle()

    if (
      assigneeError ||
      !assignee ||
      !assignee.active ||
      assignee.employee_role !== 'verification_agent'
    ) {
      console.error('Property link reviewer validation failed:', assigneeError)
      verificationRedirect('error', 'invalid_verification_action')
    }
  }

  const { error: updateError } = await supabase.from('customer_property_requests').update({
    status: parsed.data.status,
    assigned_employee_id: assignedEmployeeId,
    linked_property_id: linkedPropertyId,
    review_notes: parsed.data.note || null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', request.id)
  if (updateError) verificationRedirect('error', 'verification_update_failed')

  await upsertVerificationRequest(supabase, {
    entityType: 'property_link_request',
    entityId: request.id,
    requesterId: request.requester_id,
    assignedEmployeeId,
    status: parsed.data.status,
    adminNotes: parsed.data.note || null,
  })
  await supabase.from('verification_events').insert({
    entity_type: 'property_link_request',
    entity_id: request.id,
    previous_status: request.status,
    new_status: parsed.data.status,
    actor_id: user.id,
    assigned_employee_id: assignedEmployeeId,
    note: parsed.data.note || null,
  })
  await supabase.from('notifications').insert({
    recipient_id: request.requester_id,
    actor_id: user.id,
    title: 'Property link request updated',
    message: `${request.property_title} is now ${parsed.data.status.replaceAll('_', ' ')}.`,
    category: 'verification',
    metadata: { request_id: request.id, property_id: linkedPropertyId },
  })
  await recordAuditLog({
    actorId: user.id,
    action: `admin.property_link_request.${parsed.data.status}`,
    entityType: 'property_link_request',
    entityId: request.id,
    metadata: { linked_property_id: linkedPropertyId, note: parsed.data.note || null },
  })

  revalidatePath('/customer/properties')
  revalidatePath('/admin/dashboard/verification')
  verificationRedirect('success', 'verification_updated')
}
