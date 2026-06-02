import { AgentShell } from '@/components/agent/agent-shell'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { SupportTicketThreadList } from '@/components/support/support-ticket-thread-list'
import { requireFieldAgentPage } from '@/lib/agent/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createAgentSupportTicket, replyToAgentSupportTicket } from './actions'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function AgentSupportPage({ searchParams }: PageProps) {
  const agent = await requireFieldAgentPage()
  const params = (await searchParams) ?? {}
  const success = param(params, 'success')
  const error = param(params, 'error')
  const supabase = createSupabaseAdminClient()
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id,ticket_reference,subject,description,category,priority,status,created_at')
    .eq('requester_id', agent.userId)
    .order('created_at', { ascending: false })
    .limit(25)

  const ticketIds = (tickets ?? []).map((ticket) => ticket.id)
  const { data: replies } = ticketIds.length
    ? await supabase
        .from('ticket_replies')
        .select('id,ticket_id,body,visibility,created_at')
        .in('ticket_id', ticketIds)
        .eq('visibility', 'public')
        .order('created_at', { ascending: true })
    : { data: [] }

  const successMessage =
    success === 'ticket_created'
      ? 'Support ticket opened.'
      : success === 'reply_sent'
        ? 'Reply sent to support.'
        : null
  const errorMessage = error ? 'Support action failed. Check the fields and retry.' : null

  return (
    <AgentShell title="Agent support" subtitle="Raise field issues, app blockers, and GPS/camera trouble with PlotKare operations.">
      {successMessage ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}
      {errorMessage ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-[#111827]">Open a support ticket</h2>
        <form action={createAgentSupportTicket} className="mt-4 grid gap-3">
          <input name="subject" required placeholder="GPS not locking, camera issue, assignment doubt" className="min-h-11 rounded-lg border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" />
          <textarea name="description" required rows={4} placeholder="Describe what happened in the field" className="rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" />
          <select name="priority" defaultValue="normal" className="min-h-11 rounded-lg border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <PendingActionButton pendingText="Opening..." className="min-h-11 rounded-lg bg-[#C0392B] px-4 text-sm font-semibold text-white">
            Open ticket
          </PendingActionButton>
        </form>
      </section>

      <section className="mt-5 space-y-4">
        <SupportTicketThreadList tickets={tickets ?? []} replies={replies ?? []} empty="No agent support tickets yet." />
        {(tickets ?? []).map((ticket) => (
          <form key={ticket.id} action={replyToAgentSupportTicket} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#B45309]">Reply to {ticket.ticket_reference || ticket.id.slice(0, 8)}</p>
            <textarea name="body" required rows={3} placeholder="Add a field update or answer support" className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" />
            <PendingActionButton pendingText="Sending..." className="mt-2 min-h-10 rounded-lg border border-[#C0392B] px-3 text-sm font-semibold text-[#C0392B]">
              Send reply
            </PendingActionButton>
          </form>
        ))}
      </section>
    </AgentShell>
  )
}
