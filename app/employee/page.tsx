import type { ComponentType } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Headphones,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  TimerReset,
  Wrench,
} from 'lucide-react'
import { updateAssignedWorkItem, updateMyAdminTask } from './actions'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { ADMIN_TASK_STATUSES } from '@/lib/admin/status'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const selectClass =
  'rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const inputClass =
  'w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#1F2937] outline-none placeholder:text-[#9CA3AF] focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const openTaskStatuses = ['open', 'in_progress', 'blocked']
const openOperationalStatuses = ['open', 'assigned', 'in_progress', 'waiting_on_vendor', 'waiting_on_customer', 'requested', 'scheduled', 'needs_followup']

const workStatusByKind = {
  inspection: ['requested', 'scheduled', 'in_progress', 'completed', 'cancelled', 'needs_followup'],
  maintenance: ['open', 'assigned', 'in_progress', 'waiting_on_vendor', 'resolved', 'closed', 'cancelled'],
  support: ['open', 'assigned', 'in_progress', 'waiting_on_customer', 'waiting_on_admin', 'escalated', 'resolved', 'closed'],
} as const

const rolePlaybooks = {
  verification_agent: {
    title: 'Verification command desk',
    focus: 'Review submitted records, update verification work, and keep clarification loops moving.',
    checkpoints: ['Document completeness', 'KYC / ownership consistency', 'Clarification deadline', 'Admin escalation notes'],
    Icon: ShieldCheck,
  },
  field_inspection_agent: {
    title: 'Field inspection desk',
    focus: 'Run assigned site visits, submit field findings, and keep property evidence attached to the inspection record.',
    checkpoints: ['Visit schedule', 'Condition notes', 'Photo evidence paths', 'Next visit recommendation'],
    Icon: MapPin,
  },
  support_staff: {
    title: 'Support resolution desk',
    focus: 'Resolve customer issues, keep status history current, and escalate blocked service requests.',
    checkpoints: ['Customer waiting state', 'Vendor dependency', 'Resolution note', 'Follow-up requirement'],
    Icon: Headphones,
  },
} as const

type EmployeeDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type PropertySummary = {
  title: string | null
  city: string | null
  address: string | null
}

type PropertyBackedRow = {
  id: string
  property_id: string
  status: string
  priority?: string | null
  created_at: string
  properties?: PropertySummary | PropertySummary[] | null
}

type InspectionRow = PropertyBackedRow & {
  scheduled_for: string | null
  completed_at: string | null
  summary: string | null
  field_condition?: string | null
  issue_severity?: string | null
  action_required?: boolean | null
  employee_notes?: string | null
}

type MaintenanceRow = PropertyBackedRow & {
  title: string
  description: string | null
  employee_notes?: string | null
}

type SupportRow = PropertyBackedRow & {
  subject: string
  employee_notes?: string | null
}

type TaskRow = {
  id: string
  entity_type: string
  entity_id: string
  status: string
  priority: string
  due_at: string | null
  escalation_level: number
  created_at: string
  updated_at: string
  completed_at?: string | null
  last_employee_note?: string | null
}

type VerificationEventRow = {
  id: string
  entity_type: string
  entity_id: string
  previous_status: string | null
  new_status: string
  priority: string
  due_at: string | null
  note: string | null
  created_at: string
}

type WorkLogRow = {
  id: string
  entity_type: string
  entity_id: string | null
  action: string
  previous_status: string | null
  new_status: string | null
  note: string | null
  created_at: string
}

const messages = {
  success: {
    task_updated: 'Task status updated and logged.',
    work_updated: 'Operational item updated and logged.',
    inspection_reported: 'Inspection report submitted and synced to operations.',
  },
  error: {
    invalid_task_update: 'Choose a valid task status.',
    task_update_failed: 'Task update failed.',
    invalid_work_update: 'Choose a valid operational status.',
    work_update_failed: 'Operational update failed.',
    invalid_inspection_report: 'Inspection report needs a status, condition, severity, and clear summary.',
    inspection_report_failed: 'Inspection report failed to save.',
  },
} as const

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'No deadline'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function inputDateValue(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 16)
}

function statusLabel(value: string | number | boolean | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

function propertyFrom(row: PropertyBackedRow) {
  return Array.isArray(row.properties) ? row.properties[0] : row.properties
}

function isOpen(status: string | null | undefined) {
  return Boolean(status && (openTaskStatuses.includes(status) || openOperationalStatuses.includes(status)))
}

function isOverdue(value: string | null | undefined, status: string | null | undefined) {
  return Boolean(value && isOpen(status) && new Date(value) < new Date())
}

function isToday(value: string | null | undefined) {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.toDateString() === now.toDateString()
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
      {statusLabel(value)}
    </span>
  )
}

function WorkStatusForm({ kind, itemId, status }: { kind: keyof typeof workStatusByKind; itemId: string; status: string }) {
  return (
    <form action={updateAssignedWorkItem} className="space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="itemId" value={itemId} />
      <div className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={status} className={selectClass}>
          {workStatusByKind[kind].map((option) => (
            <option key={option} value={option}>
              {statusLabel(option)}
            </option>
          ))}
        </select>
        <PendingActionButton pendingText="Updating..." className="rounded-md bg-[#C0392B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A93226]">
          Update
        </PendingActionButton>
      </div>
      <textarea name="note" rows={2} className={inputClass} placeholder="Employee note for admin visibility" />
    </form>
  )
}

function MetricCard({ label, value, Icon, tone = 'neutral' }: { label: string; value: number | string; Icon: ComponentType<{ className?: string }>; tone?: 'neutral' | 'red' | 'gold' | 'green' }) {
  const color = tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-emerald-700' : 'text-[#C0392B]'
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
        <Icon className="h-5 w-5 text-[#C9A962]" />
      </div>
      <p className={`mt-3 font-mono text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default async function EmployeeDashboardPage({ searchParams }: EmployeeDashboardPageProps) {
  const { user, profile } = await requirePageRole(['employee', 'admin'])
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const successCode = getParam(params, 'success') as keyof typeof messages.success | undefined
  const errorCode = getParam(params, 'error') as keyof typeof messages.error | undefined
  const successMessage = successCode ? messages.success[successCode] : null
  const errorMessage = errorCode ? messages.error[errorCode] : null

  const { data: employee } = await supabase
    .from('employees')
    .select('id,profile_id,employee_role,active,created_at')
    .eq('profile_id', user.id)
    .maybeSingle()

  const employeeId = employee?.id ?? ''
  const [
    { data: tasks },
    { data: events },
    { data: inspections },
    { data: maintenance },
    { data: support },
    { data: workLogs },
  ] = await Promise.all([
    employeeId
      ? supabase
          .from('admin_task_assignments')
          .select('id,entity_type,entity_id,status,priority,due_at,escalation_level,created_at,updated_at,completed_at,last_employee_note')
          .eq('assigned_employee_id', employeeId)
          .order('due_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from('verification_events')
          .select('id,entity_type,entity_id,previous_status,new_status,priority,due_at,note,created_at')
          .eq('assigned_employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from('inspections')
          .select('id,property_id,status,scheduled_for,completed_at,summary,field_condition,issue_severity,action_required,employee_notes,created_at,properties(title,city,address)')
          .eq('assigned_employee_id', employeeId)
          .order('scheduled_for', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from('maintenance_requests')
          .select('id,property_id,title,description,priority,status,employee_notes,created_at,properties(title,city,address)')
          .eq('assigned_employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from('support_tickets')
          .select('id,property_id,subject,priority,status,employee_notes,created_at,properties(title,city,address)')
          .eq('assigned_employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from('employee_work_logs')
          .select('id,entity_type,entity_id,action,previous_status,new_status,note,created_at')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] }),
  ])

  const taskRows = (tasks ?? []) as TaskRow[]
  const eventRows = (events ?? []) as VerificationEventRow[]
  const inspectionRows = (inspections ?? []) as InspectionRow[]
  const maintenanceRows = (maintenance ?? []) as MaintenanceRow[]
  const supportRows = (support ?? []) as SupportRow[]
  const workLogRows = (workLogs ?? []) as WorkLogRow[]
  const openTasks = taskRows.filter((task) => openTaskStatuses.includes(task.status))
  const overdueTasks = taskRows.filter((task) => isOverdue(task.due_at, task.status))
  const dueTodayTasks = taskRows.filter((task) => isToday(task.due_at) && isOpen(task.status))
  const openOperations = [...inspectionRows, ...maintenanceRows, ...supportRows].filter((row) => isOpen(row.status))
  const urgentOperations = [...taskRows, ...maintenanceRows, ...supportRows].filter((row) => row.priority && ['urgent', 'high'].includes(row.priority) && isOpen(row.status))
  const completedToday = workLogRows.filter((log) => isToday(log.created_at) && ['completed', 'resolved', 'closed'].includes(log.new_status ?? '')).length
  const roleKey =
    employee?.employee_role && employee.employee_role in rolePlaybooks
      ? (employee.employee_role as keyof typeof rolePlaybooks)
      : 'support_staff'
  const roleBrief = rolePlaybooks[roleKey]
  const RoleIcon = roleBrief.Icon
  const userLabel = profile.full_name || profile.email || 'Employee'

  return (
    <RoleDashboardShell
      role="employee"
      title="Assigned workspace"
      subtitle="Admin tasks, verification events, inspections, maintenance, and support assigned to you."
      userLabel={userLabel}
      avatarUrl={profile.avatar_path}
      userId={user.id}
    >
      <section className="space-y-8 text-[#1F2937]">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Employee operations</p>
          <div className="mt-4 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <h1 className="font-serif text-4xl font-bold leading-tight text-[#1F2937]">Assigned workspace</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6B7280]">
                Work assigned to {userLabel}: admin tasks, verification events, inspections, maintenance, and support.
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">Employee status</p>
              <p className="mt-2 text-lg font-semibold text-[#C0392B]">
                {employee ? `${statusLabel(employee.employee_role)} · ${employee.active ? 'active' : 'inactive'}` : 'Record pending'}
              </p>
            </div>
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
            {successMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {!employee ? (
          <div className={cardClass}>
            <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Employee record pending</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              Your role can access this route, but there is no active employee operations record linked to this profile yet.
            </p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Open admin tasks" value={openTasks.length} Icon={ClipboardCheck} />
              <MetricCard label="Due today" value={dueTodayTasks.length} Icon={CalendarClock} tone={dueTodayTasks.length ? 'gold' : 'green'} />
              <MetricCard label="Overdue" value={overdueTasks.length} Icon={AlertTriangle} tone={overdueTasks.length ? 'red' : 'green'} />
              <MetricCard label="Completed today" value={completedToday} Icon={CheckCircle2} tone="green" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className={cardClass}>
                <div className="flex items-start gap-4">
                  <div className="rounded-xl border border-[#E8D8A8] bg-[#FFF8E1] p-3 text-[#8A6D1D]">
                    <RoleIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C9A962]">Role playbook</p>
                    <h2 className="mt-2 font-serif text-2xl font-semibold text-[#1F2937]">{roleBrief.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">{roleBrief.focus}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {roleBrief.checkpoints.map((checkpoint) => (
                    <div key={checkpoint} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#1F2937]">
                      {checkpoint}
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C9A962]">SLA pressure</p>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
                      <TimerReset className="h-4 w-4 text-[#C9A962]" /> Open operations
                    </span>
                    {badge(openOperations.length, openOperations.length ? 'gold' : 'green')}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
                      <AlertTriangle className="h-4 w-4 text-[#C9A962]" /> High priority work
                    </span>
                    {badge(urgentOperations.length, urgentOperations.length ? 'red' : 'green')}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
                      <FileText className="h-4 w-4 text-[#C9A962]" /> Verification events
                    </span>
                    {badge(eventRows.length)}
                  </div>
                </div>
              </div>
            </section>

            <section className={cardClass} id="tasks">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Admin task queue</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">Tasks assigned from verification and admin operations.</p>
                </div>
                {badge(`${taskRows.length} tasks`)}
              </div>
              <div className="mt-5 overflow-x-auto">
                {taskRows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#6B7280]">
                    No admin tasks are assigned to you right now.
                  </p>
                ) : (
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-left">
                        <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Task</th>
                        <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Deadline</th>
                        <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Priority</th>
                        <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {taskRows.map((task) => {
                        const overdue = isOverdue(task.due_at, task.status)
                        return (
                          <tr key={task.id} className="align-top">
                            <td className="py-4 pr-4">
                              <div className="flex flex-wrap gap-2">
                                {badge(task.entity_type)}
                                {badge(task.status, task.status === 'completed' ? 'green' : overdue ? 'red' : 'neutral')}
                              </div>
                              <p className="mt-2 font-mono text-xs text-[#9CA3AF]">{task.entity_id}</p>
                              {task.last_employee_note ? <p className="mt-2 max-w-md text-xs text-[#6B7280]">{task.last_employee_note}</p> : null}
                            </td>
                            <td className="py-4 pr-4">
                              <p className={`text-sm font-semibold ${overdue ? 'text-red-700' : 'text-[#1F2937]'}`}>{formatDate(task.due_at)}</p>
                              <p className="mt-1 text-xs text-[#9CA3AF]">Escalation {task.escalation_level}</p>
                            </td>
                            <td className="py-4 pr-4">{badge(task.priority, task.priority === 'urgent' || task.priority === 'high' ? 'red' : 'gold')}</td>
                            <td className="py-4">
                              <form action={updateMyAdminTask} className="min-w-[320px] space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                                <input type="hidden" name="taskId" value={task.id} />
                                <div className="flex flex-wrap items-center gap-2">
                                  <select name="status" defaultValue={task.status} className={selectClass}>
                                    {ADMIN_TASK_STATUSES.map((status) => (
                                      <option key={status} value={status}>
                                        {statusLabel(status)}
                                      </option>
                                    ))}
                                  </select>
                                  <PendingActionButton pendingText="Updating..." className="rounded-md bg-[#C0392B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A93226]">
                                    Update
                                  </PendingActionButton>
                                </div>
                                <textarea name="note" rows={2} className={inputClass} placeholder="Progress note for admin" />
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

            <section className="grid gap-6 xl:grid-cols-2" id="inspections">
              <div className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Inspection queue</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">Field visits are executed through the GPS-verified mobile field portal.</p>
                  </div>
                  <FileCheck2 className="h-5 w-5 text-[#C9A962]" />
                </div>
                <div className="mt-4 divide-y divide-[#E5E7EB]">
                  {inspectionRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No inspections assigned.</p> : null}
                  {inspectionRows.map((inspection) => {
                    const property = propertyFrom(inspection)
                    return (
                      <div key={inspection.id} className="space-y-4 py-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#1F2937]">{property?.title || 'Property title pending'}</p>
                            <p className="mt-1 text-xs text-[#9CA3AF]">{property?.city || property?.address || inspection.property_id}</p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {badge(inspection.status)}
                            {inspection.issue_severity ? badge(inspection.issue_severity, inspection.issue_severity === 'urgent' || inspection.issue_severity === 'high' ? 'red' : 'gold') : null}
                          </div>
                        </div>
                        <p className="text-xs text-[#6B7280]">{inspection.summary || `Scheduled ${formatDate(inspection.scheduled_for)}`}</p>
                        <p className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs text-[#6B7280]">
                          Assigned field agents capture evidence and submit review-ready reports from the Field Inspections portal.
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={`${cardClass} space-y-6`} id="operations">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Maintenance & support</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">Operational updates must include a note so admin can see the status trail.</p>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-[#C9A962]" />
                    <h3 className="font-serif text-xl font-semibold text-[#1F2937]">Maintenance</h3>
                  </div>
                  <div className="divide-y divide-[#E5E7EB]">
                    {maintenanceRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No maintenance requests assigned.</p> : null}
                    {maintenanceRows.map((request) => {
                      const property = propertyFrom(request)
                      return (
                        <div key={request.id} className="space-y-3 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#1F2937]">{request.title}</p>
                              <p className="mt-1 text-xs text-[#9CA3AF]">{property?.title || property?.city || request.property_id}</p>
                            </div>
                            {badge(request.priority, request.priority === 'urgent' || request.priority === 'high' ? 'red' : 'gold')}
                          </div>
                          <p className="text-xs text-[#6B7280]">{request.employee_notes || request.description || statusLabel(request.status)}</p>
                          <WorkStatusForm kind="maintenance" itemId={request.id} status={request.status} />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div id="support">
                  <div className="mb-3 flex items-center gap-2">
                    <Headphones className="h-5 w-5 text-[#C9A962]" />
                    <h3 className="font-serif text-xl font-semibold text-[#1F2937]">Support tickets</h3>
                  </div>
                  <div className="divide-y divide-[#E5E7EB]">
                    {supportRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No support tickets assigned.</p> : null}
                    {supportRows.map((ticket) => {
                      const property = propertyFrom(ticket)
                      return (
                        <div key={ticket.id} className="space-y-3 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#1F2937]">{ticket.subject}</p>
                              <p className="mt-1 text-xs text-[#9CA3AF]">{property?.title || property?.city || 'General support'}</p>
                            </div>
                            <MessageSquareText className="h-5 w-5 text-[#C9A962]" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {badge(ticket.status)}
                            {badge(ticket.priority, ticket.priority === 'urgent' || ticket.priority === 'high' ? 'red' : 'gold')}
                          </div>
                          {ticket.employee_notes ? <p className="text-xs text-[#6B7280]">{ticket.employee_notes}</p> : null}
                          <WorkStatusForm kind="support" itemId={ticket.id} status={ticket.status} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className={cardClass} id="verification">
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Verification worklog</h2>
                <div className="mt-5 space-y-3">
                  {eventRows.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No verification events are assigned to you yet.</p>
                  ) : (
                    eventRows.map((event) => (
                      <div key={event.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1F2937]">
                            {statusLabel(event.entity_type)} moved from {statusLabel(event.previous_status)} to {statusLabel(event.new_status)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {badge(event.priority, event.priority === 'urgent' || event.priority === 'high' ? 'red' : 'gold')}
                            {event.due_at ? badge(formatDate(event.due_at), isOverdue(event.due_at, event.new_status) ? 'red' : 'neutral') : null}
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-[#6B7280]">{event.note || event.entity_id}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={cardClass}>
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Daily activity log</h2>
                <div className="mt-5 space-y-3">
                  {workLogRows.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No employee activity has been logged yet.</p>
                  ) : (
                    workLogRows.map((log) => (
                      <div key={log.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1F2937]">
                            {statusLabel(log.action)} · {statusLabel(log.entity_type)}
                          </p>
                          {badge(formatDate(log.created_at))}
                        </div>
                        <p className="mt-2 text-xs text-[#6B7280]">
                          {log.previous_status ? `${statusLabel(log.previous_status)} → ${statusLabel(log.new_status)}` : statusLabel(log.new_status)}
                          {log.note ? ` · ${log.note}` : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </RoleDashboardShell>
  )
}
