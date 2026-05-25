import { toggleAmenityAvailability, updateAmenityRequest } from './actions'
import { AMENITY_CATALOG } from '@/lib/amenity-catalog'
import { readAmenityWorkflowRows } from '@/lib/amenity-operations'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

const successMessages = {
  amenity_updated: 'Amenity review updated and requester notifications refreshed.',
} as const

const errorMessages = {
  invalid_amenity_update: 'Invalid amenity update. Refresh and try again.',
  amenity_update_failed: 'Amenity review could not be updated.',
} as const

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] : value
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'requested').replaceAll('_', ' ')
}

function statusBadge(value: string | null | undefined) {
  const status = String(value ?? 'requested')
  const className =
    status === 'approved' || status === 'completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'rejected'
        ? 'border-red-200 bg-red-50 text-red-700'
        : status === 'under_review' || status === 'scheduled'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'

  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${className}`}>
      {statusLabel(status)}
    </span>
  )
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminAmenitiesPage({ searchParams }: PageProps) {
  await requirePageRole(['admin'])
  const supabase = await createSupabaseServerClient()
  const [{ data: amenities }, { data: employees }, workflowRows] = await Promise.all([
    supabase.from('amenities').select('id,active'),
    supabase
      .from('employees')
      .select('id,employee_role,profiles(full_name,email)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(50),
    readAmenityWorkflowRows(supabase),
  ])
  const params = (await searchParams) ?? {}
  const successCode = getSearchParam(params, 'success') as keyof typeof successMessages | undefined
  const errorCode = getSearchParam(params, 'error') as keyof typeof errorMessages | undefined

  const activeById = new Map((amenities ?? []).map((amenity) => [amenity.id, amenity.active]))
  const employeeOptions = (employees ?? []).map((employee: any) => {
    const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
    return {
      id: employee.id as string,
      label: `${profile?.full_name || profile?.email || employee.id} · ${String(employee.employee_role).replaceAll('_', ' ')}`,
    }
  })

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Amenities operations</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">Amenity catalogue + review queue</h1>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
            Manage the live amenity catalogue and review incoming seller, owner, and customer amenity requests with assignment, review state, and internal notes.
          </p>
        </div>
      </div>

      {successCode ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessages[successCode]}
        </div>
      ) : null}
      {errorCode ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessages[errorCode]}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Catalogue availability</h2>
            <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">
              {AMENITY_CATALOG.length} configured
            </span>
          </div>
          <p className="mt-2 text-sm text-[#6B7280]">
            Inactive amenities are hidden from dashboard request forms until re-enabled.
          </p>

          <div className="mt-6 space-y-2">
            {AMENITY_CATALOG.map((amenity) => {
              const active = activeById.get(amenity.id) ?? true

              return (
                <div
                  key={amenity.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <div>
                    <p className="font-medium text-[#1F2937]">{amenity.name}</p>
                    <p className="font-mono text-xs text-[#9CA3AF]">{amenity.category}</p>
                    <p className="mt-1 font-mono text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">
                      Consult for scope
                    </p>
                  </div>
                  <form action={toggleAmenityAvailability}>
                    <input type="hidden" name="amenityId" value={amenity.id} />
                    <input type="hidden" name="nextActive" value={active ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className={`rounded-full px-4 py-2 font-sans text-xs font-semibold ${
                        active ? 'bg-[#16A34A]/15 text-[#16A34A]' : 'bg-[#F3F4F6] text-[#6B7280]'
                      }`}
                    >
                      {active ? 'Active' : 'Inactive'}
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Review queue</h2>
            <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">
              {workflowRows.length} requests
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['Requested', workflowRows.filter((row) => row.reviewStatus === 'requested').length],
              ['In review', workflowRows.filter((row) => row.reviewStatus === 'under_review').length],
              ['Approved', workflowRows.filter((row) => row.reviewStatus === 'approved' || row.reviewStatus === 'completed').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#F9FAFB] px-3 py-3 text-center">
                <p className="font-mono text-lg font-bold text-[#C0392B]">{value}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {workflowRows.length === 0 ? (
              <p className="py-6 text-sm text-[#6B7280]">No amenity requests are waiting right now.</p>
            ) : null}
            {workflowRows.map((row) => (
              <div
                key={row.id}
                className="grid gap-4 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]"
                data-amenity-request-id={row.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-sans text-sm font-semibold text-[#1F2937]">{row.amenityName}</p>
                    {statusBadge(row.reviewStatus)}
                  </div>
                  <p className="mt-2 font-sans text-sm text-[#6B7280]">
                    {row.propertyTitle || row.plotNumber || 'Property pending'} · {row.location || 'Location pending'}
                  </p>
                  <p className="mt-2 font-sans text-sm text-[#6B7280]">
                    Requester: {row.requesterName}
                    {row.requesterEmail ? ` · ${row.requesterEmail}` : ''}
                    {row.requesterPhone ? ` · ${row.requesterPhone}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                      {row.priority}
                    </span>
                    {row.assignedEmployeeLabel ? (
                      <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                        {row.assignedEmployeeLabel}
                      </span>
                    ) : null}
                    {row.dueAt ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700">
                        Due {new Date(row.dueAt).toLocaleDateString('en-IN')}
                      </span>
                    ) : null}
                  </div>
                  {row.reviewNote ? (
                    <p className="mt-3 rounded-lg bg-[#F9FAFB] px-3 py-2 text-sm text-[#4B5563]">{row.reviewNote}</p>
                  ) : null}
                </div>

                <form action={updateAmenityRequest} className="grid gap-3">
                  <input type="hidden" name="amenityRequestId" value={row.id} />
                  <textarea
                    name="note"
                    defaultValue={row.reviewNote ?? ''}
                    rows={3}
                    className={inputClass}
                    placeholder="Internal review note"
                  />
                  <div className="grid gap-2 sm:grid-cols-4">
                    <select
                      name="assignedEmployeeId"
                      defaultValue={row.assignedEmployeeId ?? ''}
                      className={inputClass}
                    >
                      <option value="">No assignee</option>
                      {employeeOptions.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.label}
                        </option>
                      ))}
                    </select>
                    <select name="priority" defaultValue={row.priority} className={inputClass}>
                      {['low', 'normal', 'high', 'urgent'].map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      name="dueAt"
                      defaultValue={row.dueAt ? row.dueAt.slice(0, 16) : ''}
                      className={inputClass}
                      aria-label="Amenity due date"
                    />
                    <select
                      name="escalationLevel"
                      defaultValue={row.escalationLevel}
                      className={inputClass}
                    >
                      {[0, 1, 2, 3].map((level) => (
                        <option key={level} value={level}>
                          Escalation {level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(['requested', 'under_review', 'approved', 'rejected', 'scheduled', 'completed'] as const).map(
                      (status) => (
                        <button
                          key={status}
                          type="submit"
                          name="reviewStatus"
                          value={status}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            status === 'approved' || status === 'completed'
                              ? 'bg-[#C0392B] text-white hover:bg-[#A93226]'
                              : status === 'rejected'
                                ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                : 'border border-[#D1D5DB] bg-white text-[#374151] hover:border-[#C0392B] hover:text-[#C0392B]'
                          }`}
                        >
                          {statusLabel(status)}
                        </button>
                      ),
                    )}
                  </div>
                </form>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
