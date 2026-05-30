import Link from 'next/link'
import { CalendarClock, CheckCircle2, MapPin, Navigation, TimerReset } from 'lucide-react'
import { AgentShell } from '@/components/agent/agent-shell'
import { requireFieldAgentPage } from '@/lib/agent/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type AssignmentRow = {
  id: string
  status: string
  scheduled_for: string | null
  completed_at: string | null
  summary: string | null
  properties?: {
    title: string | null
    address: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
  } | Array<{
    title: string | null
    address: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
  }> | null
  plots?: {
    plot_number: string | null
    location: string | null
  } | Array<{
    plot_number: string | null
    location: string | null
  }> | null
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null) {
  if (!value) return 'No deadline'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function isToday(value: string | null) {
  if (!value) return false
  return new Date(value).toDateString() === new Date().toDateString()
}

export default async function AgentHomePage() {
  const agent = await requireFieldAgentPage()
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('inspections')
    .select('id,status,scheduled_for,completed_at,summary,properties(title,address,city,latitude,longitude),plots(plot_number,location)')
    .eq('assigned_employee_id', agent.employeeId)
    .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .limit(20)

  const assignments = ((data ?? []) as AssignmentRow[]).sort((a, b) => Number(isToday(b.scheduled_for)) - Number(isToday(a.scheduled_for)))

  return (
    <AgentShell title="Today's assigned plots" subtitle="Open the plot packet before travel, then capture GPS, photos, checklist, documents, amenities, and sync when signal returns.">
      <section className="grid gap-3">
        {assignments.length === 0 ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-3 text-lg font-semibold">No active field assignments</h2>
            <p className="mt-2 text-sm text-[#6B7280]">New inspections assigned by admin will appear here automatically when you refresh or reopen the portal.</p>
          </div>
        ) : null}

        {assignments.map((item) => {
          const property = first(item.properties)
          const plot = first(item.plots)
          const hasCoordinates = property?.latitude != null && property?.longitude != null

          return (
            <article key={item.id} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B45309]">{plot?.plot_number || item.id.slice(0, 8)}</p>
                  <h2 className="mt-1 text-xl font-bold text-[#111827]">{property?.title || plot?.location || 'Assigned plot'}</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">{property?.city || property?.address || 'Location details pending'}</p>
                </div>
                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                  {item.status.replaceAll('_', ' ')}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
                <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#C0392B]" /> Due {formatDate(item.scheduled_for)}</span>
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#C0392B]" /> {hasCoordinates ? 'GPS target ready' : 'Admin must add plot coordinates before arrival verification'}</span>
              </div>

              <Link
                href={`/agent/inspections/${item.id}`}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#A93226]"
              >
                {item.status === 'in_progress' ? <TimerReset className="h-5 w-5" /> : <Navigation className="h-5 w-5" />}
                {item.status === 'in_progress' ? 'Resume inspection' : 'Start inspection'}
              </Link>
            </article>
          )
        })}
      </section>
    </AgentShell>
  )
}
