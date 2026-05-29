import Link from 'next/link'
import { CalendarClock, ChevronRight, ClipboardCheck, MapPin } from 'lucide-react'
import { requireFieldAgentPage } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const card = 'rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'

export default async function AgentHomePage() {
  const { employee } = await requireFieldAgentPage()
  const supabase = await createSupabaseServerClient()
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const weekStart = new Date(start)
  weekStart.setDate(weekStart.getDate() - 6)

  const [{ data: assignments }, { data: submitted }] = await Promise.all([
    supabase
      .from('inspections')
      .select('id,inspection_reference,status,workflow_step,plan_snapshot,scheduled_for,arrival_verified,properties(title,address,city),plots(plot_number,location)')
      .eq('assigned_employee_id', employee.id)
      .gte('scheduled_for', start.toISOString())
      .lt('scheduled_for', end.toISOString())
      .in('status', ['scheduled', 'in_progress', 'correction_required'])
      .order('scheduled_for', { ascending: true }),
    supabase
      .from('inspections')
      .select('id,status')
      .eq('assigned_employee_id', employee.id)
      .gte('submitted_at', weekStart.toISOString())
      .in('status', ['submitted', 'under_review', 'approved', 'delivered', 'completed']),
  ])

  return (
    <div className="space-y-6">
      <section className={card}>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#C9A962]">Today&apos;s route</p>
        <h1 className="mt-3 font-serif text-3xl font-bold">Assigned plot inspections</h1>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">Capture GPS-verified field evidence and submit reports for operations review.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#F9FAFB] p-4">
            <MapPin className="h-5 w-5 text-[#C0392B]" />
            <p className="mt-2 font-mono text-2xl font-bold">{assignments?.length ?? 0}</p>
            <p className="text-xs text-[#6B7280]">Due today</p>
          </div>
          <div className="rounded-lg bg-[#F9FAFB] p-4">
            <ClipboardCheck className="h-5 w-5 text-[#C0392B]" />
            <p className="mt-2 font-mono text-2xl font-bold">{submitted?.length ?? 0}</p>
            <p className="text-xs text-[#6B7280]">Submitted this week</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {(assignments ?? []).length === 0 ? (
          <div className={card}>
            <CalendarClock className="h-6 w-6 text-[#C0392B]" />
            <h2 className="mt-3 font-serif text-xl font-semibold">No inspections due today</h2>
            <p className="mt-2 text-sm text-[#6B7280]">New assignments from operations will appear here automatically.</p>
          </div>
        ) : null}
        {(assignments ?? []).map((inspection: any) => {
          const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
          const plot = Array.isArray(inspection.plots) ? inspection.plots[0] : inspection.plots
          return (
            <article key={inspection.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C0392B]">{inspection.inspection_reference}</p>
                  <h2 className="mt-2 font-serif text-xl font-bold">{plot?.plot_number || property?.title || 'Assigned property'}</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">{plot?.location || [property?.address, property?.city].filter(Boolean).join(', ')}</p>
                </div>
                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase text-[#6B7280]">
                  {String(inspection.status).replaceAll('_', ' ')}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#F3F4F6] pt-4 text-sm">
                <span className="text-[#6B7280]">{inspection.plan_snapshot || 'Basic care'} plan</span>
                <Link href={`/agent/inspections/${inspection.id}`} className="flex min-h-12 items-center gap-1 rounded-lg bg-[#C0392B] px-4 font-semibold text-white">
                  {inspection.arrival_verified ? 'Resume' : 'Start'} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
