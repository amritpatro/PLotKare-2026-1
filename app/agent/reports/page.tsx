import Link from 'next/link'
import { FileText } from 'lucide-react'
import { requireFieldAgentPage } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const card = 'rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'

export default async function AgentReportsPage() {
  const { employee } = await requireFieldAgentPage()
  const supabase = await createSupabaseServerClient()
  const { data: inspections } = await supabase
    .from('inspections')
    .select('id,inspection_reference,status,submitted_at,scheduled_for,summary,properties(title,city),plots(plot_number,location)')
    .eq('assigned_employee_id', employee.id)
    .in('status', ['submitted', 'under_review', 'approved', 'correction_required', 'rejected', 'delivered', 'completed'])
    .order('submitted_at', { ascending: false })
    .limit(60)

  return (
    <div className="space-y-4">
      <section className={card}>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#C9A962]">Submission history</p>
        <h1 className="mt-3 font-serif text-3xl font-bold">Field reports</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Reports submitted for operations review and owner delivery.</p>
      </section>
      {(inspections ?? []).length === 0 ? <div className={card}><p className="text-sm text-[#6B7280]">No reports submitted yet.</p></div> : null}
      {(inspections ?? []).map((inspection: any) => {
        const plot = Array.isArray(inspection.plots) ? inspection.plots[0] : inspection.plots
        const property = Array.isArray(inspection.properties) ? inspection.properties[0] : inspection.properties
        return (
          <article key={inspection.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-[#C0392B]">{inspection.inspection_reference}</p>
                <h2 className="mt-2 font-serif text-xl font-semibold">{plot?.plot_number || property?.title || 'Property inspection'}</h2>
                <p className="mt-1 text-sm text-[#6B7280]">{plot?.location || property?.city}</p>
              </div>
              <FileText className="h-6 w-6 text-[#C0392B]" />
            </div>
            <p className="mt-4 text-sm text-[#6B7280]">{inspection.summary || 'Awaiting operations review.'}</p>
            <div className="mt-4 flex items-center justify-between border-t border-[#F3F4F6] pt-4">
              <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase text-[#6B7280]">{String(inspection.status).replaceAll('_', ' ')}</span>
              {inspection.status === 'correction_required' ? <Link href={`/agent/inspections/${inspection.id}`} className="text-sm font-semibold text-[#C0392B]">Correct report</Link> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
