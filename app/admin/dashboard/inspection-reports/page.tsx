import Link from 'next/link'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { confirmPropertyCoordinates, reviewFieldInspection, scheduleFieldInspection } from './actions'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'min-h-11 rounded-lg bg-[#C0392B] px-4 text-sm font-semibold text-white disabled:opacity-50'

const messages: Record<string, string> = {
  inspection_assigned: 'Field inspection assigned. The agent can now begin from the mobile portal.',
  correction_required: 'Correction request sent to the assigned field agent.',
  rejected: 'Inspection evidence rejected and retained for audit.',
  report_released: 'Report approved, stored privately, and released to the owner.',
  coordinates_confirmed: 'Verified coordinates recorded. This property is ready for field assignment.',
  invalid_assignment: 'Complete all field assignment details.',
  invalid_coordinates: 'Enter a valid latitude and longitude.',
  verified_property_required: 'Only an approved property can be confirmed for a field inspection.',
  coordinate_confirmation_failed: 'Verified coordinates could not be recorded.',
  coordinates_required: 'Confirm property latitude and longitude before assigning a field visit.',
  duplicate_assignment: 'An active field inspection already exists for this property on the selected date.',
  field_agent_required: 'Choose an active field inspection agent.',
  assignment_failed: 'The field inspection could not be scheduled.',
  review_unavailable: 'This inspection is not ready for review.',
  report_missing: 'No pending review record exists for this inspection.',
  owner_required: 'Link an owner to this property before releasing a report.',
  pdf_failed: 'The secured PDF report could not be generated or stored.',
}

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function badge(status: string) {
  return (
    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase text-[#6B7280]">
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export default async function AdminInspectionReportsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const success = param(params, 'success')
  const error = param(params, 'error')
  const [{ data: properties }, { data: coordinateCandidates }, { data: agents }, { data: queue }] = await Promise.all([
    supabase.from('properties').select('id,title,city,latitude,longitude,coordinates_confirmed_at').eq('verification_status', 'approved').not('latitude', 'is', null).not('longitude', 'is', null).not('coordinates_confirmed_at', 'is', null).order('title').limit(100),
    supabase.from('properties').select('id,title,city,verification_status,latitude,longitude,coordinates_confirmed_at').eq('verification_status', 'approved').order('title').limit(100),
    supabase.from('employees').select('id,employee_role,active,profiles(full_name,email)').eq('employee_role', 'field_inspection_agent').eq('active', true),
    supabase
      .from('inspections')
      .select('id,inspection_reference,status,plan_snapshot,scheduled_for,submitted_at,arrival_verified,arrival_distance_meters,property_id,plot_id,assigned_employee_id,properties(title,city),plots(plot_number,location),inspection_photos(id,direction,subject),inspection_reports(id,delivery_status,report_file_path)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const rows = queue ?? []
  const submittedRows = rows.filter((row: any) => ['submitted', 'under_review'].includes(row.status))

  return (
    <div className="space-y-8 px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[#1F2937]">Field Inspection Operations</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Assign GPS-gated field visits, review captured evidence, and release verified owner reports.</p>
      </header>
      {success && messages[success] ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{messages[success]}</div> : null}
      {error && messages[error] ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{messages[error]}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Total sessions', rows.length],
          ['Ready for review', submittedRows.length],
          ['In field', rows.filter((row: any) => row.status === 'in_progress').length],
          ['Released', rows.filter((row: any) => (Array.isArray(row.inspection_reports) ? row.inspection_reports[0] : row.inspection_reports)?.delivery_status === 'released').length],
        ].map(([label, value]) => <div key={String(label)} className={cardClass}><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6B7280]">{label}</p><p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p></div>)}
      </section>

      <section className={cardClass}>
        <h2 className="font-serif text-2xl font-semibold">Confirm verified plot coordinates</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Record the approved map point used for the agent's 50 meter arrival check. Only verified properties can proceed.</p>
        <form action={confirmPropertyCoordinates} className="mt-5 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
          <select required name="propertyId" defaultValue="" className={inputClass}>
            <option value="" disabled>Select approved property</option>
            {(coordinateCandidates ?? []).map((property: any) => <option value={property.id} key={property.id}>{property.title || property.city || property.id}</option>)}
          </select>
          <input required name="latitude" inputMode="decimal" placeholder="Latitude" className={inputClass} />
          <input required name="longitude" inputMode="decimal" placeholder="Longitude" className={inputClass} />
          <PendingActionButton className={buttonClass} pendingText="Confirming...">Confirm coordinates</PendingActionButton>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="font-serif text-2xl font-semibold">Assign field inspection</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Only properties with confirmed coordinates can be assigned for GPS verification.</p>
        <form action={scheduleFieldInspection} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select required name="propertyId" defaultValue="" className={inputClass}>
            <option value="" disabled>Select coordinate-ready property</option>
            {(properties ?? []).map((property: any) => <option value={property.id} key={property.id}>{property.title || property.city} ({property.latitude}, {property.longitude})</option>)}
          </select>
          <input name="plotId" placeholder="Plot UUID (optional)" className={inputClass} />
          <select required name="employeeId" defaultValue="" className={inputClass}>
            <option value="" disabled>Select field agent</option>
            {(agents ?? []).map((agent: any) => {
              const profile = Array.isArray(agent.profiles) ? agent.profiles[0] : agent.profiles
              return <option value={agent.id} key={agent.id}>{profile?.full_name || profile?.email || agent.id}</option>
            })}
          </select>
          <input required name="scheduledFor" type="datetime-local" className={inputClass} />
          <select required name="planSnapshot" defaultValue="complete_care" className={inputClass}>
            <option value="basic">Basic care</option>
            <option value="complete_care">Complete care</option>
            <option value="premium">Premium</option>
          </select>
          <PendingActionButton className={`${buttonClass} md:col-span-2 xl:col-span-5`} pendingText="Assigning...">Assign field inspection</PendingActionButton>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">Review queue</h2>
        {submittedRows.length === 0 ? <div className={cardClass}><p className="text-sm text-[#6B7280]">No field submissions awaiting review.</p></div> : null}
        {submittedRows.map((row: any) => {
          const property = Array.isArray(row.properties) ? row.properties[0] : row.properties
          const plot = Array.isArray(row.plots) ? row.plots[0] : row.plots
          const photos = row.inspection_photos ?? []
          return (
            <article key={row.id} className={cardClass}>
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <p className="font-mono text-xs text-[#C0392B]">{row.inspection_reference}</p>
                  <h3 className="mt-2 font-serif text-xl font-semibold">{plot?.plot_number || property?.title || 'Property inspection'}</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">{plot?.location || property?.city} · {row.plan_snapshot.replaceAll('_', ' ')}</p>
                </div>
                <div className="flex flex-wrap items-start gap-2">{badge(row.status)}{row.arrival_verified ? badge('gps verified') : badge('gps missing')}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {photos.map((photo: any) => <Link key={photo.id} target="_blank" href={`/api/inspection-evidence/${photo.id}/access`} className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#C0392B]">{String(photo.direction).toUpperCase()} photo</Link>)}
              </div>
              <form action={reviewFieldInspection} className="mt-5 grid gap-3 border-t border-[#F3F4F6] pt-5">
                <input type="hidden" name="inspectionId" value={row.id} />
                <textarea name="note" rows={2} placeholder="Review notes or correction details" className={inputClass} />
                <div className="flex flex-wrap gap-2">
                  <PendingActionButton name="action" value="approve_release" pendingText="Generating report..." className={buttonClass}>Approve and release report</PendingActionButton>
                  <PendingActionButton name="action" value="correction_required" pendingText="Saving..." className="min-h-11 rounded-lg border border-amber-300 px-4 text-sm font-semibold text-amber-700">Request correction</PendingActionButton>
                  <PendingActionButton name="action" value="reject" pendingText="Saving..." className="min-h-11 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-700">Reject evidence</PendingActionButton>
                </div>
              </form>
            </article>
          )
        })}
      </section>

      <section className={`${cardClass} overflow-x-auto`}>
        <h2 className="mb-4 font-serif text-2xl font-semibold">Session history</h2>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="py-3">Reference</th><th>Status</th><th>Property</th><th>Scheduled</th><th>Evidence</th></tr></thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {rows.map((row: any) => {
              const property = Array.isArray(row.properties) ? row.properties[0] : row.properties
              return <tr key={row.id}><td className="py-3 font-mono text-[#C0392B]">{row.inspection_reference}</td><td>{badge(row.status)}</td><td>{property?.title || property?.city || 'Property'}</td><td className="text-[#6B7280]">{row.scheduled_for ? new Date(row.scheduled_for).toLocaleString('en-IN') : 'Pending'}</td><td>{row.inspection_photos?.length ?? 0} files</td></tr>
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
