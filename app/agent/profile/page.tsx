import { AgentShell } from '@/components/agent/agent-shell'
import { requireFieldAgentPage } from '@/lib/agent/server'

export default async function AgentProfilePage() {
  const agent = await requireFieldAgentPage()

  return (
    <AgentShell title="Agent profile" subtitle="Identity, sync guidance, and field portal status.">
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B45309]">Active field inspection agent</p>
        <h2 className="mt-2 text-xl font-bold text-[#111827]">{agent.fullName || agent.email || 'PlotKare agent'}</h2>
        <p className="mt-1 text-sm text-[#6B7280]">Employee ID: {agent.employeeId}</p>
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
