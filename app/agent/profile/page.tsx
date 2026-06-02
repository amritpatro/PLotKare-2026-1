import { AgentShell } from '@/components/agent/agent-shell'
import { requireFieldAgentPage } from '@/lib/agent/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function AgentProfilePage() {
  const agent = await requireFieldAgentPage()
  const supabase = createSupabaseAdminClient()
  const [{ data: assignments }, { data: tickets }, { data: notifications }] = await Promise.all([
    supabase
      .from('inspections')
      .select('id,status,workflow_step,scheduled_for,created_at')
      .eq('assigned_employee_id', agent.employeeId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('support_tickets')
      .select('id,status')
      .eq('requester_id', agent.userId)
      .limit(50),
    supabase
      .from('notifications')
      .select('id,read_at')
      .eq('recipient_id', agent.userId)
      .limit(50),
  ])

  const assignmentRows = assignments ?? []
  const openTickets = (tickets ?? []).filter((ticket) => !['resolved', 'closed'].includes(String(ticket.status))).length
  const unreadNotifications = (notifications ?? []).filter((notification) => !notification.read_at).length

  return (
    <AgentShell title="Agent profile" subtitle="Identity, sync guidance, and field portal status.">
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B45309]">Active field inspection agent</p>
        <h2 className="mt-2 text-xl font-bold text-[#111827]">{agent.fullName || agent.email || 'PlotKare agent'}</h2>
        <p className="mt-1 text-sm text-[#6B7280]">Employee ID: {agent.employeeId}</p>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Assignments', assignmentRows.length],
          ['Open tickets', openTickets],
          ['Unread alerts', unreadNotifications],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B45309]">{label}</p>
            <p className="mt-2 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#111827]">Recent assignment status</h2>
        <div className="mt-3 divide-y divide-[#F3F4F6] text-sm">
          {assignmentRows.length === 0 ? <p className="py-3 text-[#6B7280]">No assignments yet.</p> : null}
          {assignmentRows.slice(0, 5).map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between gap-3 py-3">
              <span className="font-mono text-xs text-[#C0392B]">{assignment.id.slice(0, 8).toUpperCase()}</span>
              <span className="text-[#6B7280]">{String(assignment.workflow_step || assignment.status).replaceAll('_', ' ')}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#111827]">Offline sync rules</h2>
        <div className="mt-3 space-y-3 text-sm text-[#6B7280]">
          <p>Assignments load while online and drafts stay on this device using IndexedDB.</p>
          <p>Captured photos are compressed before local storage and before upload.</p>
          <p>If signal drops, keep completing the checklist. Reopen this portal when signal returns and use Sync inspection.</p>
        </div>
      </section>
    </AgentShell>
  )
}
