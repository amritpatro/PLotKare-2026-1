'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { AMENITY_CATALOG } from '@/lib/amenity-catalog'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const amenityToggleSchema = z.object({
  amenityId: z.string().min(1),
  nextActive: z.enum(['true', 'false']),
})

const amenityReviewStatuses = ['requested', 'under_review', 'approved', 'rejected', 'scheduled', 'completed'] as const

const amenityReviewSchema = z.object({
  amenityRequestId: z.string().uuid(),
  reviewStatus: z.enum(amenityReviewStatuses),
  assignedEmployeeId: z.string().uuid().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueAt: z.string().trim().optional().or(z.literal('')),
  escalationLevel: z.coerce.number().int().min(0).max(10).default(0),
  note: z.string().trim().max(1200).optional().or(z.literal('')),
})

function amenitiesRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/amenities?${kind}=${code}`)
}

function taskStatusFromReviewStatus(reviewStatus: (typeof amenityReviewStatuses)[number]) {
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

export async function toggleAmenityAvailability(formData: FormData) {
  const parsed = amenityToggleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return

  const { user } = await requirePageRole(['admin'])
  const catalogItem = AMENITY_CATALOG.find((item) => item.id === parsed.data.amenityId)
  if (!catalogItem) return

  const supabase = createSupabaseAdminClient()
  const active = parsed.data.nextActive === 'true'

  const { error } = await supabase.from('amenities').upsert(
    {
      id: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      kind: catalogItem.kind,
      amount: catalogItem.amount,
      image_path: catalogItem.image,
      active,
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error('Admin amenity toggle failed:', error)
    return
  }

  await recordAuditLog({
    actorId: user.id,
    action: active ? 'admin.amenity_enabled' : 'admin.amenity_disabled',
    entityType: 'amenity',
    metadata: { amenityId: catalogItem.id, active },
  })

  revalidatePath('/admin/dashboard/amenities')
}

export async function updateAmenityRequest(formData: FormData) {
  const parsed = amenityReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) amenitiesRedirect('error', 'invalid_amenity_update')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()
  const assignedEmployeeId = parsed.data.assignedEmployeeId || null
  const taskStatus = taskStatusFromReviewStatus(parsed.data.reviewStatus)
  const dueAt = parsed.data.dueAt || null
  const note = parsed.data.note || null

  const { data: request, error: requestError } = await supabase
    .from('active_amenities')
    .select('id,owner_id,plot_id,amenity_id,created_at')
    .eq('id', parsed.data.amenityRequestId)
    .maybeSingle()

  if (requestError || !request) {
    console.error('Amenity request lookup failed:', requestError)
    amenitiesRedirect('error', 'amenity_update_failed')
  }

  const { data: plot } = await supabase
    .from('plots')
    .select('id,property_id,plot_number,location')
    .eq('id', request.plot_id)
    .maybeSingle()

  if (assignedEmployeeId) {
    const { error: cancelExistingError } = await supabase
      .from('admin_task_assignments')
      .update({ status: 'cancelled' })
      .eq('entity_type', 'active_amenity')
      .eq('entity_id', request.id)
      .neq('assigned_employee_id', assignedEmployeeId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')

    if (cancelExistingError) {
      console.error('Amenity reassignment cancellation failed:', cancelExistingError)
      amenitiesRedirect('error', 'amenity_update_failed')
    }

    const { error: taskError } = await supabase.from('admin_task_assignments').upsert(
      {
        entity_type: 'active_amenity',
        entity_id: request.id,
        assigned_employee_id: assignedEmployeeId,
        assigned_by: user.id,
        status: taskStatus,
        priority: parsed.data.priority,
        due_at: dueAt,
        escalation_level: parsed.data.escalationLevel,
        metadata: {
          review_status: parsed.data.reviewStatus,
          review_note: note,
          amenity_id: request.amenity_id,
          plot_id: request.plot_id,
          property_id: plot?.property_id ?? null,
          requester_id: request.owner_id,
        },
      },
      { onConflict: 'entity_type,entity_id,assigned_employee_id' },
    )

    if (taskError) {
      console.error('Amenity assignment failed:', taskError)
      amenitiesRedirect('error', 'amenity_update_failed')
    }
  }

  if (note) {
    const { error: noteError } = await supabase.from('admin_internal_notes').insert({
      entity_type: 'active_amenity',
      entity_id: request.id,
      author_id: user.id,
      note,
      visibility: assignedEmployeeId ? 'assigned_employee' : 'admin',
      metadata: {
        source: 'amenity_review',
        review_status: parsed.data.reviewStatus,
        assigned_employee_id: assignedEmployeeId,
      },
    })

    if (noteError) {
      console.error('Amenity note failed:', noteError)
      amenitiesRedirect('error', 'amenity_update_failed')
    }
  }

  if (request.owner_id) {
    const { error: notificationError } = await supabase.from('notifications').insert({
      recipient_id: request.owner_id,
      actor_id: user.id,
      title: 'Amenity review updated',
      message: `${catalogLabel(request.amenity_id)} moved to ${parsed.data.reviewStatus.replaceAll('_', ' ')}.`,
      category: 'amenity',
      metadata: {
        amenity_request_id: request.id,
        amenity_id: request.amenity_id,
        review_status: parsed.data.reviewStatus,
        plot_id: request.plot_id,
        property_id: plot?.property_id ?? null,
      },
    })

    if (notificationError) {
      console.error('Amenity notification failed:', notificationError)
      amenitiesRedirect('error', 'amenity_update_failed')
    }
  }

  await recordAuditLog({
    actorId: user.id,
    action: `admin.amenity_request.${parsed.data.reviewStatus}`,
    entityType: 'active_amenity',
    entityId: request.id,
    metadata: {
      amenity_id: request.amenity_id,
      plot_id: request.plot_id,
      property_id: plot?.property_id ?? null,
      requester_id: request.owner_id,
      assigned_employee_id: assignedEmployeeId,
      priority: parsed.data.priority,
      due_at: dueAt,
      escalation_level: parsed.data.escalationLevel,
      review_note: note,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/amenities')
  revalidatePath('/employee')
  revalidatePath('/employee/amenities')
  revalidatePath('/seller/amenities')
  revalidatePath('/owner/amenities')
  revalidatePath('/customer/amenities')
  amenitiesRedirect('success', 'amenity_updated')
}

function catalogLabel(amenityId: string) {
  return AMENITY_CATALOG.find((item) => item.id === amenityId)?.name || amenityId
}
