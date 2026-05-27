type SupportTicket = {
  id: string
  ticket_reference?: string | null
  subject: string
  description?: string | null
  category?: string | null
  priority: string | null
  status: string | null
  created_at: string | null
}

type SupportReply = {
  id: string
  ticket_id: string
  body: string
  visibility: string | null
  created_at: string | null
}

function date(value: string | null | undefined) {
  return value ? value.slice(0, 10) : 'Pending'
}

function badge(value: string | null | undefined) {
  return (
    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
      {String(value ?? 'open').replaceAll('_', ' ')}
    </span>
  )
}

export function SupportTicketThreadList({
  tickets,
  replies = [],
  empty = 'No support tickets raised yet.',
}: {
  tickets: SupportTicket[]
  replies?: SupportReply[]
  empty?: string
}) {
  if (tickets.length === 0) {
    return <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">{empty}</div>
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => {
        const thread = replies.filter((reply) => reply.ticket_id === ticket.id && reply.visibility === 'public')
        return (
          <article key={ticket.id} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C0392B]">
                  {ticket.ticket_reference || `Ticket ${ticket.id.slice(0, 8).toUpperCase()}`}
                </p>
                <h3 className="mt-2 font-serif text-xl font-semibold text-[#1F2937]">{ticket.subject}</h3>
              </div>
              <div className="flex flex-wrap gap-2">{badge(ticket.priority)}{badge(ticket.status)}</div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">{ticket.description || 'No issue description was supplied.'}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">
              {ticket.category || 'general'} · Opened {date(ticket.created_at)}
            </p>
            {thread.length ? (
              <div className="mt-4 space-y-3 border-t border-[#F3F4F6] pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Conversation</p>
                {thread.map((reply) => (
                  <div key={reply.id} className="rounded-lg bg-[#F9FAFB] px-4 py-3">
                    <p className="text-sm leading-6 text-[#4B5563]">{reply.body}</p>
                    <p className="mt-2 text-xs text-[#9CA3AF]">{date(reply.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
