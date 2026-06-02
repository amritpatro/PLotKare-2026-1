'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { requireFieldAgentPage } from '@/lib/agent/server'
import { notifyOperationsOfTicket } from '@/lib/support-notifications'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const ticketSchema = z.object({
  subject: z.string().trim().min(3),
  description: z.string().trim().min(5),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(2),
})

function supportRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/agent/support?${kind}=${code}`)
}

export async function createAgentSupportTicket(formData: FormData) {
  const parsed = ticketSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) supportRedirect('error', 'invalid_ticket')

  const agent = await requireFieldAgentPage()
  const supabase = createSupabaseAdminClient()

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      requester_id: agent.userId,
      assigned_employee_id: agent.employeeId,
      subject: parsed.data.subject,
      description: parsed.data.description,
      priority: parsed.data.priority,
      category: 'field_agent',
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !ticket) {
    console.error('Agent support ticket failed:', error)
    supportRedirect('error', 'ticket_failed')
  }

  await notifyOperationsOfTicket(supabase, {
    ticketId: ticket.id,
    requesterId: agent.userId,
    subject: parsed.data.subject,
    priority: parsed.data.priority,
  })

  await recordAuditLog({
    actorId: agent.userId,
    action: 'agent.support_ticket_created',
    entityType: 'support_ticket',
    entityId: ticket.id,
    metadata: { priority: parsed.data.priority },
  })

  revalidatePath('/agent/support')
  supportRedirect('success', 'ticket_created')
}

export async function replyToAgentSupportTicket(formData: FormData) {
  const parsed = replySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) supportRedirect('error', 'invalid_reply')

  const agent = await requireFieldAgentPage()
  const supabase = createSupabaseAdminClient()
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('id,requester_id,subject')
    .eq('id', parsed.data.ticketId)
    .eq('requester_id', agent.userId)
    .maybeSingle()

  if (ticketError || !ticket) {
    console.error('Agent support reply lookup failed:', ticketError)
    supportRedirect('error', 'reply_failed')
  }

  const { error } = await supabase.from('ticket_replies').insert({
    ticket_id: ticket.id,
    author_id: agent.userId,
    author_employee_id: agent.employeeId,
    body: parsed.data.body,
    visibility: 'public',
  })

  if (error) {
    console.error('Agent support reply failed:', error)
    supportRedirect('error', 'reply_failed')
  }

  await notifyOperationsOfTicket(supabase, {
    ticketId: ticket.id,
    requesterId: agent.userId,
    subject: ticket.subject,
    priority: 'normal',
  })

  revalidatePath('/agent/support')
  supportRedirect('success', 'reply_sent')
}
