import { Suspense } from 'react'
import { replyToSupportTicket, updateSupportTicket } from './actions'
import { CustomerContextPanel, CustomerContextPanelSkeleton } from '@/components/admin/customer-context-panel'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/status-badge'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

const successMessages = {
  support_updated: 'Support ticket updated successfully.',
  support_replied: 'Support reply saved and notifications refreshed.',
} as const

const errorMessages = {
  invalid_support_update: 'Invalid support update. Refresh and try again.',
  invalid_support_reply: 'Invalid support reply.',
  support_update_failed: 'Support ticket could not be updated.',
  support_reply_failed: 'Support reply could not be saved.',
} as const

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] : value
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleString('en-IN')
}

// use shared StatusBadge component

export default async function AdminSupportPage({ searchParams }: PageProps) {
  await requirePageRole(['admin'])
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const successCode = getSearchParam(params, 'success') as keyof typeof successMessages | undefined
  const errorCode = getSearchParam(params, 'error') as keyof typeof errorMessages | undefined

  const [{ data: tickets }, { data: employees }, { data: replies }, { data: notes }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id,ticket_reference,category,requester_id,assigned_employee_id,property_id,subject,description,priority,status,due_at,escalation_level,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('employees')
      .select('id,employee_role,profiles(full_name,email)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ticket_replies')
      .select('id,ticket_id,body,visibility,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('admin_internal_notes')
      .select('id,entity_id,note,created_at')
      .eq('entity_type', 'support_ticket')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const requesterIds = Array.from(new Set((tickets ?? []).map((ticket: any) => ticket.requester_id).filter(Boolean)))
  const propertyIds = Array.from(new Set((tickets ?? []).map((ticket: any) => ticket.property_id).filter(Boolean)))

  const [{ data: requesterProfiles }, { data: properties }] = await Promise.all([
    requesterIds.length
      ? supabase
          .from('profiles')
          .select('id,full_name,email,phone,role')
          .in('id', requesterIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? supabase
          .from('properties')
          .select('id,title,city,state')
          .in('id', propertyIds)
      : Promise.resolve({ data: [] }),
  ])

  const employeeOptions = (employees ?? []).map((employee: any) => {
    const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
    return {
      id: employee.id as string,
      label: `${profile?.full_name || profile?.email || employee.id} · ${String(employee.employee_role).replaceAll('_', ' ')}`,
    }
  })
  const employeeLabelById = new Map(employeeOptions.map((employee) => [employee.id, employee.label]))
  const requesterById = new Map((requesterProfiles ?? []).map((profile: any) => [profile.id, profile]))
  const propertyById = new Map((properties ?? []).map((property: any) => [property.id, property]))

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Support operations</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">Live support desk</h1>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
            Assign tickets, update operational status, leave internal notes, and push public replies into requester-facing support flows.
          </p>
        </div>
      </div>

      {successCode ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessages[successCode]}
        </div>
      ) : null}
      {errorCode ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessages[errorCode]}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Open', (tickets ?? []).filter((ticket: any) => ticket.status === 'open').length],
          ['Assigned', (tickets ?? []).filter((ticket: any) => ticket.status === 'assigned').length],
          ['In progress', (tickets ?? []).filter((ticket: any) => ticket.status === 'in_progress').length],
          ['Resolved/closed', (tickets ?? []).filter((ticket: any) => ticket.status === 'resolved' || ticket.status === 'closed').length],
        ].map(([label, value]) => (
          <div key={label} className={cardClass}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-6">
        {(tickets ?? []).length === 0 ? (
          <div className={cardClass}>
            <p className="text-sm text-[#6B7280]">No support tickets are open right now.</p>
          </div>
        ) : null}

        {(tickets ?? []).map((ticket: any) => {
          const requester = requesterById.get(ticket.requester_id)
          const property = propertyById.get(ticket.property_id)
          const thread = (replies ?? []).filter((reply: any) => reply.ticket_id === ticket.id).reverse()
          const internalNotes = (notes ?? []).filter((note: any) => note.entity_id === ticket.id).reverse()

          return (
            <div key={ticket.id} className={cardClass} data-support-ticket-id={ticket.id}>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(460px,1fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">{ticket.subject}</h2>
                    <StatusBadge status={ticket.status} />
                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#C0392B]">
                    {ticket.ticket_reference || `Ticket ${ticket.id.slice(0, 8).toUpperCase()}`} · {ticket.category || 'general'}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#4B5563]">{ticket.description}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-[#F9FAFB] px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Requester</p>
                      <p className="mt-1 text-sm font-semibold text-[#1F2937]">
                        {requester?.full_name || requester?.email || 'Requester'}
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {[requester?.email, requester?.phone, requester?.role].filter(Boolean).join(' · ') || 'Contact pending'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#F9FAFB] px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Property</p>
                      <p className="mt-1 text-sm font-semibold text-[#1F2937]">
                        {property?.title || 'Account-level ticket'}
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {property ? [property.city, property.state].filter(Boolean).join(', ') : 'No property linked'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Assigned employee</p>
                      <p className="mt-1 text-sm text-[#1F2937]">{employeeLabelById.get(ticket.assigned_employee_id) || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Created</p>
                      <p className="mt-1 text-sm text-[#1F2937]">{formatDateTime(ticket.created_at)}</p>
                    </div>
                  </div>

                  {thread.length ? (
                    <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Conversation thread</p>
                      {thread.map((reply: any) => <p key={reply.id} className="mt-2 text-sm leading-6 text-[#4B5563]"><span className="font-mono text-[10px] uppercase text-[#9CA3AF]">{reply.visibility}:</span> {reply.body}</p>)}
                    </div>
                  ) : null}

                  {internalNotes.length ? (
                    <div className="mt-4 rounded-lg border border-dashed border-[#E5E7EB] bg-white px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Internal notes</p>
                      {internalNotes.map((note: any) => <p key={note.id} className="mt-2 text-sm leading-6 text-[#4B5563]">{note.note}</p>)}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  {ticket.requester_id ? (
                    <Suspense fallback={<CustomerContextPanelSkeleton />}>
                      <CustomerContextPanel userId={ticket.requester_id} />
                    </Suspense>
                  ) : null}
                  <form action={updateSupportTicket} className="grid gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <textarea
                      name="note"
                      rows={3}
                      defaultValue=""
                      className={inputClass}
                      placeholder="Internal operational note"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <select name="assignedEmployeeId" defaultValue={ticket.assigned_employee_id ?? ''} className={inputClass}>
                        <option value="">No assignee</option>
                        {employeeOptions.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.label}
                          </option>
                        ))}
                      </select>
                      <select name="priority" defaultValue={ticket.priority} className={inputClass}>
                        {['low', 'normal', 'high', 'urgent'].map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                      <select name="status" defaultValue={ticket.status} className={inputClass}>
                        {['open', 'assigned', 'in_progress', 'waiting_on_customer', 'waiting_on_admin', 'escalated', 'resolved', 'closed'].map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <PendingActionButton pendingText="Updating..." className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]">
                      Update ticket
                    </PendingActionButton>
                  </form>

                  <form action={replyToSupportTicket} className="grid gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4">
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <select name="visibility" defaultValue="public" className={inputClass}>
                      <option value="public">Public reply</option>
                      <option value="internal">Internal reply</option>
                    </select>
                    <textarea
                      name="body"
                      rows={4}
                      className={inputClass}
                      placeholder="Write the next support response or internal handoff note."
                      required
                    />
                    <PendingActionButton pendingText="Saving..." className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-semibold text-[#1F2937] transition hover:border-[#C0392B] hover:text-[#C0392B]">
                      Save reply
                    </PendingActionButton>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
