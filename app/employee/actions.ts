'use server'

import { logger } from '@/lib/monitoring/logger'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ADMIN_TASK_STATUSES, ADMIN_VERIFICATION_ENTITY_TYPES, ADMIN_VERIFICATION_STATUSES } from '@/lib/admin/status'
import { recordAuditLog } from '@/lib/audit'
import { syncVerifiedListingForProperty, syncVerifiedListingsForSeller } from '@/lib/listing-publishing'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { upsertVerificationRequest } from '@/lib/verification-requests'

const optionalNote = z
  .string()
  .trim()
  .max(1200, 'Notes must be 1200 characters or less.')
  .optional()
  .transform((value) => value || null)

const taskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(ADMIN_TASK_STATUSES),
  note: optionalNote,
})

const workUpdateSchema = z.object({
  kind: z.enum(['inspection', 'maintenance', 'support']),
  itemId: z.string().uuid(),
  status: z.string().trim().min(2),
  note: optionalNote,
  returnSection: z.enum(['support', 'operations']).optional().default('operations'),
})

const supportReplySchema = z.object({
  ticketId: z.string().uuid(),
  visibility: z.enum(['public', 'internal']),
  body: z.string().trim().min(2).max(2400),
})

const propertyLinkReviewSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['under_review', 'approved', 'rejected', 'needs_clarification']),
  note: optionalNote,
})

const verificationUpdateSchema = z.object({
  requestId: z.string().uuid(),
  entityType: z.enum(ADMIN_VERIFICATION_ENTITY_TYPES),
  entityId: z.string().uuid(),
  status: z.enum(ADMIN_VERIFICATION_STATUSES),
  note: optionalNote,
  returnSection: z.enum(['verification', 'documents']).optional().default('verification'),
})

const amenityReviewStatuses = ['requested', 'under_review', 'approved', 'rejected', 'scheduled', 'completed'] as const

const amenityReviewSchema = z.object({
  amenityRequestId: z.string().uuid(),
  reviewStatus: z.enum(amenityReviewStatuses),
  note: optionalNote,
})

const inspectionReportSchema = z.object({
  inspectionId: z.string().uuid(),
  status: z.enum(['in_progress', 'completed', 'needs_followup']),
  summary: z.string().trim().min(10, 'Write a short field summary.').max(1800),
  fieldCondition: z.enum(['good', 'watch', 'issue_found', 'critical']),
  issueSeverity: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
  actionRequired: z.preprocess((value) => value === 'on' || value === 'true', z.boolean()),
  photoEvidence: z.string().trim().max(2400).optional().transform((value) => value || null),
  nextVisitAt: z.string().trim().optional().transform((value) => value || null),
})

const workStatusByKind = {
  inspection: ['requested', 'scheduled', 'in_progress', 'completed', 'cancelled', 'needs_followup'],
  maintenance: ['open', 'assigned', 'in_progress', 'waiting_on_vendor', 'resolved', 'closed', 'cancelled'],
  support: ['open', 'assigned', 'in_progress', 'waiting_on_customer', 'waiting_on_admin', 'escalated', 'resolved', 'closed'],
} as const

const tableByKind = {
  inspection: 'inspections',
  maintenance: 'maintenance_requests',
  support: 'support_tickets',
} as const

const tableByVerificationEntity = {
  property: 'properties',
  seller: 'sellers',
  owner: 'owners',
  customer: 'customers',
  document: 'property_documents',
} as const

const statusColumnByVerificationEntity = {
  property: 'verification_status',
  seller: 'verification_status',
  owner: 'verification_status',
  customer: 'kyc_status',
  document: 'verification_status',
} as const

type EmployeeContext = Awaited<ReturnType<typeof getEmployeeContext>>

function employeeRedirect(kind: 'success' | 'error', code: string, section = 'tasks'): never {
  const routeBySection: Record<string, string> = {
    tasks: '/employee/tasks',
    operations: '/employee/operations',
    inspections: '/employee/inspections',
    support: '/employee/support',
    verification: '/employee/verification',
    amenities: '/employee/amenities',
    documents: '/employee/documents',
  }
  redirect(`${routeBySection[section] ?? '/employee'}?${kind}=${code}`)
}

function nowIso() {
  return new Date().toISOString()
}

function compactEvidence(value: string | null) {
  if (!value) return []

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((value, index) => ({
      kind: value.startsWith('http') ? 'url' : 'storage_path',
      value,
      caption: `Evidence ${index + 1}`,
      captured_at: nowIso(),
    }))
}

async function getEmployeeContext() {
  const { user } = await requirePageRole(['employee', 'admin'])
  const supabase = createSupabaseAdminClient()
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id,profile_id,active,employee_role')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!employee || !employee.active) throw new Error('Active employee record not found.')

  return { supabase, user, employee }
}

async function createEmployeeWorkLog(
  context: EmployeeContext,
  values: {
    entityType: string
    entityId?: string | null
    action: string
    previousStatus?: string | null
    newStatus?: string | null
    note?: string | null
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await context.supabase.from('employee_work_logs').insert({
    employee_id: context.employee.id,
    profile_id: context.user.id,
    entity_type: values.entityType,
    entity_id: values.entityId ?? null,
    action: values.action,
    previous_status: values.previousStatus ?? null,
    new_status: values.newStatus ?? null,
    note: values.note ?? null,
    metadata: values.metadata ?? {},
  })

  if (error) throw error
}

export async function updateMyAdminTask(formData: FormData) {
  const parsed = taskUpdateSchema.safeParse({
    taskId: formData.get('taskId'),
    status: formData.get('status'),
    note: formData.get('note') ?? undefined,
  })

  if (!parsed.success) employeeRedirect('error', 'invalid_task_update')

  let taskId: string | null = null
  let failure: string | null = null

  try {
    const context = await getEmployeeContext()
    const { supabase, user, employee } = context
    const { data: existing, error: existingError } = await supabase
      .from('admin_task_assignments')
      .select('id,status,priority,due_at,assigned_employee_id,entity_type,entity_id')
      .eq('id', parsed.data.taskId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) throw new Error('Assigned task not found.')

    const updates: Record<string, unknown> = {
      status: parsed.data.status,
      last_employee_note: parsed.data.note,
      completed_at: parsed.data.status === 'completed' ? nowIso() : null,
    }

    const { error } = await supabase
      .from('admin_task_assignments')
      .update(updates)
      .eq('id', existing.id)
      .eq('assigned_employee_id', employee.id)

    if (error) throw error
    taskId = existing.id

    await createEmployeeWorkLog(context, {
      entityType: 'admin_task_assignment',
      entityId: existing.id,
      action: 'task_status_updated',
      previousStatus: existing.status,
      newStatus: parsed.data.status,
      note: parsed.data.note,
      metadata: {
        priority: existing.priority,
        due_at: existing.due_at,
        source_entity_type: existing.entity_type,
        source_entity_id: existing.entity_id,
      },
    })

    await recordAuditLog({
      actorId: user.id,
      action: 'employee.admin_task.updated',
      entityType: 'admin_task_assignment',
      entityId: existing.id,
      metadata: {
        previous_status: existing.status,
        status: parsed.data.status,
        employee_note: parsed.data.note,
        assigned_employee_id: employee.id,
        source_entity_type: existing.entity_type,
        source_entity_id: existing.entity_id,
      },
    })
  } catch (error) {
    logger.error('Employee task update failed:', error)
    failure = 'task_update_failed'
  }

  if (failure || !taskId) employeeRedirect('error', failure ?? 'task_update_failed')

  revalidatePath('/employee')
  revalidatePath('/admin/dashboard/employees')
  revalidatePath('/admin/dashboard')
  employeeRedirect('success', 'task_updated')
}

export async function updateAssignedWorkItem(formData: FormData) {
  const parsed = workUpdateSchema.safeParse({
    kind: formData.get('kind'),
    itemId: formData.get('itemId'),
    status: formData.get('status'),
    note: formData.get('note') ?? undefined,
    returnSection: formData.get('returnSection') ?? undefined,
  })

  if (!parsed.success) employeeRedirect('error', 'invalid_work_update', 'operations')

  const allowedStatuses: readonly string[] = workStatusByKind[parsed.data.kind]
  if (!allowedStatuses.includes(parsed.data.status)) {
    employeeRedirect('error', 'invalid_work_update', parsed.data.returnSection)
  }

  let itemId: string | null = null
  let failure: string | null = null

  try {
    const context = await getEmployeeContext()
    const { supabase, user, employee } = context
    const table = tableByKind[parsed.data.kind]
    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select('id,status,assigned_employee_id,property_id')
      .eq('id', parsed.data.itemId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) throw new Error('Assigned work item not found.')

    const timestamp = nowIso()
    const updates: Record<string, unknown> = {
      status: parsed.data.status,
      employee_notes: parsed.data.note,
    }

    if (parsed.data.kind === 'inspection' && parsed.data.status === 'completed') {
      updates.completed_at = timestamp
    }

    if (parsed.data.kind === 'maintenance' && ['resolved', 'closed'].includes(parsed.data.status)) {
      updates.completed_at = timestamp
    }

    if (parsed.data.kind === 'support' && ['resolved', 'closed'].includes(parsed.data.status)) {
      updates.resolved_at = timestamp
    }

    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', existing.id)
      .eq('assigned_employee_id', employee.id)

    if (error) throw error
    itemId = existing.id

    await createEmployeeWorkLog(context, {
      entityType: table,
      entityId: existing.id,
      action: `${parsed.data.kind}_status_updated`,
      previousStatus: existing.status,
      newStatus: parsed.data.status,
      note: parsed.data.note,
      metadata: {
        property_id: existing.property_id,
      },
    })

    await recordAuditLog({
      actorId: user.id,
      action: `employee.${parsed.data.kind}.updated`,
      entityType: table,
      entityId: existing.id,
      metadata: {
        previous_status: existing.status,
        status: parsed.data.status,
        employee_note: parsed.data.note,
        assigned_employee_id: employee.id,
        property_id: existing.property_id,
      },
    })
  } catch (error) {
    logger.error('Employee work update failed:', error)
    failure = 'work_update_failed'
  }

  if (failure || !itemId) employeeRedirect('error', failure ?? 'work_update_failed', parsed.data.returnSection)

  revalidatePath('/employee')
  revalidatePath('/admin/dashboard/employees')
  revalidatePath('/admin/dashboard')
  employeeRedirect('success', 'work_updated', parsed.data.returnSection)
}

export async function replyToAssignedSupportTicket(formData: FormData) {
  const parsed = supportReplySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) employeeRedirect('error', 'invalid_support_reply', 'support')

  try {
    const context = await getEmployeeContext()
    const { supabase, user, employee } = context
    if (employee.employee_role !== 'support_staff') throw new Error('Only support staff may reply to tickets.')

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('id,requester_id,subject,assigned_employee_id')
      .eq('id', parsed.data.ticketId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()
    if (error || !ticket) throw new Error('Assigned ticket not found.')

    const { error: replyError } = await supabase.from('ticket_replies').insert({
      ticket_id: ticket.id,
      author_id: user.id,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
    })
    if (replyError) throw replyError

    if (parsed.data.visibility === 'public' && ticket.requester_id) {
      await supabase.from('notifications').insert({
        recipient_id: ticket.requester_id,
        actor_id: user.id,
        title: 'Support reply posted',
        message: `${ticket.subject} has a new PlotKare response.`,
        category: 'support',
        metadata: { ticket_id: ticket.id },
      })
    }

    await createEmployeeWorkLog(context, {
      entityType: 'support_ticket',
      entityId: ticket.id,
      action: `ticket_reply_${parsed.data.visibility}`,
      note: parsed.data.visibility === 'internal' ? parsed.data.body : null,
    })
    await recordAuditLog({
      actorId: user.id,
      action: `employee.support_ticket.reply_${parsed.data.visibility}`,
      entityType: 'support_ticket',
      entityId: ticket.id,
    })
  } catch (error) {
    logger.error('Employee support reply failed:', error)
    employeeRedirect('error', 'support_reply_failed', 'support')
  }

  revalidatePath('/employee/support')
  revalidatePath('/admin/dashboard/support')
  revalidatePath('/seller/support')
  revalidatePath('/owner/support')
  revalidatePath('/customer/support')
  employeeRedirect('success', 'support_replied', 'support')
}

export async function reviewAssignedPropertyLinkRequest(formData: FormData) {
  const parsed = propertyLinkReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) employeeRedirect('error', 'invalid_verification_update', 'verification')

  try {
    const context = await getEmployeeContext()
    const { supabase, user, employee } = context
    if (employee.employee_role !== 'verification_agent') {
      throw new Error('Only verification agents may review property link requests.')
    }

    const { data: request, error } = await supabase
      .from('customer_property_requests')
      .select('id,customer_id,requester_id,property_kind,property_title,address,city,state,postal_code,relationship_type,status,linked_property_id,assigned_employee_id')
      .eq('id', parsed.data.requestId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()
    if (error || !request) throw new Error('Assigned property link request not found.')

    let linkedPropertyId = request.linked_property_id as string | null
    if (parsed.data.status === 'approved' && !linkedPropertyId) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
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
        })
        .select('id')
        .single()
      if (propertyError || !property) throw new Error('Verified property could not be created.')
      linkedPropertyId = property.id

      const { error: linkError } = await supabase.from('customer_property_links').upsert({
        customer_id: request.customer_id,
        property_id: property.id,
        relationship_type: request.relationship_type,
        status: 'active',
        created_by: user.id,
      }, { onConflict: 'customer_id,property_id,relationship_type' })
      if (linkError) throw linkError
    }

    const { error: updateError } = await supabase
      .from('customer_property_requests')
      .update({
        status: parsed.data.status,
        linked_property_id: linkedPropertyId,
        review_notes: parsed.data.note ?? null,
        reviewed_by: user.id,
        reviewed_at: nowIso(),
      })
      .eq('id', request.id)
      .eq('assigned_employee_id', employee.id)
    if (updateError) throw updateError

    await upsertVerificationRequest(supabase, {
      entityType: 'property_link_request',
      entityId: request.id,
      requesterId: request.requester_id,
      assignedEmployeeId: employee.id,
      status: parsed.data.status,
      adminNotes: parsed.data.note ?? null,
      metadata: { source: 'employee_property_link_review', linked_property_id: linkedPropertyId },
    })

    const { error: eventError } = await supabase.from('verification_events').insert({
      entity_type: 'property_link_request',
      entity_id: request.id,
      previous_status: request.status,
      new_status: parsed.data.status,
      actor_id: user.id,
      assigned_employee_id: employee.id,
      note: parsed.data.note ?? null,
      metadata: { source: 'employee_property_link_review', linked_property_id: linkedPropertyId },
    })
    if (eventError) throw eventError

    await supabase.from('notifications').insert({
      recipient_id: request.requester_id,
      actor_id: user.id,
      title: 'Property link request updated',
      message: `${request.property_title} is now ${parsed.data.status.replaceAll('_', ' ')}.`,
      category: 'verification',
      metadata: { request_id: request.id, property_id: linkedPropertyId },
    })

    await createEmployeeWorkLog(context, {
      entityType: 'customer_property_request',
      entityId: request.id,
      action: `property_link_request_${parsed.data.status}`,
      previousStatus: request.status,
      newStatus: parsed.data.status,
      note: parsed.data.note,
      metadata: { linked_property_id: linkedPropertyId },
    })
    await recordAuditLog({
      actorId: user.id,
      action: `employee.property_link_request.${parsed.data.status}`,
      entityType: 'property_link_request',
      entityId: request.id,
      metadata: { assigned_employee_id: employee.id, linked_property_id: linkedPropertyId, note: parsed.data.note ?? null },
    })
  } catch (error) {
    logger.error('Employee property link review failed:', error)
    employeeRedirect('error', 'verification_update_failed', 'verification')
  }

  revalidatePath('/employee/verification')
  revalidatePath('/admin/dashboard/verification')
  revalidatePath('/customer/properties')
  employeeRedirect('success', 'verification_updated', 'verification')
}

export async function updateAssignedVerificationStatus(formData: FormData) {
  const parsed = verificationUpdateSchema.safeParse({
    requestId: formData.get('requestId'),
    entityType: formData.get('entityType'),
    entityId: formData.get('entityId'),
    status: formData.get('status'),
    note: formData.get('note') ?? undefined,
    returnSection: formData.get('returnSection') ?? undefined,
  })

  if (!parsed.success) employeeRedirect('error', 'invalid_verification_update', 'verification')

  let requestId: string | null = null
  let failure: string | null = null

  try {
    const context = await getEmployeeContext()
    const { supabase, user, employee } = context
    if (employee.employee_role !== 'verification_agent') {
      throw new Error('Only verification agents can update verification requests.')
    }

    const { data: request, error: requestError } = await supabase
      .from('verification_requests')
      .select('id,entity_type,entity_id,status,priority,due_at,escalation_level,assigned_employee_id')
      .eq('id', parsed.data.requestId)
      .eq('entity_type', parsed.data.entityType)
      .eq('entity_id', parsed.data.entityId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()

    if (requestError) throw requestError
    if (!request) throw new Error('Assigned verification request not found.')

    const statusColumn = statusColumnByVerificationEntity[parsed.data.entityType]
    const table = tableByVerificationEntity[parsed.data.entityType]
    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select(`id,${statusColumn}`)
      .eq('id', parsed.data.entityId)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) throw new Error('Verification target not found.')

    const updatePayload: Record<string, unknown> = {
      [statusColumn]: parsed.data.status,
      assigned_employee_id: employee.id,
    }
    if (parsed.data.note) updatePayload.admin_notes = parsed.data.note
    if (parsed.data.entityType === 'document') {
      updatePayload.review_reason = parsed.data.note ?? null
      updatePayload.reviewed_by = user.id
      updatePayload.reviewed_at = nowIso()
    }

    const { error: targetError } = await supabase.from(table).update(updatePayload).eq('id', parsed.data.entityId)
    if (targetError) throw targetError

    let listingPublishResult: unknown = null
    if (parsed.data.entityType === 'property') {
      const { error: plotStatusError } = await supabase
        .from('plots')
        .update({ verification_status: parsed.data.status })
        .eq('property_id', parsed.data.entityId)

      if (plotStatusError) throw plotStatusError
      listingPublishResult = await syncVerifiedListingForProperty(supabase, parsed.data.entityId, user.id)
    }

    if (parsed.data.entityType === 'seller') {
      listingPublishResult = await syncVerifiedListingsForSeller(supabase, parsed.data.entityId, user.id)
    }

    await upsertVerificationRequest(supabase, {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      assignedEmployeeId: employee.id,
      status: parsed.data.status,
      priority: request.priority ?? 'normal',
      dueAt: request.due_at ?? null,
      escalationLevel: request.escalation_level ?? 0,
      adminNotes: parsed.data.note ?? null,
      metadata: {
        source: 'employee_verification_action',
        status_column: statusColumn,
      },
    })

    const previousStatus = (existing as Record<string, unknown>)[statusColumn]
    const { error: eventError } = await supabase.from('verification_events').insert({
      entity_type: parsed.data.entityType,
      entity_id: parsed.data.entityId,
      previous_status: typeof previousStatus === 'string' ? previousStatus : null,
      new_status: parsed.data.status,
      actor_id: user.id,
      assigned_employee_id: employee.id,
      priority: request.priority ?? 'normal',
      due_at: request.due_at ?? null,
      escalation_level: request.escalation_level ?? 0,
      note: parsed.data.note ?? null,
      metadata: {
        source: 'employee_verification_action',
        status_column: statusColumn,
      },
    })

    if (eventError) throw eventError

    await createEmployeeWorkLog(context, {
      entityType: 'verification_requests',
      entityId: request.id,
      action: 'verification_status_updated',
      previousStatus: request.status,
      newStatus: parsed.data.status,
      note: parsed.data.note,
      metadata: {
        source_entity_type: parsed.data.entityType,
        source_entity_id: parsed.data.entityId,
        listing_publish_result: listingPublishResult,
      },
    })

    await recordAuditLog({
      actorId: user.id,
      action: `employee.verification.${parsed.data.entityType}.${parsed.data.status}`,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      metadata: {
        request_id: request.id,
        previous_status: previousStatus ?? null,
        status: parsed.data.status,
        employee_id: employee.id,
        note: parsed.data.note ?? null,
        listing_publish_result: listingPublishResult,
      },
    })

    if (parsed.data.entityType === 'document') {
      const { data: document } = await supabase.from('property_documents').select('uploaded_by,title').eq('id', parsed.data.entityId).maybeSingle()
      if (document?.uploaded_by) {
        await supabase.from('notifications').insert({
          recipient_id: document.uploaded_by,
          actor_id: user.id,
          title: 'Document review updated',
          message: `${document.title || 'Document'} is now ${parsed.data.status.replaceAll('_', ' ')}.`,
          category: 'verification',
          metadata: { document_id: parsed.data.entityId, status: parsed.data.status },
        })
      }
    }

    requestId = request.id
  } catch (error) {
    logger.error('Employee verification update failed:', error)
    failure = 'verification_update_failed'
  }

  if (failure || !requestId) employeeRedirect('error', failure ?? 'verification_update_failed', parsed.data.returnSection)

  revalidatePath('/employee')
  revalidatePath('/employee/documents')
  revalidatePath('/employee/verification')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/verification')
  revalidatePath('/admin/dashboard/listings')
  employeeRedirect('success', 'verification_updated', parsed.data.returnSection)
}

function taskStatusFromAmenityReview(reviewStatus: (typeof amenityReviewStatuses)[number]) {
  switch (reviewStatus) {
    case 'requested':
      return 'open'
    case 'under_review':
    case 'scheduled':
      return 'in_progress'
    case 'rejected':
      return 'blocked'
    case 'approved':
    case 'completed':
      return 'completed'
    default:
      return 'open'
  }
}

export async function updateAssignedAmenityReview(formData: FormData) {
  const parsed = amenityReviewSchema.safeParse({
    amenityRequestId: formData.get('amenityRequestId'),
    reviewStatus: formData.get('reviewStatus'),
    note: formData.get('note') ?? undefined,
  })

  if (!parsed.success) employeeRedirect('error', 'invalid_amenity_update', 'amenities')

  let requestId: string | null = null
  let failure: string | null = null

  try {
    const context = await getEmployeeContext()
    const { supabase, user, employee } = context
    const { data: task, error: taskError } = await supabase
      .from('admin_task_assignments')
      .select('id,entity_id,status,priority,due_at,escalation_level,assigned_employee_id,metadata')
      .eq('entity_type', 'active_amenity')
      .eq('entity_id', parsed.data.amenityRequestId)
      .eq('assigned_employee_id', employee.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (taskError) throw taskError
    if (!task) throw new Error('Assigned amenity review request not found.')

    const taskMetadata =
      task.metadata && typeof task.metadata === 'object' && !Array.isArray(task.metadata)
        ? { ...(task.metadata as Record<string, unknown>) }
        : {}
    const previousReviewStatus =
      typeof taskMetadata.review_status === 'string' ? (taskMetadata.review_status as string) : task.status

    taskMetadata.review_status = parsed.data.reviewStatus
    taskMetadata.review_note = parsed.data.note ?? null

    const { error: updateTaskError } = await supabase
      .from('admin_task_assignments')
      .update({
        status: taskStatusFromAmenityReview(parsed.data.reviewStatus),
        last_employee_note: parsed.data.note ?? null,
        completed_at:
          parsed.data.reviewStatus === 'approved' || parsed.data.reviewStatus === 'completed' || parsed.data.reviewStatus === 'rejected'
            ? nowIso()
            : null,
        metadata: taskMetadata,
      })
      .eq('id', task.id)
      .eq('assigned_employee_id', employee.id)

    if (updateTaskError) throw updateTaskError

    if (parsed.data.note) {
      const adminSupabase = createSupabaseAdminClient()
      const { error: noteError } = await adminSupabase.from('admin_internal_notes').insert({
        entity_type: 'active_amenity',
        entity_id: parsed.data.amenityRequestId,
        author_id: user.id,
        note: parsed.data.note,
        visibility: 'assigned_employee',
        metadata: {
          source: 'employee_amenity_review',
          review_status: parsed.data.reviewStatus,
          assigned_employee_id: employee.id,
        },
      })

      if (noteError) throw noteError
    }

    await createEmployeeWorkLog(context, {
      entityType: 'active_amenity',
      entityId: parsed.data.amenityRequestId,
      action: 'amenity_review_updated',
      previousStatus: previousReviewStatus,
      newStatus: parsed.data.reviewStatus,
      note: parsed.data.note,
      metadata: {
        task_id: task.id,
        priority: task.priority,
        due_at: task.due_at,
        escalation_level: task.escalation_level,
      },
    })

    await recordAuditLog({
      actorId: user.id,
      action: `employee.amenity_review.${parsed.data.reviewStatus}`,
      entityType: 'active_amenity',
      entityId: parsed.data.amenityRequestId,
      metadata: {
        task_id: task.id,
        assigned_employee_id: employee.id,
        priority: task.priority,
        due_at: task.due_at,
        escalation_level: task.escalation_level,
        note: parsed.data.note ?? null,
      },
    })

    requestId = parsed.data.amenityRequestId
  } catch (error) {
    logger.error('Employee amenity review update failed:', error)
    failure = 'amenity_update_failed'
  }

  if (failure || !requestId) employeeRedirect('error', failure ?? 'amenity_update_failed', 'amenities')

  revalidatePath('/employee')
  revalidatePath('/employee/amenities')
  revalidatePath('/admin/dashboard/amenities')
  revalidatePath('/seller/amenities')
  revalidatePath('/owner/amenities')
  revalidatePath('/customer/amenities')
  employeeRedirect('success', 'amenity_updated', 'amenities')
}

export async function submitInspectionReport(formData: FormData) {
  const parsed = inspectionReportSchema.safeParse({
    inspectionId: formData.get('inspectionId'),
    status: formData.get('status'),
    summary: formData.get('summary'),
    fieldCondition: formData.get('fieldCondition'),
    issueSeverity: formData.get('issueSeverity'),
    actionRequired: formData.get('actionRequired'),
    photoEvidence: formData.get('photoEvidence') ?? undefined,
    nextVisitAt: formData.get('nextVisitAt') ?? undefined,
  })

  if (!parsed.success) employeeRedirect('error', 'invalid_inspection_report', 'inspections')

  let inspectionId: string | null = null
  let failure: string | null = null

  try {
    const context = await getEmployeeContext()
    const { supabase, user, employee } = context
    const { data: existing, error: existingError } = await supabase
      .from('inspections')
      .select('id,status,assigned_employee_id,property_id,plot_id,photos,properties(owner_profile_id,title)')
      .eq('id', parsed.data.inspectionId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) throw new Error('Assigned inspection not found.')

    const currentPhotos = Array.isArray(existing.photos) ? existing.photos : []
    const submittedEvidence = compactEvidence(parsed.data.photoEvidence).map((item) => ({
      ...item,
      submitted_by: user.id,
      inspection_id: existing.id,
    }))
    const timestamp = nowIso()
    const updates: Record<string, unknown> = {
      status: parsed.data.status,
      summary: parsed.data.summary,
      field_condition: parsed.data.fieldCondition,
      issue_severity: parsed.data.issueSeverity,
      action_required: parsed.data.actionRequired,
      employee_notes: parsed.data.summary,
      next_visit_at: parsed.data.nextVisitAt ? new Date(parsed.data.nextVisitAt).toISOString() : null,
      photos: [...currentPhotos, ...submittedEvidence],
    }

    if (parsed.data.status === 'completed') {
      updates.completed_at = timestamp
    }

    const { error } = await supabase
      .from('inspections')
      .update(updates)
      .eq('id', existing.id)
      .eq('assigned_employee_id', employee.id)

    if (error) throw error
    inspectionId = existing.id

    const property = Array.isArray(existing.properties) ? existing.properties[0] : existing.properties
    const ownerId = property?.owner_profile_id

    if (ownerId && ['completed', 'needs_followup'].includes(parsed.data.status)) {
      const month = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
      const { error: reportError } = await supabase.from('inspection_reports').insert({
        owner_id: ownerId,
        plot_id: existing.plot_id ?? null,
        month,
        agent_name: user.email ?? 'PlotKare field agent',
        finding: parsed.data.summary,
        status: parsed.data.status === 'completed' ? 'Completed' : 'Action Needed',
      })

      if (reportError) throw reportError
    }

    await createEmployeeWorkLog(context, {
      entityType: 'inspections',
      entityId: existing.id,
      action: 'inspection_report_submitted',
      previousStatus: existing.status,
      newStatus: parsed.data.status,
      note: parsed.data.summary,
      metadata: {
        property_id: existing.property_id,
        plot_id: existing.plot_id,
        field_condition: parsed.data.fieldCondition,
        issue_severity: parsed.data.issueSeverity,
        action_required: parsed.data.actionRequired,
        evidence_count: submittedEvidence.length,
      },
    })

    await recordAuditLog({
      actorId: user.id,
      action: 'employee.inspection.report_submitted',
      entityType: 'inspections',
      entityId: existing.id,
      metadata: {
        previous_status: existing.status,
        status: parsed.data.status,
        assigned_employee_id: employee.id,
        property_id: existing.property_id,
        field_condition: parsed.data.fieldCondition,
        issue_severity: parsed.data.issueSeverity,
        action_required: parsed.data.actionRequired,
      },
    })
  } catch (error) {
    logger.error('Employee inspection report failed:', error)
    failure = 'inspection_report_failed'
  }

  if (failure || !inspectionId) employeeRedirect('error', failure ?? 'inspection_report_failed', 'inspections')

  revalidatePath('/employee')
  revalidatePath('/admin/dashboard/employees')
  revalidatePath('/admin/dashboard/properties')
  revalidatePath('/owner')
  employeeRedirect('success', 'inspection_reported', 'inspections')
}
