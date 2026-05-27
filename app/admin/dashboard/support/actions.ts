'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const supportStatuses = ['open', 'assigned', 'in_progress', 'waiting_on_customer', 'waiting_on_admin', 'escalated', 'resolved', 'closed'] as const
const priorities = ['low', 'normal', 'high', 'urgent'] as const

const updateSupportSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(supportStatuses),
  assignedEmployeeId: z.string().uuid().optional().or(z.literal('')),
  priority: z.enum(priorities),
  note: z.string().trim().max(1200).optional().or(z.literal('')),
})

const replySchema = z.object({
  ticketId: z.string().uuid(),
  visibility: z.enum(['public', 'internal']),
  body: z.string().trim().min(2).max(2400),
})

function supportRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/support?${kind}=${code}`)
}

export async function updateSupportTicket(formData: FormData) {
  const parsed = updateSupportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) supportRedirect('error', 'invalid_support_update')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()
  const assignedEmployeeId = parsed.data.assignedEmployeeId || null
  const note = parsed.data.note || null

  const { data: existing, error: existingError } = await supabase
    .from('support_tickets')
    .select('id,requester_id,status,priority,assigned_employee_id,property_id,subject')
    .eq('id', parsed.data.ticketId)
    .maybeSingle()

  if (existingError || !existing) {
    console.error('Support ticket lookup failed:', existingError)
    supportRedirect('error', 'support_update_failed')
  }

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigned_employee_id: assignedEmployeeId,
      employee_notes: note,
      resolved_at: parsed.data.status === 'resolved' || parsed.data.status === 'closed' ? new Date().toISOString() : null,
    })
    .eq('id', existing.id)

  if (updateError) {
    console.error('Support ticket update failed:', updateError)
    supportRedirect('error', 'support_update_failed')
  }

  if (assignedEmployeeId) {
    const { error: taskError } = await supabase.from('admin_task_assignments').upsert(
      {
        entity_type: 'support_ticket',
        entity_id: existing.id,
        assigned_employee_id: assignedEmployeeId,
        assigned_by: user.id,
        status: parsed.data.status === 'resolved' || parsed.data.status === 'closed' ? 'completed' : parsed.data.status === 'in_progress' ? 'in_progress' : 'open',
        priority: parsed.data.priority,
        metadata: {
          source: 'admin_support_update',
          support_status: parsed.data.status,
          subject: existing.subject,
        },
      },
      { onConflict: 'entity_type,entity_id,assigned_employee_id' },
    )

    if (taskError) {
      console.error('Support assignment task failed:', taskError)
      supportRedirect('error', 'support_update_failed')
    }
  }

  if (note) {
    const { error: noteError } = await supabase.from('admin_internal_notes').insert({
      entity_type: 'support_ticket',
      entity_id: existing.id,
      author_id: user.id,
      note,
      visibility: assignedEmployeeId ? 'assigned_employee' : 'admin',
      metadata: {
        source: 'support_update',
        support_status: parsed.data.status,
      },
    })

    if (noteError) {
      console.error('Support note write failed:', noteError)
      supportRedirect('error', 'support_update_failed')
    }
  }

  if (existing.requester_id) {
    const { error: notificationError } = await supabase.from('notifications').insert({
      recipient_id: existing.requester_id,
      actor_id: user.id,
      title: 'Support ticket updated',
      message: `${existing.subject} moved to ${parsed.data.status.replaceAll('_', ' ')}.`,
      category: 'support',
      metadata: {
        ticket_id: existing.id,
        status: parsed.data.status,
        priority: parsed.data.priority,
      },
    })

    if (notificationError) {
      console.error('Support notification failed:', notificationError)
      supportRedirect('error', 'support_update_failed')
    }
  }

  await recordAuditLog({
    actorId: user.id,
    action: `admin.support_ticket.${parsed.data.status}`,
    entityType: 'support_ticket',
    entityId: existing.id,
    metadata: {
      previous_status: existing.status,
      status: parsed.data.status,
      previous_priority: existing.priority,
      priority: parsed.data.priority,
      previous_assigned_employee_id: existing.assigned_employee_id,
      assigned_employee_id: assignedEmployeeId,
      note,
      property_id: existing.property_id,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/support')
  revalidatePath('/employee')
  revalidatePath('/employee/support')
  revalidatePath('/seller/support')
  revalidatePath('/owner/support')
  revalidatePath('/customer/support')
  supportRedirect('success', 'support_updated')
}

export async function replyToSupportTicket(formData: FormData) {
  const parsed = replySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) supportRedirect('error', 'invalid_support_reply')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('id,requester_id,subject,property_id')
    .eq('id', parsed.data.ticketId)
    .maybeSingle()

  if (ticketError || !ticket) {
    console.error('Support ticket reply lookup failed:', ticketError)
    supportRedirect('error', 'support_reply_failed')
  }

  const { error: replyError } = await supabase.from('ticket_replies').insert({
    ticket_id: ticket.id,
    author_id: user.id,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
  })

  if (replyError) {
    console.error('Support reply insert failed:', replyError)
    supportRedirect('error', 'support_reply_failed')
  }

  if (parsed.data.visibility === 'public' && ticket.requester_id) {
    const { error: notificationError } = await supabase.from('notifications').insert({
      recipient_id: ticket.requester_id,
      actor_id: user.id,
      title: 'Support reply posted',
      message: `${ticket.subject} has a new PlotKare response.`,
      category: 'support',
      metadata: {
        ticket_id: ticket.id,
        visibility: parsed.data.visibility,
      },
    })

    if (notificationError) {
      console.error('Support reply notification failed:', notificationError)
      supportRedirect('error', 'support_reply_failed')
    }
  }

  await recordAuditLog({
    actorId: user.id,
    action: `admin.support_ticket.reply_${parsed.data.visibility}`,
    entityType: 'support_ticket',
    entityId: ticket.id,
    metadata: {
      property_id: ticket.property_id,
      visibility: parsed.data.visibility,
    },
  })

  revalidatePath('/admin/dashboard/support')
  revalidatePath('/seller/support')
  revalidatePath('/owner/support')
  revalidatePath('/customer/support')
  supportRedirect('success', 'support_replied')
}
