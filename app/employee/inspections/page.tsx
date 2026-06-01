import Link from 'next/link'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function EmployeeInspectionsPage() {
  await requirePageRole(['employee', 'admin'])
  const admin = createSupabaseAdminClient()
  const { data: inspections } = await admin
    .from('inspections')
    .select('id,workflow_step,status,submitted_at,arrival_verified,arrival_distance_meters,properties(title,address,city),plots(plot_number,location),employees(profiles(full_name,email))')
    .in('workflow_step', ['submitted', 'reviewed', 'approved', 'rejected', 'delivered'])
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(100)

  return (
    <main className="min-h-screen bg-[#F8F7F4] px-4 pb-20 pt-24 text-[#1F2937] sm:px-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#B45309]">Inspection queue</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">Submitted inspections</h1>
          <p className="mt-2 text-sm text-[#6B7280]">View submitted field inspections, photo evidence, checklist results, and internal review context.</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F9FAFB] font-mono text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Plot</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">GPS</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {(inspections ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">No submitted inspections yet.</td></tr>
              ) : null}
              {(inspections ?? []).map((inspection) => {
                const property = first(inspection.properties)
                const plot = first(inspection.plots)
                const employee = first(inspection.employees)
                const profile = first(employee?.profiles)
                return (
                  <tr key={inspection.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#111827]">{plot?.plot_number || property?.title || inspection.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{[property?.address, property?.city, plot?.location].filter(Boolean).join(', ') || 'Location pending'}</p>
                    </td>
                    <td className="px-4 py-4 text-[#6B7280]">{profile?.full_name || profile?.email || 'Agent pending'}</td>
                    <td className="px-4 py-4 text-[#6B7280]">{formatDate(inspection.submitted_at)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${inspection.arrival_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {inspection.arrival_verified ? 'Verified' : 'Review'}
                      </span>
                      <p className="mt-1 text-xs text-[#9CA3AF]">{inspection.arrival_distance_meters == null ? 'Distance pending' : `${Math.round(Number(inspection.arrival_distance_meters))}m`}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs uppercase text-[#6B7280]">{String(inspection.workflow_step || inspection.status).replaceAll('_', ' ')}</td>
                    <td className="px-4 py-4">
                      <Link href={`/employee/inspections/${inspection.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-[#C0392B] px-3 text-xs font-bold text-[#C0392B]">
                        Review
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
