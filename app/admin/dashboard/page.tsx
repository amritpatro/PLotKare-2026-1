import Link from 'next/link'
import { WorkloadPerformanceChart } from '@/components/admin/workload-performance-chart'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const openTicketStatuses = ['open', 'assigned', 'in_progress', 'waiting_on_customer']
const openWorkStatuses = ['requested', 'scheduled', 'in_progress', 'needs_followup', 'open', 'assigned', 'waiting_on_vendor']
const terminalWorkStatuses = ['completed', 'resolved', 'closed', 'cancelled']
const reviewStatuses = ['submitted', 'under_review', 'needs_clarification', 'rejected'] as const

type TimedWorkRow = {
  id: string
  status: string
  created_at: string
  updated_at?: string | null
  scheduled_for?: string | null
  assigned_employee_id?: string | null
  title?: string | null
  subject?: string | null
  priority?: string | null
  summary?: string | null
}

type EmployeeRow = {
  id: string
  profile_id: string
  employee_role: string
  active: boolean
  profiles?: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
}

type PipelineItem = {
  label: string
  href: string
  rows: Array<{ status: string | null }>
}

async function countRows(table: string, filters?: (query: any) => any) {
  const supabase = await createSupabaseServerClient()
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filters) query = filters(query)
  const { count } = await query
  return count ?? 0
}

function formatStatus(value: string | null | undefined) {
  return String(value ?? 'none').replaceAll('_', ' ')
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function employeeName(employee: EmployeeRow) {
  const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
  return profile?.full_name || profile?.email || `Employee ${employee.profile_id.slice(0, 8)}`
}

function statusCount(rows: Array<{ status: string | null }>, status: string) {
  return rows.filter((row) => row.status === status).length
}

function buildPerformanceData(rows: TimedWorkRow[]) {
  const today = startOfDay(new Date())
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const nextDate = new Date(date)
    nextDate.setDate(date.getDate() + 1)

    const opened = rows.filter((row) => {
      const created = new Date(row.created_at)
      return created >= date && created < nextDate
    }).length

    const closed = rows.filter((row) => {
      if (!terminalWorkStatuses.includes(row.status) || !row.updated_at) return false
      const updated = new Date(row.updated_at)
      return updated >= date && updated < nextDate
    }).length

    return {
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      opened,
      closed,
    }
  })
}

export default async function AdminOverviewPage() {
  const supabase = await createSupabaseServerClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const staleCutoff = new Date()
  staleCutoff.setDate(staleCutoff.getDate() - 3)

  const [
    totalProfiles,
    sellers,
    owners,
    customers,
    properties,
    pendingProperties,
    openSupportCount,
    recentAudit,
    propertyQueue,
    sellerQueue,
    ownerQueue,
    customerQueue,
    documentQueue,
    employeesQuery,
    inspectionsQuery,
    maintenanceQuery,
    supportTicketsQuery,
    notificationsQuery,
  ] = await Promise.all([
    countRows('profiles'),
    countRows('sellers'),
    countRows('owners'),
    countRows('customers'),
    countRows('properties'),
    countRows('properties', (query) => query.neq('verification_status', 'approved')),
    countRows('support_tickets', (query) => query.in('status', openTicketStatuses)),
    supabase
      .from('audit_logs')
      .select('id,action,entity_type,created_at')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('properties')
      .select('id,title,property_kind,city,verification_status,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('sellers')
      .select('id,company_name,verification_status,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('owners')
      .select('id,profile_id,verification_status,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('customers')
      .select('id,full_name,email,kyc_status,account_status,created_at')
      .neq('kyc_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('property_documents')
      .select('id,title,document_type,verification_status,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('employees')
      .select('id,profile_id,employee_role,active,profiles(full_name,email)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('inspections')
      .select('id,status,created_at,updated_at,scheduled_for,assigned_employee_id,summary')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('maintenance_requests')
      .select('id,title,priority,status,created_at,updated_at,assigned_employee_id')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('support_tickets')
      .select('id,subject,priority,status,created_at,updated_at,assigned_employee_id')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('notifications')
      .select('id,title,message,category,read_at,created_at')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const activityRows = recentAudit.data ?? []
  const propertyRows = propertyQueue.data ?? []
  const sellerRows = sellerQueue.data ?? []
  const ownerRows = ownerQueue.data ?? []
  const customerRows = customerQueue.data ?? []
  const documentRows = documentQueue.data ?? []
  const employeeRows = (employeesQuery.data ?? []) as EmployeeRow[]
  const inspectionRows = (inspectionsQuery.data ?? []) as TimedWorkRow[]
  const maintenanceRows = (maintenanceQuery.data ?? []) as TimedWorkRow[]
  const supportRows = (supportTicketsQuery.data ?? []) as TimedWorkRow[]
  const notificationRows = notificationsQuery.data ?? []
  const allWorkRows = [...inspectionRows, ...maintenanceRows, ...supportRows]
  const openWorkRows = allWorkRows.filter((row) => openWorkStatuses.includes(row.status))
  const performanceData = buildPerformanceData(allWorkRows.filter((row) => new Date(row.created_at) >= sevenDaysAgo))
  const pipeline: PipelineItem[] = [
    { label: 'Properties', href: '/admin/dashboard/verification', rows: propertyRows.map((row) => ({ status: row.verification_status })) },
    { label: 'Sellers', href: '/admin/dashboard/verification', rows: sellerRows.map((row) => ({ status: row.verification_status })) },
    { label: 'Owners', href: '/admin/dashboard/verification', rows: ownerRows.map((row) => ({ status: row.verification_status })) },
    { label: 'Customers', href: '/admin/dashboard/verification', rows: customerRows.map((row) => ({ status: row.kyc_status })) },
    { label: 'Documents', href: '/admin/dashboard/verification', rows: documentRows.map((row) => ({ status: row.verification_status })) },
  ]
  const totalPending =
    propertyRows.length + sellerRows.length + ownerRows.length + customerRows.length + documentRows.length
  const upcomingDeadlines = inspectionRows
    .filter((row) => row.scheduled_for && !['completed', 'cancelled'].includes(row.status))
    .sort((a, b) => new Date(a.scheduled_for || '').getTime() - new Date(b.scheduled_for || '').getTime())
    .slice(0, 6)
  const highPriorityTickets = supportRows.filter(
    (row) => openTicketStatuses.includes(row.status) && ['high', 'urgent'].includes(row.priority || ''),
  )
  const staleVerificationCount = [...propertyRows, ...sellerRows, ...ownerRows, ...documentRows].filter(
    (row) => new Date(row.created_at) < staleCutoff,
  ).length
  const alerts = [
    { label: 'Urgent or high-priority support tickets', value: highPriorityTickets.length, href: '/admin/dashboard' },
    { label: 'Verification items older than 3 days', value: staleVerificationCount, href: '/admin/dashboard/verification' },
    { label: 'Unread notifications', value: notificationRows.length, href: '/admin/dashboard' },
  ]
  const workloadRows = employeeRows.map((employee) => {
    const assigned = openWorkRows.filter((row) => row.assigned_employee_id === employee.id)
    return {
      id: employee.id,
      name: employeeName(employee),
      role: employee.employee_role,
      active: employee.active,
      inspections: inspectionRows.filter((row) => row.assigned_employee_id === employee.id && openWorkStatuses.includes(row.status)).length,
      tickets: supportRows.filter((row) => row.assigned_employee_id === employee.id && openWorkStatuses.includes(row.status)).length,
      maintenance: maintenanceRows.filter((row) => row.assigned_employee_id === employee.id && openWorkStatuses.includes(row.status)).length,
      total: assigned.length,
    }
  })
  const unassignedWork = openWorkRows.filter((row) => !row.assigned_employee_id).length

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Admin control center</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">Operations Overview</h1>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
            Live platform counts, review queues, team workload, and operational alerts from Supabase.
          </p>
        </div>
        <Link
          href="/admin/dashboard/verification"
          className="inline-flex items-center justify-center rounded-lg bg-[#C0392B] px-4 py-2.5 font-sans text-sm font-semibold text-white shadow-sm transition hover:bg-[#A93226]"
        >
          Open approval pipeline
        </Link>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Profiles', totalProfiles, 'Registered accounts'],
          ['Properties', properties, 'Platform inventory'],
          ['Pending approvals', totalPending, `${pendingProperties} property records`],
          ['Open support', openSupportCount, `${highPriorityTickets.length} high priority`],
          ['Sellers', sellers, 'Business accounts'],
          ['Owners', owners, 'Land owner accounts'],
          ['Customers', customers, 'Buyer / renter accounts'],
          ['Open operations', openWorkRows.length, `${unassignedWork} unassigned`],
        ].map(([label, value, description]) => (
          <div key={label} className={cardClass}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
            <p className="mt-2 font-sans text-xs text-[#9CA3AF]">{description}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Workload performance</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Opened vs. completed operational work over the last 7 days.</p>
            </div>
            <div className="flex gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#C0392B]" />Opened</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#C9A962]" />Closed</span>
            </div>
          </div>
          <div className="mt-6">
            <WorkloadPerformanceChart data={performanceData} />
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Alerts</h2>
            <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">
              {alerts.reduce((sum, alert) => sum + alert.value, 0)} total
            </span>
          </div>
          <div className="mt-4 divide-y divide-[#E5E7EB]">
            {alerts.every((alert) => alert.value === 0) ? (
              <p className="py-6 text-sm text-[#6B7280]">No operational alerts are active.</p>
            ) : null}
            {alerts.map((alert) => (
              <Link key={alert.label} href={alert.href} className="flex items-center justify-between gap-4 py-4">
                <span className="font-sans text-sm font-semibold text-[#1F2937]">{alert.label}</span>
                <span className="font-mono text-xl font-bold text-[#C0392B]">{alert.value}</span>
              </Link>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-[#F9FAFB] p-4">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">Latest notifications</p>
            <div className="mt-3 space-y-3">
              {notificationRows.length === 0 ? <p className="text-sm text-[#9CA3AF]">No unread notifications.</p> : null}
              {notificationRows.slice(0, 3).map((row) => (
                <div key={row.id}>
                  <p className="truncate text-sm font-semibold text-[#1F2937]">{row.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">{row.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Approval pipeline</h2>
            <Link href="/admin/dashboard/verification" className="text-sm font-semibold text-[#C0392B]">
              Review queue
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {pipeline.map((item) => {
              const total = item.rows.length
              return (
                <div key={item.label} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-sans text-sm font-semibold text-[#1F2937]">{item.label}</p>
                    <span className="font-mono text-sm font-bold text-[#C0392B]">{total}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {reviewStatuses.map((status) => (
                      <div key={status} className="rounded-md bg-white px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">
                          {formatStatus(status)}
                        </p>
                        <p className="mt-1 font-mono text-lg font-bold text-[#1F2937]">{statusCount(item.rows, status)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Employee workload</h2>
            <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">
              {unassignedWork} unassigned
            </span>
          </div>
          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {workloadRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No employee records found.</p> : null}
            {workloadRows.map((row) => (
              <div key={row.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="font-sans text-sm font-semibold text-[#1F2937]">{row.name}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">
                    {formatStatus(row.role)} · {row.active ? 'active' : 'inactive'}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Inspections', row.inspections],
                    ['Tickets', row.tickets],
                    ['Maint.', row.maintenance],
                    ['Total', row.total],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-20 rounded-lg bg-[#F9FAFB] px-3 py-2">
                      <p className="font-mono text-base font-bold text-[#1F2937]">{value}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={cardClass}>
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Upcoming deadlines</h2>
          <div className="mt-4 divide-y divide-[#E5E7EB]">
            {upcomingDeadlines.length === 0 ? (
              <p className="py-6 text-sm text-[#6B7280]">No scheduled inspections are waiting on a deadline.</p>
            ) : null}
            {upcomingDeadlines.map((row) => (
              <div key={row.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="font-sans text-sm font-semibold text-[#1F2937]">
                    {row.summary || 'Inspection scheduled'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#9CA3AF]">{formatStatus(row.status)}</p>
                </div>
                <p className="font-mono text-xs font-semibold text-[#C0392B]">{formatDate(row.scheduled_for || row.created_at)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Recent audit activity</h2>
            <Link
              href="/admin/dashboard/audit"
              className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 font-sans text-sm font-semibold text-[#1F2937] transition hover:border-[#C0392B] hover:text-[#C0392B]"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 divide-y divide-[#E5E7EB]">
            {activityRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No audit activity recorded yet.</p> : null}
            {activityRows.map((row) => (
              <div key={row.id} className="py-3">
                <p className="font-sans text-sm font-semibold text-[#1F2937]">{row.action}</p>
                <p className="mt-1 font-mono text-xs text-[#9CA3AF]">
                  {row.entity_type} · {formatDate(row.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
