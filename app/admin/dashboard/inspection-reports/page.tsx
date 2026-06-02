import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import escapeSearchTerm from '@/lib/search'
import StatusBadge from '@/components/ui/status-badge'
import { CoordinatePicker } from '@/components/maps/coordinate-picker'
import { assignInspectionReport, updateInspectionReportCoordinates } from './actions'

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
  property_id: string | null
  plot_number: string
  location: string
  target_latitude: number | null
  target_longitude: number | null
  target_place_label: string | null
}

type PropertyRow = {
  id: string
  title: string | null
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type EmployeeRow = {
  id: string
  profile_id: string
  active: boolean
  employee_role: string
  profiles?: ProfileRow | ProfileRow[] | null
}

type InspectionRow = {
  id: string
  plot_id: string | null
  assigned_employee_id: string | null
  status: string
  scheduled_for: string | null
  created_at: string
  completed_at: string | null
  summary: string | null
  photos: unknown
  target_place_label: string | null
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function employeeLabel(employee: EmployeeRow) {
  const profile = first(employee.profiles)
  return profile?.full_name || profile?.email || `Field agent ${employee.id.slice(0, 8)}`
}

// use shared StatusBadge component

export default async function AdminInspectionReportsPage({ searchParams }: AdminInspectionReportsPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const q = getParam(params, 'q')?.trim() ?? ''
  const status = getParam(params, 'status')?.trim() ?? ''
  const success = getParam(params, 'success')
  const error = getParam(params, 'error')

  let reportQuery = supabase
    .from('inspection_reports')
    .select('id,owner_id,plot_id,month,agent_name,finding,status,report_file_path,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
     const term = escapeSearchTerm(q)
    reportQuery = reportQuery.or(`month.ilike.%${term}%,agent_name.ilike.%${term}%,finding.ilike.%${term}%`)
  }

  if (status) {
    reportQuery = reportQuery.eq('status', status)
  }

  const { data: reports } = await reportQuery
  const rows = (reports ?? []) as ReportRow[]
  const ownerIds = unique(rows.map((row) => row.owner_id))
  const plotIds = unique(rows.map((row) => row.plot_id))

  const [{ data: profiles }, { data: plots }, { data: fieldAgents }, { data: inspections }] = await Promise.all([
    ownerIds.length
      ? supabase.from('profiles').select('id,full_name,email').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    plotIds.length
      ? supabase.from('plots').select('id,property_id,plot_number,location,target_latitude,target_longitude,target_place_label').in('id', plotIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('employees')
      .select('id,profile_id,employee_role,active,profiles(id,full_name,email)')
      .eq('employee_role', 'field_inspection_agent')
      .eq('active', true)
      .order('created_at', { ascending: false }),
    plotIds.length
      ? supabase
          .from('inspections')
          .select('id,plot_id,assigned_employee_id,status,scheduled_for,created_at,completed_at,summary,photos,target_place_label')
          .in('plot_id', plotIds)
          .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const propertyIds = unique(((plots ?? []) as PlotRow[]).map((plot) => plot.property_id))
  const { data: properties } = propertyIds.length
    ? await supabase.from('properties').select('id,title,city,state,latitude,longitude').in('id', propertyIds)
    : { data: [] }

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((row) => [row.id, row]))
  const plotById = new Map(((plots ?? []) as PlotRow[]).map((row) => [row.id, row]))
  const propertyById = new Map(((properties ?? []) as PropertyRow[]).map((row) => [row.id, row]))
  const agents = (fieldAgents ?? []) as EmployeeRow[]
  const agentById = new Map(agents.map((employee) => [employee.id, employee]))
  const inspectionByPlotId = new Map<string, InspectionRow>()
  for (const inspection of (inspections ?? []) as InspectionRow[]) {
    if (inspection.plot_id && !inspectionByPlotId.has(inspection.plot_id)) {
      inspectionByPlotId.set(inspection.plot_id, inspection)
    }
  }

  const successMessage =
    success === 'inspection_assigned'
      ? 'Inspection assigned. It will appear in the field agent portal.'
      : success === 'coordinates_saved'
        ? 'Coordinates saved and synced to active field assignments.'
        : null
  const errorMessages: Record<string, string> = {
    invalid_assignment: 'Choose a valid field agent and inspection report.',
    invalid_field_agent: 'Choose an active field inspection agent.',
    invalid_coordinates: 'Choose a valid map coordinate before saving.',
    plot_required: 'This report is not linked to a plot, so it cannot become a field assignment yet.',
    property_required: 'The linked plot does not have a property record. Register/verify the plot first.',
    coordinates_required: 'Add confirmed latitude and longitude to the linked property before assigning a field inspection.',
    coordinates_save_failed: 'Coordinate update failed. Please try again.',
    assignment_failed: 'Inspection assignment failed. Please try again.',
  }
  const errorMessage = error ? errorMessages[error] ?? 'Inspection assignment failed.' : null

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Inspection Reports</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Field reports and review status.</p>
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

      {successMessage ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ['Reports shown', rows.length],
          ['Completed', rows.filter((row) => row.status === 'Completed').length],
          ['Scheduled', rows.filter((row) => row.status === 'Scheduled').length],
          ['Agent pool', agents.length],
        ].map(([label, value]) => (
          <div key={label} className={`${cardClass} p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <div className={`${cardClass} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Month</th>
              <th className="px-3 py-3">Plot</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Agent</th>
              <th className="px-3 py-3">Finding</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Field assignment</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Assign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] text-[#1F2937]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-[#6B7280]">
                  No inspection reports found.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const plot = row.plot_id ? plotById.get(row.plot_id) : null
              const property = plot?.property_id ? propertyById.get(plot.property_id) : null
              const owner = profileById.get(row.owner_id)
              const assignedInspection = row.plot_id ? inspectionByPlotId.get(row.plot_id) : null
              const assignedAgent = assignedInspection?.assigned_employee_id ? agentById.get(assignedInspection.assigned_employee_id) : null
              const targetLatitude = plot?.target_latitude ?? property?.latitude ?? null
              const targetLongitude = plot?.target_longitude ?? property?.longitude ?? null
              const coordinateLabel =
                targetLatitude != null && targetLongitude != null
                  ? `${Number(targetLatitude).toFixed(5)}, ${Number(targetLongitude).toFixed(5)}`
                  : 'Coordinates pending'
              const targetPlaceLabel = assignedInspection?.target_place_label || plot?.target_place_label || coordinateLabel
              const assignedAtLabel = assignedInspection?.scheduled_for
                ? new Date(assignedInspection.scheduled_for).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                : assignedInspection?.created_at
                  ? new Date(assignedInspection.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Assignment pending'

              return (
                <tr key={row.id}>
                  <td className="px-3 py-3 text-[#6B7280]">{row.month}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[#C0392B]">{plot?.plot_number || 'Unlinked'}</span>
                    {plot?.location ? <span className="block text-xs text-[#9CA3AF]">{plot.location}</span> : null}
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-[#C9A962]">{targetPlaceLabel}</span>
                  </td>
                  <td className="px-3 py-3">{owner?.full_name || owner?.email || 'Owner pending'}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.agent_name || 'Unassigned'}</td>
                  <td className="max-w-sm truncate px-3 py-3 text-[#6B7280]">{row.finding || 'No finding recorded'}</td>
                  <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-3 py-3">
                    {assignedInspection ? (
                      <div>
                        <p className="font-semibold text-[#1F2937]">{assignedAgent ? employeeLabel(assignedAgent) : 'Assigned agent'}</p>
                        <p className="text-xs text-[#9CA3AF]">Assigned {assignedAtLabel}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {assignedInspection.status.replaceAll('_', ' ')}
                          {assignedInspection.scheduled_for ? ` · ${new Date(assignedInspection.scheduled_for).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#C9A962]">{targetPlaceLabel}</p>
                        {targetLatitude != null && targetLongitude != null ? (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${targetLatitude},${targetLongitude}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-semibold text-[#C0392B]">
                            View plot location on Google Maps
                          </a>
                        ) : null}
                        <Link href={`/admin/dashboard/inspections/${assignedInspection.id}/review`} className="mt-2 inline-flex rounded-md border border-[#C0392B] px-2.5 py-1 text-xs font-semibold text-[#C0392B]">
                          Review evidence
                        </Link>
                      </div>
                    ) : (
                      <span className="text-[#9CA3AF]">Not assigned to field portal</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[#6B7280]">{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-3 py-3">
                    <form action={assignInspectionReport} className="flex min-w-72 flex-col gap-2">
                      <input type="hidden" name="reportId" value={row.id} />
                      <select name="assignedEmployeeId" defaultValue={assignedInspection?.assigned_employee_id ?? ''} className={inputClass}>
                        <option value="">Select field agent</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {employeeLabel(agent)}
                          </option>
                        ))}
                      </select>
                      <input name="scheduledFor" type="datetime-local" defaultValue={assignedInspection?.scheduled_for ? new Date(assignedInspection.scheduled_for).toISOString().slice(0, 16) : ''} className={inputClass} />
                      <button type="submit" className="rounded-lg bg-[#C0392B] px-3 py-2 text-xs font-semibold text-white disabled:bg-[#9CA3AF]" disabled={!row.plot_id || agents.length === 0}>
                        Assign to field portal
                      </button>
                    </form>
                    <form action={updateInspectionReportCoordinates} className="mt-3 min-w-72 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                      <input type="hidden" name="reportId" value={row.id} />
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C9A962]">Correct GPS pin</p>
                      <CoordinatePicker
                        initialLatitude={targetLatitude}
                        initialLongitude={targetLongitude}
                        defaultQuery={[plot?.location, property?.city, property?.state].filter(Boolean).join(', ')}
                        compact
                      />
                      <button
                        type="submit"
                        className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#C0392B] bg-white px-3 text-xs font-semibold text-[#C0392B] disabled:border-[#D1D5DB] disabled:text-[#9CA3AF]"
                        disabled={!row.plot_id}
                      >
                        Save corrected pin
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
