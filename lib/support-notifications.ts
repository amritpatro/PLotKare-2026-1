import type { SupabaseClient } from '@supabase/supabase-js'

type TicketNotificationInput = {
  ticketId: string
  requesterId: string
  subject: string
  priority: string
}

export async function notifyOperationsOfTicket(
  supabase: SupabaseClient,
  input: TicketNotificationInput,
) {
  const [{ data: admins }, { data: supportEmployees }] = await Promise.all([
    supabase.from('profiles').select('id').eq('role', 'admin'),
    supabase.from('employees').select('profile_id').eq('active', true).eq('employee_role', 'support_staff'),
  ])

  const recipientIds = new Set<string>()
  admins?.forEach((row) => row.id && recipientIds.add(row.id))
  supportEmployees?.forEach((row) => row.profile_id && recipientIds.add(row.profile_id))

  if (recipientIds.size === 0) return

  await supabase.from('notifications').insert(
    Array.from(recipientIds).map((recipientId) => ({
      recipient_id: recipientId,
      actor_id: input.requesterId,
      title: 'New support ticket',
      message: `${input.subject} (${input.priority} priority)`,
      category: 'support',
      metadata: {
        ticket_id: input.ticketId,
        priority: input.priority,
      },
    })),
  )
}
