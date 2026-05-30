import { AgentShell } from '@/components/agent/agent-shell'
import { requireFieldAgentPage } from '@/lib/agent/server'

export default async function AgentSettingsPage() {
  await requireFieldAgentPage()

  return (
    <AgentShell title="Agent settings" subtitle="Field app readiness checks for phone install, GPS, camera, and offline sync.">
      <section className="grid gap-3">
        {[
          ['Install mode', 'Open /agent on mobile and use the browser install prompt to add PlotKare Agent to the home screen.'],
          ['Camera permission', 'The portal is allowed to open the native rear camera using image capture controls.'],
          ['GPS permission', 'Arrival and every captured photo stores latitude, longitude, accuracy, and timestamp.'],
          ['Offline drafts', 'Inspection drafts and compressed photos stay on this device through IndexedDB until you sync.'],
          ['Upload limit', 'Photos are compressed client-side to keep field uploads usable on slow 4G.'],
        ].map(([label, body]) => (
          <article key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B45309]">{label}</p>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">{body}</p>
          </article>
        ))}
      </section>
    </AgentShell>
  )
}
