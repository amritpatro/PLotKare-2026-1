import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

type AdminInspectionReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type ReportRow = {
  id: string
  owner_id: string
  plot_id: string | null
  month: string
  agent_name: string | null
  finding: string
  status: string
  report_file_path: string | null
  created_at: string
}

type PlotRow = {
  id: string
  plot_number: string
  location: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function statusBadge(status: string) {
  const className =
    status === 'Completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'Scheduled'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : status === 'Action Needed'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'

  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${className}`}>
      {status}
    </span>
  )
}

export default async function AdminInspectionReportsPage({ searchParams }: AdminInspectionReportsPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const q = getParam(params, 'q')?.trim() ?? ''
  const status = getParam(params, 'status')?.trim() ?? ''

  let reportQuery = supabase
    .from('inspection_reports')
    .select('id,owner_id,plot_id,month,agent_name,finding,status,report_file_path,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    const term = q.replaceAll('%', '\\%').replaceAll('_', '\\_')
    reportQuery = reportQuery.or(`month.ilike.%${term}%,agent_name.ilike.%${term}%,finding.ilike.%${term}%`)
  }

  if (status) {
    reportQuery = reportQuery.eq('status', status)
  }

  const { data: reports } = await reportQuery
  const rows = (reports ?? []) as ReportRow[]
  const ownerIds = unique(rows.map((row) => row.owner_id))
  const plotIds = unique(rows.map((row) => row.plot_id))

  const [{ data: profiles }, { data: plots }] = await Promise.all([
    ownerIds.length
      ? supabase.from('profiles').select('id,full_name,email').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    plotIds.length
      ? supabase.from('plots').select('id,plot_number,location').in('id', plotIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((row) => [row.id, row]))
  const plotById = new Map(((plots ?? []) as PlotRow[]).map((row) => [row.id, row]))

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Inspection Reports</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Field reports stored in Supabase inspection_reports.</p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search month, agent, finding" className={`${inputClass} w-64`} />
          <select name="status" defaultValue={status} className={inputClass}>
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Action Needed">Action Needed</option>
          </select>
          <button className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white" type="submit">
            Filter
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ['Reports shown', rows.length],
          ['Completed', rows.filter((row) => row.status === 'Completed').length],
          ['Scheduled', rows.filter((row) => row.status === 'Scheduled').length],
          ['With files', rows.filter((row) => row.report_file_path).length],
        ].map(([label, value]) => (
          <div key={label} className={`${cardClass} p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <div className={`${cardClass} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Month</th>
              <th className="px-3 py-3">Plot</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Agent</th>
              <th className="px-3 py-3">Finding</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] text-[#1F2937]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-[#6B7280]">
                  No inspection reports found.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const plot = row.plot_id ? plotById.get(row.plot_id) : null
              const owner = profileById.get(row.owner_id)

              return (
                <tr key={row.id}>
                  <td className="px-3 py-3 text-[#6B7280]">{row.month}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[#C0392B]">{plot?.plot_number || 'Unlinked'}</span>
                    {plot?.location ? <span className="block text-xs text-[#9CA3AF]">{plot.location}</span> : null}
                  </td>
                  <td className="px-3 py-3">{owner?.full_name || owner?.email || 'Owner pending'}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.agent_name || 'Unassigned'}</td>
                  <td className="max-w-sm truncate px-3 py-3 text-[#6B7280]">{row.finding || 'No finding recorded'}</td>
                  <td className="px-3 py-3">{statusBadge(row.status)}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
