import Link from 'next/link'
import { updateEmployeeTask } from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ADMIN_EMPLOYEE_ROLES, ADMIN_TASK_PRIORITIES, ADMIN_TASK_STATUSES } from '@/lib/admin/status'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const openTaskStatuses = ['open', 'in_progress', 'blocked']
const openOperationalStatuses = ['open', 'assigned', 'in_progress', 'waiting_on_vendor', 'waiting_on_customer', 'requested', 'scheduled', 'needs_followup']
const reviewStatuses = ['submitted', 'under_review', 'needs_clarification', 'rejected']

type EmployeeRow = {
  id: string
  profile_id: string
  employee_role: string
  active: boolean
  created_at: string
  updated_at?: string | null
  profiles?: {
    full_name: string | null
    email: string | null
    account_status?: string | null
    verified?: boolean | null
  } | Array<{
    full_name: string | null
    email: string | null
    account_status?: string | null
    verified?: boolean | null
  }> | null
}

type TaskRow = {
  id: string
  entity_type: string
  entity_id: string
  assigned_employee_id: string
  status: string
  priority: string
  due_at: string | null
  escalation_level: number
  created_at: string
  updated_at: string
  completed_at?: string | null
  last_employee_note?: string | null
}

type AssignedWorkRow = {
  assigned_employee_id: string | null
  status: string | null
  priority?: string | null
}

type VerificationWorkRow = {
  assigned_employee_id: string | null
  verification_status?: string | null
  kyc_status?: string | null
}

type WorkLogRow = {
  id: string
  employee_id: string
  entity_type: string
  entity_id: string | null
  action: string
  previous_status: string | null
  new_status: string | null
  note: string | null
  created_at: string
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const messages = {
  success: {
    task_updated: 'Employee task updated and audit log recorded.',
  },
  error: {
    invalid_task_update: 'Task update is invalid. Check status, priority, and due date.',
    task_update_failed: 'Task update failed.',
  },
} as const

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function profileFor(employee: EmployeeRow) {
  return Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
}

function employeeName(employee: EmployeeRow) {
  const profile = profileFor(employee)
  return profile?.full_name || profile?.email || `Employee ${employee.profile_id.slice(0, 8)}`
}

function badge(value: string | number | boolean | null | undefined, tone: 'neutral' | 'red' | 'gold' | 'green' = 'neutral') {
  const tones = {
    neutral: 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]',
    red: 'border-red-200 bg-red-50 text-red-700',
    gold: 'border-[#E8D8A8] bg-[#FFF8E1] text-[#8A6D1D]',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${tones[tone]}`}>
      {String(value ?? 'none').replaceAll('_', ' ')}
    </span>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'No deadline'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function inputDateValue(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 16)
}

function isOverdue(task: TaskRow) {
  return Boolean(task.due_at && openTaskStatuses.includes(task.status) && new Date(task.due_at) < new Date())
}

function countAssigned(rows: AssignedWorkRow[], employeeId: string) {
  return rows.filter((row) => row.assigned_employee_id === employeeId && row.status && openOperationalStatuses.includes(row.status)).length
}

function verificationStatus(row: VerificationWorkRow) {
  return row.verification_status ?? row.kyc_status ?? null
}

export default async function AdminEmployeesPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const successCode = getParam(params, 'success') as keyof typeof messages.success | undefined
  const errorCode = getParam(params, 'error') as keyof typeof messages.error | undefined
  const successMessage = successCode ? messages.success[successCode] : null
  const errorMessage = errorCode ? messages.error[errorCode] : null

  const [
    employeesQuery,
    tasksQuery,
    inspectionsQuery,
    maintenanceQuery,
    supportQuery,
    propertiesQueue,
    sellersQueue,
    ownersQueue,
    customersQueue,
    documentsQueue,
    eventsQuery,
    workLogsQuery,
  ] = await Promise.all([
    supabase
      .from('employees')
      .select('id,profile_id,employee_role,active,created_at,updated_at,profiles(full_name,email,account_status,verified)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('admin_task_assignments')
      .select('id,entity_type,entity_id,assigned_employee_id,status,priority,due_at,escalation_level,created_at,updated_at,completed_at,last_employee_note')
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(150),
    supabase.from('inspections').select('assigned_employee_id,status').limit(500),
    supabase.from('maintenance_requests').select('assigned_employee_id,status,priority').limit(500),
    supabase.from('support_tickets').select('assigned_employee_id,status,priority').limit(500),
    supabase.from('properties').select('assigned_employee_id,verification_status').neq('verification_status', 'approved').limit(500),
    supabase.from('sellers').select('assigned_employee_id,verification_status').neq('verification_status', 'approved').limit(500),
    supabase.from('owners').select('assigned_employee_id,verification_status').neq('verification_status', 'approved').limit(500),
    supabase.from('customers').select('assigned_employee_id,kyc_status').neq('kyc_status', 'approved').limit(500),
    supabase.from('property_documents').select('assigned_employee_id,verification_status').neq('verification_status', 'approved').limit(500),
    supabase
      .from('verification_events')
      .select('id,entity_type,new_status,assigned_employee_id,priority,due_at,created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('employee_work_logs')
      .select('id,employee_id,entity_type,entity_id,action,previous_status,new_status,note,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const employees = (employeesQuery.data ?? []) as EmployeeRow[]
  const tasks = (tasksQuery.data ?? []) as TaskRow[]
  const inspectionRows = (inspectionsQuery.data ?? []) as AssignedWorkRow[]
  const maintenanceRows = (maintenanceQuery.data ?? []) as AssignedWorkRow[]
  const supportRows = (supportQuery.data ?? []) as AssignedWorkRow[]
  const verificationRows = [
    ...((propertiesQueue.data ?? []) as VerificationWorkRow[]),
    ...((sellersQueue.data ?? []) as VerificationWorkRow[]),
    ...((ownersQueue.data ?? []) as VerificationWorkRow[]),
    ...((customersQueue.data ?? []) as VerificationWorkRow[]),
    ...((documentsQueue.data ?? []) as VerificationWorkRow[]),
  ]
  const eventRows = eventsQuery.data ?? []
  const workLogRows = (workLogsQuery.data ?? []) as WorkLogRow[]
  const operationalRows = [...inspectionRows, ...maintenanceRows, ...supportRows]
  const openTasks = tasks.filter((task) => openTaskStatuses.includes(task.status))
  const overdueTasks = tasks.filter(isOverdue)
  const unassignedVerification = verificationRows.filter((row) => {
    const status = verificationStatus(row)
    return !row.assigned_employee_id && status && reviewStatuses.includes(status)
  }).length
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  const workloadRows = employees.map((employee) => {
    const assignedTasks = tasks.filter((task) => task.assigned_employee_id === employee.id)
    return {
      employee,
      taskCount: assignedTasks.filter((task) => openTaskStatuses.includes(task.status)).length,
      overdueCount: assignedTasks.filter(isOverdue).length,
      inspections: countAssigned(inspectionRows, employee.id),
      maintenance: countAssigned(maintenanceRows, employee.id),
      support: countAssigned(supportRows, employee.id),
      totalOperational: countAssigned(operationalRows, employee.id),
    }
  })
  const roleCounts = ADMIN_EMPLOYEE_ROLES.map((role) => ({
    role,
    total: employees.filter((employee) => employee.employee_role === role).length,
    active: employees.filter((employee) => employee.employee_role === role && employee.active).length,
  }))

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Workforce control</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">Employees & Task Load</h1>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
            Monitor employee roles, assigned work, verification deadlines, escalations, and operational queue pressure.
          </p>
        </div>
        <Link
          href="/admin/dashboard/users"
          className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB]"
        >
          Assign employee role
        </Link>
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

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Employee records', employees.length, `${employees.filter((employee) => employee.active).length} active`],
          ['Open admin tasks', openTasks.length, `${overdueTasks.length} overdue`],
          ['Operational workload', operationalRows.filter((row) => row.status && openOperationalStatuses.includes(row.status)).length, 'Inspections, support, maintenance'],
          ['Unassigned verification', unassignedVerification, 'Needs employee assignment'],
        ].map(([label, value, description]) => (
          <div key={label} className={cardClass}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
            <p className="mt-2 text-xs text-[#9CA3AF]">{description}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {roleCounts.map((row) => (
          <div key={row.role} className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{row.role.replaceAll('_', ' ')}</p>
              {badge(`${row.active}/${row.total}`, row.active ? 'green' : 'gold')}
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6B7280]">
              {row.total === 0 ? 'No employee assigned to this role yet.' : `${row.active} active staff member${row.active === 1 ? '' : 's'} available.`}
            </p>
          </div>
        ))}
      </section>

      <section className={`${cardClass} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Employee workload</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Live work count by employee across admin tasks and operations tables.</p>
          </div>
          {badge(`${unassignedVerification} unassigned verification`, unassignedVerification ? 'red' : 'green')}
        </div>
        <div className="mt-5 overflow-x-auto">
          {workloadRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
              <p className="font-serif text-xl font-semibold text-[#1F2937]">No employees yet</p>
              <p className="mt-2 text-sm text-[#6B7280]">
                Open User Management, set a profile role to employee, and choose a sub-role.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left">
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Employee</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Role</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Admin tasks</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Overdue</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Inspections</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Maintenance</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Support</th>
                  <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {workloadRows.map((row) => {
                  const profile = profileFor(row.employee)
                  return (
                    <tr key={row.employee.id}>
                      <td className="py-4 pr-4">
                        <p className="font-sans text-sm font-semibold text-[#1F2937]">{employeeName(row.employee)}</p>
                        <p className="mt-1 font-mono text-xs text-[#9CA3AF]">{profile?.email || row.employee.profile_id}</p>
                      </td>
                      <td className="py-4 pr-4">{badge(row.employee.employee_role)}</td>
                      <td className="py-4 pr-4 font-mono text-sm font-bold text-[#1F2937]">{row.taskCount}</td>
                      <td className="py-4 pr-4">{badge(row.overdueCount, row.overdueCount ? 'red' : 'green')}</td>
                      <td className="py-4 pr-4 font-mono text-sm font-bold text-[#1F2937]">{row.inspections}</td>
                      <td className="py-4 pr-4 font-mono text-sm font-bold text-[#1F2937]">{row.maintenance}</td>
                      <td className="py-4 pr-4 font-mono text-sm font-bold text-[#1F2937]">{row.support}</td>
                      <td className="py-4">{badge(row.employee.active ? 'active' : 'inactive', row.employee.active ? 'green' : 'gold')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className={`${cardClass} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Assigned task queue</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Tasks created from verification assignment actions, with deadlines and escalation tracking.</p>
          </div>
          {badge(`${tasks.length} tasks`)}
        </div>
        <div className="mt-5 overflow-x-auto">
          {tasks.length === 0 ? (
            <p className="py-10 text-sm text-[#6B7280]">No admin-assigned employee tasks yet. Assign one from Verification Center.</p>
          ) : (
            <table className="w-full min-w-[1120px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left">
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Task</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Employee</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Deadline</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Escalation</th>
                  <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Admin controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {tasks.map((task) => {
                  const employee = employeeById.get(task.assigned_employee_id)
                  const overdue = isOverdue(task)
                  return (
                    <tr key={task.id} className="align-top">
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {badge(task.entity_type)}
                          {badge(task.status, task.status === 'completed' ? 'green' : overdue ? 'red' : 'neutral')}
                          {badge(task.priority, task.priority === 'urgent' || task.priority === 'high' ? 'red' : 'gold')}
                        </div>
                        <p className="mt-2 font-mono text-xs text-[#9CA3AF]">{task.entity_id}</p>
                        {task.last_employee_note ? <p className="mt-2 max-w-lg text-xs text-[#6B7280]">Employee note: {task.last_employee_note}</p> : null}
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-sm font-semibold text-[#1F2937]">
                          {employee ? employeeName(employee) : `Employee ${task.assigned_employee_id.slice(0, 8)}`}
                        </p>
                        <p className="mt-1 font-mono text-xs text-[#9CA3AF]">
                          {employee?.employee_role.replaceAll('_', ' ') ?? 'unknown role'}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <p className={`text-sm font-semibold ${overdue ? 'text-red-700' : 'text-[#1F2937]'}`}>{formatDate(task.due_at)}</p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">Updated {formatDate(task.updated_at)}</p>
                      </td>
                      <td className="py-4 pr-4">{badge(task.escalation_level, task.escalation_level > 0 ? 'red' : 'neutral')}</td>
                      <td className="py-4">
                        <form action={updateEmployeeTask} className="grid min-w-[440px] gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                          <input type="hidden" name="taskId" value={task.id} />
                          <select
                            name="status"
                            defaultValue={task.status}
                            className="rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                          >
                            {ADMIN_TASK_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status.replaceAll('_', ' ')}
                              </option>
                            ))}
                          </select>
                          <select
                            name="priority"
                            defaultValue={task.priority}
                            className="rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                          >
                            {ADMIN_TASK_PRIORITIES.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                          <input
                            type="datetime-local"
                            name="dueAt"
                            defaultValue={inputDateValue(task.due_at)}
                            className="rounded-md border border-[#D1D5DB] bg-white px-2 py-2 text-xs text-[#1F2937]"
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-[#C0392B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A93226]"
                          >
                            Update
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className={`${cardClass} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Employee activity stream</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Status changes, field notes, and inspection reports submitted from employee dashboards.</p>
          </div>
          {badge(`${workLogRows.length} events`)}
        </div>
        <div className="mt-5 space-y-3">
          {workLogRows.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No employee activity has been logged yet.</p>
          ) : (
            workLogRows.map((log) => {
              const employee = employeeById.get(log.employee_id)
              return (
                <div key={log.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-sans text-sm font-semibold text-[#1F2937]">
                        {log.action.replaceAll('_', ' ')} · {log.entity_type.replaceAll('_', ' ')}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        {employee ? employeeName(employee) : `Employee ${log.employee_id.slice(0, 8)}`} · {formatDate(log.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {log.previous_status ? badge(log.previous_status) : null}
                      {log.new_status ? badge(log.new_status, ['completed', 'resolved', 'closed'].includes(log.new_status) ? 'green' : 'gold') : null}
                    </div>
                  </div>
                  {log.note ? <p className="mt-3 text-sm leading-6 text-[#6B7280]">{log.note}</p> : null}
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className={`${cardClass} mt-8`}>
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Recent verification worklog</h2>
        <div className="mt-5 space-y-3">
          {eventRows.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No verification events recorded yet.</p>
          ) : (
            eventRows.map((event) => {
              const employee = event.assigned_employee_id ? employeeById.get(event.assigned_employee_id) : null
              return (
                <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <div>
                    <p className="font-sans text-sm font-semibold text-[#1F2937]">
                      {event.entity_type.replaceAll('_', ' ')} moved to {event.new_status.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {employee ? `Assigned to ${employeeName(employee)}` : 'No employee assigned'} · {formatDate(event.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {badge(event.priority, event.priority === 'urgent' || event.priority === 'high' ? 'red' : 'gold')}
                    {event.due_at ? badge(formatDate(event.due_at)) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
