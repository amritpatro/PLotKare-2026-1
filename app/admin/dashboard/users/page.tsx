import { assignUserRole, updateAccountStatus } from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ADMIN_ACCOUNT_STATUSES, ADMIN_EMPLOYEE_ROLES, ADMIN_USER_ROLES } from '@/lib/admin/status'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const openWorkStatuses = ['requested', 'scheduled', 'in_progress', 'needs_followup', 'open', 'assigned', 'waiting_on_vendor']

type WorkRow = {
  assigned_employee_id: string | null
  status: string
}

type EmployeeRow = {
  id: string
  profile_id: string
  employee_role: string
  active: boolean
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
}

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const messages = {
  success: {
    role_assigned: 'Role assignment updated and audit log recorded.',
    account_status_updated: 'Account status updated and audit log recorded.',
  },
  error: {
    invalid_role_assignment: 'Invalid role assignment. Check the selected values.',
    cannot_demote_self: 'You cannot remove your own admin role.',
    profile_not_found: 'Profile not found.',
    role_assignment_failed: 'Role assignment failed.',
    employee_activation_failed: 'Employee record could not be activated.',
    employee_deactivation_failed: 'Employee record could not be deactivated.',
    internal_note_failed: 'Internal note could not be saved.',
    invalid_account_status: 'Invalid account status.',
    cannot_suspend_self: 'You cannot suspend your own account.',
    account_status_failed: 'Account status update failed.',
  },
} as const

function badge(value: string | boolean | null | undefined) {
  return (
    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
      {String(value ?? 'none').replaceAll('_', ' ')}
    </span>
  )
}

function employeeName(employee: EmployeeRow) {
  const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
  return profile?.full_name || profile?.email || `Employee ${employee.profile_id.slice(0, 8)}`
}

function assignedOpenCount(rows: WorkRow[], employeeId: string) {
  return rows.filter((row) => row.assigned_employee_id === employeeId && openWorkStatuses.includes(row.status)).length
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const successCode = getParam(params, 'success') as keyof typeof messages.success | undefined
  const errorCode = getParam(params, 'error') as keyof typeof messages.error | undefined
  const successMessage = successCode ? messages.success[successCode] : null
  const errorMessage = errorCode ? messages.error[errorCode] : null
  const [{ data: profiles }, employeesQuery, inspectionsQuery, maintenanceQuery, supportQuery] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'id,email,full_name,role,employee_role,customer_type,onboarding_status,onboarding_completed,verified,account_status,admin_notes,created_at',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('employees')
      .select('id,profile_id,employee_role,active,created_at,profiles(full_name,email)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('inspections').select('assigned_employee_id,status').limit(250),
    supabase.from('maintenance_requests').select('assigned_employee_id,status').limit(250),
    supabase.from('support_tickets').select('assigned_employee_id,status').limit(250),
  ])

  const rows = profiles ?? []
  const employees = (employeesQuery.data ?? []) as EmployeeRow[]
  const inspectionRows = (inspectionsQuery.data ?? []) as WorkRow[]
  const maintenanceRows = (maintenanceQuery.data ?? []) as WorkRow[]
  const supportRows = (supportQuery.data ?? []) as WorkRow[]
  const allWorkRows = [...inspectionRows, ...maintenanceRows, ...supportRows]
  const unassignedWork = allWorkRows.filter((row) => !row.assigned_employee_id && openWorkStatuses.includes(row.status)).length
  const workloadRows = employees.map((employee) => ({
    id: employee.id,
    name: employeeName(employee),
    role: employee.employee_role,
    active: employee.active,
    inspections: assignedOpenCount(inspectionRows, employee.id),
    maintenance: assignedOpenCount(maintenanceRows, employee.id),
    support: assignedOpenCount(supportRows, employee.id),
    total: assignedOpenCount(allWorkRows, employee.id),
  }))

  return (
    <div className="px-8 pb-12 pt-24">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">User management</p>
      <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">Profiles & Roles</h1>
      <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
        Role controls, account status, onboarding, and employee workload backed by Supabase profile and operations tables.
      </p>

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

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total shown', rows.length, 'Latest 100 profiles'],
          ['Admins', rows.filter((row) => row.role === 'admin').length, 'Control center access'],
          ['Employees', rows.filter((row) => row.role === 'employee').length, `${employees.length} employee records`],
          ['Completed onboarding', rows.filter((row) => row.onboarding_completed).length, 'Profile setup complete'],
          ['Verified profiles', rows.filter((row) => row.verified).length, 'Marked verified'],
          ['Customer accounts', rows.filter((row) => row.role === 'customer').length, 'Buyer / renter profiles'],
          ['Active employees', employees.filter((row) => row.active).length, 'Available staff'],
          ['Unassigned work', unassignedWork, 'Open operational rows'],
        ].map(([label, value, description]) => (
          <div key={label} className={cardClass}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
            <p className="mt-2 text-xs text-[#9CA3AF]">{description}</p>
          </div>
        ))}
      </section>

      <section className={`${cardClass} mt-8`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Employee workload</h2>
          <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">
            {unassignedWork} unassigned
          </span>
        </div>
        <div className="mt-5 overflow-x-auto">
          {workloadRows.length === 0 ? (
            <p className="py-10 text-sm text-[#6B7280]">No employee workload records found.</p>
          ) : (
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left">
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Employee</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Role</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Inspections</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Maintenance</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Support</th>
                  <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Total open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {workloadRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-4 pr-4">
                      <p className="font-sans text-sm font-semibold text-[#1F2937]">{row.name}</p>
                      <p className="mt-1 font-mono text-xs text-[#9CA3AF]">{row.active ? 'active' : 'inactive'}</p>
                    </td>
                    <td className="py-4 pr-4">{badge(row.role)}</td>
                    <td className="py-4 pr-4 font-mono text-sm font-bold text-[#1F2937]">{row.inspections}</td>
                    <td className="py-4 pr-4 font-mono text-sm font-bold text-[#1F2937]">{row.maintenance}</td>
                    <td className="py-4 pr-4 font-mono text-sm font-bold text-[#1F2937]">{row.support}</td>
                    <td className="py-4 font-mono text-sm font-bold text-[#C0392B]">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className={`${cardClass} mt-8`}>
        {rows.length === 0 ? (
          <p className="py-10 text-sm text-[#6B7280]">No profiles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left">
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">User</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Role</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Customer type</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Onboarding</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Status</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Created</th>
                  <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Admin controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="py-4 pr-4">
                      <p className="font-sans text-sm font-semibold text-[#1F2937]">
                        {row.full_name || row.email || 'Unnamed profile'}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[#9CA3AF]">{row.email || row.id}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {badge(row.role)}
                        {row.employee_role ? badge(row.employee_role) : null}
                      </div>
                    </td>
                    <td className="py-4 pr-4">{badge(row.customer_type)}</td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {badge(row.onboarding_status)}
                        {badge(row.onboarding_completed ? 'complete' : 'incomplete')}
                        {badge(row.verified ? 'verified' : 'unverified')}
                      </div>
                    </td>
                    <td className="py-4 pr-4">{badge(row.account_status)}</td>
                    <td className="py-4 pr-4 font-mono text-xs text-[#6B7280]">
                      {new Date(row.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4">
                      <div className="grid min-w-[520px] gap-3 lg:grid-cols-2">
                        <form action={assignUserRole} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                          <input type="hidden" name="profileId" value={row.id} />
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B7280]">Role</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select
                              name="role"
                              defaultValue={row.role ?? 'user'}
                              className="rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                            >
                              {ADMIN_USER_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role.replaceAll('_', ' ')}
                                </option>
                              ))}
                            </select>
                            <select
                              name="employeeRole"
                              defaultValue={row.employee_role ?? ''}
                              className="rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                            >
                              <option value="">No employee sub-role</option>
                              {ADMIN_EMPLOYEE_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role.replaceAll('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            name="note"
                            placeholder="Internal role note"
                            className="mt-2 w-full rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                          />
                          <button className="mt-2 w-full rounded-md bg-[#C0392B] px-3 py-2 text-xs font-semibold text-white" type="submit">
                            Update role
                          </button>
                        </form>

                        <form action={updateAccountStatus} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                          <input type="hidden" name="profileId" value={row.id} />
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B7280]">Account</p>
                          <select
                            name="accountStatus"
                            defaultValue={row.account_status ?? 'active'}
                            className="mt-2 w-full rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                          >
                            {ADMIN_ACCOUNT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <input
                            name="note"
                            placeholder="Internal status note"
                            className="mt-2 w-full rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                          />
                          <button className="mt-2 w-full rounded-md border border-[#C0392B] bg-white px-3 py-2 text-xs font-semibold text-[#C0392B]" type="submit">
                            Update status
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
