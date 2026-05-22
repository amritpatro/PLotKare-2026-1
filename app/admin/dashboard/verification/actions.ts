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

function verificationRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/verification?${kind}=${code}`)
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
  })

  if (!parsed.success) verificationRedirect('error', 'invalid_verification_action')

  const { user } = await requirePageRole(['admin'])
  const { entityType, entityId, status, note } = parsed.data
  const assignedEmployeeId = parsed.data.assignedEmployeeId || null
  const priority = parsed.data.priority || 'normal'
  const dueAt = parsed.data.dueAt || null
  const escalationLevel = parsed.data.escalationLevel ?? 0
  const supabase = createSupabaseAdminClient()
  const statusColumn = statusColumnByEntity[entityType]

  const { data: existing, error: existingError } = await supabase
    .from(tableByEntity[entityType])
    .select(`id,${statusColumn}`)
    .eq('id', entityId)
    .maybeSingle()

  if (existingError || !existing) {
    console.error('Admin verification lookup failed:', existingError)
    verificationRedirect('error', 'verification_update_failed')
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

  const { data, error } = await supabase
    .from(tableByEntity[entityType])
    .update(updatePayload)
    .eq('id', entityId)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('Admin verification update failed:', error)
    verificationRedirect('error', 'verification_update_failed')
  }

  let listingPublishResult: unknown = null
  if (entityType === 'property') {
    const { error: plotStatusError } = await supabase
      .from('plots')
      .update({ verification_status: status })
      .eq('property_id', entityId)

    if (plotStatusError) {
      console.error('Admin plot verification sync failed:', plotStatusError)
      verificationRedirect('error', 'verification_update_failed')
    }

    try {
      listingPublishResult = await syncVerifiedListingForProperty(supabase, entityId, user.id)
    } catch (publishError) {
      console.error('Admin listing publish sync failed:', publishError)
      verificationRedirect('error', 'verification_update_failed')
    }
  }

  if (entityType === 'seller') {
    try {
      listingPublishResult = await syncVerifiedListingsForSeller(supabase, entityId, user.id)
    } catch (publishError) {
      console.error('Seller listing publish sync failed:', publishError)
      verificationRedirect('error', 'verification_update_failed')
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
      verificationRedirect('error', 'verification_update_failed')
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
    verificationRedirect('error', 'verification_update_failed')
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
      verificationRedirect('error', 'verification_update_failed')
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

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/verification')
  revalidatePath('/admin/dashboard/audit')
  verificationRedirect('success', 'verification_updated')
}
