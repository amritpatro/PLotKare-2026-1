import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { AgentShell } from '@/components/agent/agent-shell'
import { requireFieldAgentPage } from '@/lib/agent/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type ReportRow = {
  id: string
  status: string
  scheduled_for: string | null
  completed_at: string | null
  summary: string | null
  properties?: { title: string | null; city: string | null; address: string | null } | Array<{ title: string | null; city: string | null; address: string | null }> | null
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null) {
  if (!value) return 'Date pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export default async function AgentReportsPage() {
  const agent = await requireFieldAgentPage()
  const admin = createSupabaseAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data } = await admin
    .from('inspections')
    .select('id,status,scheduled_for,completed_at,summary,properties(title,city,address)')
    .eq('assigned_employee_id', agent.employeeId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as ReportRow[]

  return (
    <AgentShell title="My inspection history" subtitle="Read-only view of the inspections assigned to you in the last 30 days.">
      <Link href="/agent" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#1F2937]">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <section className="grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-3 text-lg font-semibold">No completed inspections yet.</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Submitted and approved work will appear here after your first field visit.</p>
          </div>
        ) : null}

        {rows.map((row) => {
          const property = first(row.properties)
          return (
            <article key={row.id} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B45309]">{formatDate(row.completed_at || row.scheduled_for)}</p>
                  <h2 className="mt-1 text-lg font-bold text-[#111827]">{property?.title || property?.address || 'Inspection'}</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">{row.summary || property?.city || 'No field summary yet.'}</p>
                </div>
                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                  {row.status.replaceAll('_', ' ')}
                </span>
              </div>
            </article>
          )
        })}
      </section>
    </AgentShell>
  )
}
