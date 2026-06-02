import Link from 'next/link'
import { LivePlotMap } from '@/components/agent/live-plot-map'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type InspectionRow = {
  id: string
  status: string
  workflow_step: string | null
  target_latitude: number | null
  target_longitude: number | null
  assigned_employee_id: string | null
  properties?: { title: string | null; city: string | null; latitude: number | null; longitude: number | null } | Array<{ title: string | null; city: string | null; latitude: number | null; longitude: number | null }> | null
  plots?: { plot_number: string | null; location: string | null; target_latitude: number | null; target_longitude: number | null } | Array<{ plot_number: string | null; location: string | null; target_latitude: number | null; target_longitude: number | null }> | null
  employees?: { profiles?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null } | Array<{ profiles?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null }> | null
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatTime(value: string | null | undefined) {
  if (!value) return 'Waiting for GPS'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function AdminTrackingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: inspections } = await supabase
    .from('inspections')
    .select('id,status,workflow_step,target_latitude,target_longitude,assigned_employee_id,properties(title,city,latitude,longitude),plots(plot_number,location,target_latitude,target_longitude),employees(profiles(full_name,email))')
    .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])
    .order('created_at', { ascending: false })
    .limit(30)

  const rows = (inspections ?? []) as InspectionRow[]
  const inspectionIds = rows.map((row) => row.id)
  const { data: locations } = inspectionIds.length
    ? await supabase
        .from('agent_locations')
        .select('inspection_id,latitude,longitude,accuracy_meters,captured_at')
        .in('inspection_id', inspectionIds)
        .order('captured_at', { ascending: false })
        .limit(120)
    : { data: [] }

  const latestLocationByInspection = new Map<string, any>()
  for (const location of locations ?? []) {
    if (!latestLocationByInspection.has(location.inspection_id)) {
      latestLocationByInspection.set(location.inspection_id, location)
    }
  }

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Live Tracking</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Active field agent GPS from real inspection assignments.</p>
        </div>
        <Link href="/admin/dashboard/inspection-reports" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#C0392B] px-4 text-sm font-semibold text-[#C0392B]">
          Assign inspections
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ['Active inspections', rows.length],
          ['Moving agents', latestLocationByInspection.size],
          ['In progress', rows.filter((row) => row.status === 'in_progress').length],
          ['GPS pending', rows.length - latestLocationByInspection.size],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white px-4 py-10 text-center text-sm text-[#6B7280]">
            No active tracking sessions.
          </div>
        ) : null}
        {rows.map((inspection) => {
          const property = first(inspection.properties)
          const plot = first(inspection.plots)
          const employee = first(inspection.employees)
          const profile = first(employee?.profiles)
          const location = latestLocationByInspection.get(inspection.id)
          const targetLatitude = inspection.target_latitude ?? plot?.target_latitude ?? property?.latitude ?? null
          const targetLongitude = inspection.target_longitude ?? plot?.target_longitude ?? property?.longitude ?? null

          return (
            <section key={inspection.id} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C9A962]">{inspection.status.replaceAll('_', ' ')}</p>
                  <h2 className="mt-1 font-serif text-xl font-semibold text-[#1F2937]">{plot?.plot_number || property?.title || inspection.id.slice(0, 8)}</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">{[plot?.location, property?.city].filter(Boolean).join(' · ') || 'Location pending'}</p>
                </div>
                <div className="text-sm text-[#6B7280] md:text-right">
                  <p className="font-semibold text-[#1F2937]">{profile?.full_name || profile?.email || 'Agent pending'}</p>
                  <p>{formatTime(location?.captured_at)}</p>
                </div>
              </div>
              <LivePlotMap
                target={{ latitude: targetLatitude, longitude: targetLongitude }}
                current={
                  location
                    ? {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy_meters ?? 0,
                        capturedAt: location.captured_at,
                      }
                    : null
                }
                distanceMeters={null}
                arrivalStatus={null}
                accuracyLabel={location?.accuracy_meters == null ? 'GPS accuracy pending' : `Accuracy ${Math.round(location.accuracy_meters)}m`}
              />
            </section>
          )
        })}
      </div>
    </div>
  )
}
