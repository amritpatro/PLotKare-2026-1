import { Suspense } from 'react'
import Link from 'next/link'
import { reviewCustomerPropertyRequest, updateVerificationStatus } from './actions'
import { CustomerContextPanel, CustomerContextPanelSkeleton } from '@/components/admin/customer-context-panel'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ADMIN_TASK_PRIORITIES } from '@/lib/admin/status'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const pipelineStatuses = ['submitted', 'under_review', 'needs_clarification', 'rejected'] as const
const openTicketStatuses = ['open', 'assigned', 'in_progress', 'waiting_on_customer']

type VerificationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type QueueItem = {
  id: string
  title: string
  meta: string
  status: string
  entityType: 'property' | 'seller' | 'owner' | 'customer' | 'document'
  createdAt: string
  assignedEmployeeId: string | null
  priority: string | null
  dueAt: string | null
  escalationLevel: number | null
  customerProfileId?: string | null
  verificationSummary?: string | null
}

type EmployeeOption = {
  id: string
  label: string
}

const messages = {
  success: {
    verification_updated: 'Verification status updated and audit log recorded.',
  },
  error: {
    invalid_verification_action: 'Invalid verification action. Refresh and try again.',
    invalid_employee_assignment: 'Only active verification agents can be assigned from this screen.',
    verification_update_failed: 'Could not update verification status. Check permissions and try again.',
  },
} as const

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

import StatusBadge from '@/components/ui/status-badge'

function formatStatus(value: string | null | undefined) {
  return String(value ?? 'none').replaceAll('_', ' ')
}

function statusCount(rows: QueueItem[], status: string) {
  return rows.filter((row) => row.status === status).length
}

function formatAge(value: string | null | undefined) {
  if (!value) return 'Just now'
  const diffMs = Date.now() - new Date(value).getTime()
  const diffHours = Math.max(0, Math.round(diffMs / 36e5))
  if (diffHours < 24) return `${diffHours || 1} hour${diffHours === 1 ? '' : 's'}`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'}`
}

export default async function AdminVerificationPage({ searchParams }: VerificationPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const successCode = getParam(params, 'success') as keyof typeof messages.success | undefined
  const errorCode = getParam(params, 'error') as keyof typeof messages.error | undefined
  const successMessage = successCode ? messages.success[successCode] : null
  const errorMessage = errorCode ? messages.error[errorCode] : null

  const [
    { data: properties },
    { data: sellers },
    { data: owners },
    { data: customers },
    { data: documents },
    { data: inspections },
    { data: supportTickets },
    { data: notifications },
    { data: employees },
    { data: propertyLinkRequests },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('id,title,property_kind,city,state,owner_profile_id,verification_status,assigned_employee_id,priority,due_at,escalation_level,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('sellers')
      .select('id,profile_id,company_name,gst_number,pan_number,verification_status,admin_notes,assigned_employee_id,priority,due_at,escalation_level,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('owners')
      .select('id,profile_id,verification_status,admin_notes,assigned_employee_id,priority,due_at,escalation_level,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('customers')
      .select('id,profile_id,full_name,email,phone,aadhaar_last4,pan_number,kyc_status,account_status,assigned_employee_id,priority,due_at,escalation_level,created_at')
      .neq('kyc_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('property_documents')
      .select('id,title,document_type,category,uploaded_by,customer_id,property_id,verification_status,assigned_employee_id,priority,due_at,escalation_level,created_at')
      .neq('verification_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(25),
      supabase
        .from('inspections')
        .select('id,status,scheduled_for,summary,created_at')
        .not('scheduled_for', 'is', null)
        .not('status', 'in', '(completed,cancelled)')
        .order('scheduled_for', { ascending: true })
        .limit(5),
      supabase
        .from('support_tickets')
        .select('id,subject,priority,status,created_at')
        .in('status', openTicketStatuses)
        .order('created_at', { ascending: false })
        .limit(25),
      supabase
        .from('notifications')
        .select('id,title,category,read_at,created_at')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('employees')
        .select('id,employee_role,active,profiles(full_name,email)')
        .eq('active', true)
        .eq('employee_role', 'verification_agent')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('customer_property_requests')
        .select('id,property_title,property_kind,address,city,state,relationship_type,status,review_notes,assigned_employee_id,created_at')
        .neq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

  const employeeOptions: EmployeeOption[] = (employees ?? []).map((employee) => {
    const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles
    return {
      id: employee.id,
      label: `${profile?.full_name || profile?.email || `Employee ${employee.id.slice(0, 8)}`} · ${employee.employee_role.replaceAll('_', ' ')}`,
    }
  })
  const employeeById = new Map(employeeOptions.map((employee) => [employee.id, employee.label]))

  const propertyRows: QueueItem[] = (properties ?? []).map((row) => ({
    id: row.id,
    title: row.title || 'Untitled property',
    meta: `${row.property_kind || 'property'} · ${row.city || 'city pending'}${row.state ? `, ${row.state}` : ''}`,
    status: row.verification_status,
    entityType: 'property',
    createdAt: row.created_at,
    assignedEmployeeId: row.assigned_employee_id,
    priority: row.priority,
    dueAt: row.due_at,
    escalationLevel: row.escalation_level,
    customerProfileId: row.owner_profile_id,
  }))

  const sellerRows: QueueItem[] = (sellers ?? []).map((row) => ({
    id: row.id,
    title: row.company_name || 'Seller profile',
    meta: row.admin_notes ? `Note: ${row.admin_notes}` : 'Business seller verification',
    status: row.verification_status,
    entityType: 'seller',
    createdAt: row.created_at,
    assignedEmployeeId: row.assigned_employee_id,
    priority: row.priority,
    dueAt: row.due_at,
    escalationLevel: row.escalation_level,
    customerProfileId: row.profile_id,
  }))

  const ownerRows: QueueItem[] = (owners ?? []).map((row) => ({
    id: row.id,
    title: `Owner ${row.profile_id.slice(0, 8)}`,
    meta: row.admin_notes ? `Note: ${row.admin_notes}` : 'Land owner verification',
    status: row.verification_status,
    entityType: 'owner',
    createdAt: row.created_at,
    assignedEmployeeId: row.assigned_employee_id,
    priority: row.priority,
    dueAt: row.due_at,
    escalationLevel: row.escalation_level,
    customerProfileId: row.profile_id,
  }))

  const customerRows: QueueItem[] = (customers ?? []).map((row) => ({
    id: row.id,
    title: row.full_name || row.email || 'Customer profile',
    meta: `${row.email || 'email pending'} · ${row.account_status || 'account status pending'}`,
    status: row.kyc_status,
    entityType: 'customer',
    createdAt: row.created_at,
    assignedEmployeeId: row.assigned_employee_id,
    priority: row.priority,
    dueAt: row.due_at,
    escalationLevel: row.escalation_level,
    customerProfileId: row.profile_id,
  }))

  const documentRows: QueueItem[] = (documents ?? []).map((row) => ({
    id: row.id,
    title: row.title || 'Untitled document',
    meta: row.document_type || 'Document type pending',
    status: row.verification_status,
    entityType: 'document',
    createdAt: row.created_at,
    assignedEmployeeId: row.assigned_employee_id,
    priority: row.priority,
    dueAt: row.due_at,
    escalationLevel: row.escalation_level,
    customerProfileId: row.uploaded_by,
  }))

  const documentLabelsByProfile = new Map<string, string[]>()
  ;(documents ?? []).forEach((row: any) => {
    const label = row.document_type || row.title || 'Document'
    const profileId = row.uploaded_by as string | null | undefined
    if (!profileId) return
    const existing = documentLabelsByProfile.get(profileId) ?? []
    if (existing.length < 4) {
      existing.push(label)
      documentLabelsByProfile.set(profileId, existing)
    }
  })

  const propertyDocumentLabelsByProperty = new Map<string, string[]>()
  ;(documents ?? []).forEach((row: any) => {
    const label = row.document_type || row.title || 'Document'
    const propertyId = row.property_id as string | null | undefined
    if (!propertyId) return
    const existing = propertyDocumentLabelsByProperty.get(propertyId) ?? []
    if (existing.length < 4) {
      existing.push(label)
      propertyDocumentLabelsByProperty.set(propertyId, existing)
    }
  })

  const verificationSummaryForRow = (row: QueueItem) => {
    if (row.entityType === 'seller') {
      const labels = row.customerProfileId ? documentLabelsByProfile.get(row.customerProfileId) ?? [] : []
      const seller = (sellers ?? []).find((item: any) => item.id === row.id)
      return [
        `GST ${seller?.gst_number || 'pending'}`,
        `PAN ${seller?.pan_number || 'pending'}`,
        labels.length ? `Docs: ${labels.join(', ')}` : 'No attached documents yet',
      ].join(' · ')
    }

    if (row.entityType === 'owner') {
      const labels = row.customerProfileId ? documentLabelsByProfile.get(row.customerProfileId) ?? [] : []
      return labels.length ? `Docs: ${labels.join(', ')}` : 'No attached documents yet'
    }

    if (row.entityType === 'customer') {
      const customer = (customers ?? []).find((item: any) => item.id === row.id)
      return [
        `PAN ${customer?.pan_number || 'pending'}`,
        `Aadhaar ${customer?.aadhaar_last4 ? `•••• ${customer.aadhaar_last4}` : 'pending'}`,
      ].join(' · ')
    }

    if (row.entityType === 'property') {
      const labels = row.id ? propertyDocumentLabelsByProperty.get(row.id) ?? [] : []
      return labels.length ? `Submitted docs: ${labels.join(', ')}` : 'Property verification in queue'
    }

    if (row.entityType === 'document') {
      const document = (documents ?? []).find((item: any) => item.id === row.id)
      return [document?.document_type || document?.title || 'Document review', document?.category || 'Document'].filter(Boolean).join(' · ')
    }

    return null
  }

  propertyRows.forEach((row) => {
    row.verificationSummary = verificationSummaryForRow(row)
  })
  sellerRows.forEach((row) => {
    row.verificationSummary = verificationSummaryForRow(row)
  })
  ownerRows.forEach((row) => {
    row.verificationSummary = verificationSummaryForRow(row)
  })
  customerRows.forEach((row) => {
    row.verificationSummary = verificationSummaryForRow(row)
  })
  documentRows.forEach((row) => {
    row.verificationSummary = verificationSummaryForRow(row)
  })

  const kycRows = [...customerRows, ...ownerRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const propertyDocumentRows = [...propertyRows, ...documentRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const businessRows = [...sellerRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalPending =
    propertyRows.length + sellerRows.length + ownerRows.length + customerRows.length + documentRows.length
  const pipelineSections = [
    { label: 'Properties', rows: propertyRows },
    { label: 'Sellers', rows: sellerRows },
    { label: 'Owners', rows: ownerRows },
    { label: 'Customers', rows: customerRows },
    { label: 'Documents', rows: documentRows },
  ]
  const staleCutoff = new Date()
  staleCutoff.setDate(staleCutoff.getDate() - 3)
  const staleReviewCount = [...propertyRows, ...sellerRows, ...ownerRows, ...customerRows, ...documentRows].filter(
    (row) => new Date(row.createdAt) < staleCutoff,
  ).length
  const highPriorityTickets = (supportTickets ?? []).filter((row) => ['high', 'urgent'].includes(row.priority ?? ''))

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Verification center</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">Review Queue</h1>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
            Approve, reject, or request clarification for platform records. Every admin action is written to the audit log.
          </p>
        </div>
        <Link
          href="/admin/dashboard/audit"
          className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 font-sans text-sm font-semibold text-[#1F2937] transition hover:border-[#C0392B] hover:text-[#C0392B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B]/20"
        >
          View audit logs
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

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total pending', totalPending],
          ['Properties', propertyRows.length],
          ['Sellers', sellerRows.length],
          ['Owners', ownerRows.length],
          ['Customers + docs', customerRows.length + documentRows.length],
        ].map(([label, value]) => (
          <div key={label} className={cardClass}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Approval pipeline</h2>
            <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">
              {staleReviewCount} older than 3 days
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {pipelineSections.map((section) => (
              <div key={section.label} className="grid gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 md:grid-cols-[150px_1fr]">
                <div>
                  <p className="font-sans text-sm font-semibold text-[#1F2937]">{section.label}</p>
                  <p className="mt-1 font-mono text-xs text-[#C0392B]">{section.rows.length} open</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {pipelineStatuses.map((status) => (
                    <div key={status} className="rounded-md bg-white px-3 py-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">
                        {formatStatus(status)}
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold text-[#1F2937]">
                        {statusCount(section.rows, status)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Alerts & deadlines</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['High support', highPriorityTickets.length],
              ['Unread alerts', notifications?.length ?? 0],
              ['Deadlines', inspections?.length ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#F9FAFB] px-3 py-3 text-center">
                <p className="font-mono text-lg font-bold text-[#C0392B]">{value}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {(inspections ?? []).length === 0 ? (
              <p className="py-5 text-sm text-[#6B7280]">No scheduled inspection deadlines are waiting.</p>
            ) : null}
            {(inspections ?? []).map((row) => (
              <div key={row.id} className="py-3">
                <p className="font-sans text-sm font-semibold text-[#1F2937]">{row.summary || 'Inspection scheduled'}</p>
                <p className="mt-1 font-mono text-xs text-[#9CA3AF]">
                  {formatStatus(row.status)} · {new Date(row.scheduled_for ?? row.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-6">
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Customer property link requests</h2>
            <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">{propertyLinkRequests?.length ?? 0} open</span>
          </div>
          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {(propertyLinkRequests ?? []).length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No property link requests need review.</p> : null}
            {(propertyLinkRequests ?? []).map((request: any) => (
              <div key={request.id} className="grid gap-4 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-3"><p className="font-semibold text-[#1F2937]">{request.property_title}</p><StatusBadge status={request.status} /></div>
                  <p className="mt-2 text-sm text-[#6B7280]">{request.property_kind} · {request.address}, {request.city}, {request.state} · {request.relationship_type}</p>
                  {request.review_notes ? <p className="mt-2 text-sm text-[#6B7280]">{request.review_notes}</p> : null}
                </div>
                <form action={reviewCustomerPropertyRequest} className="grid gap-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input name="note" className={inputClass} placeholder="Review note or clarification needed" />
                  <select name="assignedEmployeeId" defaultValue={request.assigned_employee_id ?? ''} className={inputClass}>
                    <option value="">No reviewer</option>
                    {employeeOptions.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {['under_review', 'approved', 'rejected', 'needs_clarification'].map((status) => (
                      <PendingActionButton key={status} pendingText="Saving..." name="status" value={status} className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition hover:border-[#C0392B] hover:text-[#C0392B]">
                        {formatStatus(status)}
                      </PendingActionButton>
                    ))}
                  </div>
                </form>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <nav className="flex flex-wrap gap-2">
            <a href="#kyc-verification" className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-sm font-medium hover:bg-[#F9FAFB]">KYC verification</a>
            <a href="#property-document-verification" className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-sm font-medium hover:bg-[#F9FAFB]">Property document verification</a>
            <a href="#business-verification" className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-sm font-medium hover:bg-[#F9FAFB]">Business verification</a>
          </nav>
        </div>

        <div id="kyc-verification">
          <VerificationSection
            title="KYC Verification"
            empty="No KYC items need review."
            rows={kycRows}
            employeeOptions={employeeOptions}
            employeeById={employeeById}
          />
        </div>

        <div id="property-document-verification">
          <VerificationSection
            title="Property Document Verification"
            empty="No property documents need review."
            rows={propertyDocumentRows}
            employeeOptions={employeeOptions}
            employeeById={employeeById}
          />
        </div>

        <div id="business-verification">
          <VerificationSection
            title="Business Verification"
            empty="No business sellers need review."
            rows={businessRows}
            employeeOptions={employeeOptions}
            employeeById={employeeById}
          />
        </div>
      </section>
    </div>
  )
}

function VerificationSection({
  title,
  empty,
  rows,
  employeeOptions,
  employeeById,
}: {
  title: string
  empty: string
  rows: QueueItem[]
  employeeOptions: EmployeeOption[]
  employeeById: Map<string, string>
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">{title}</h2>
        <span className="rounded-full bg-[#F9FAFB] px-3 py-1 font-mono text-xs text-[#6B7280]">{rows.length} open</span>
      </div>

      <div className="mt-5 divide-y divide-[#E5E7EB]">
        {rows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">{empty}</p> : null}
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid gap-4 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]"
            data-verification-title={row.title}
          >
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-sans text-sm font-semibold text-[#1F2937]">{row.title}</p>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-2 font-sans text-sm text-[#6B7280]">{row.meta}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">
                {new Date(row.createdAt).toLocaleString('en-IN')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                  {row.priority || 'normal'}
                </span>
                {row.assignedEmployeeId ? (
                  <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                    {employeeById.get(row.assignedEmployeeId) || 'assigned'}
                  </span>
                ) : null}
                {row.dueAt ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700">
                    Due {new Date(row.dueAt).toLocaleDateString('en-IN')}
                  </span>
                ) : null}
                {row.escalationLevel ? (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-red-700">
                    Escalation {row.escalationLevel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              {row.customerProfileId ? (
                <Suspense fallback={<CustomerContextPanelSkeleton />}>
                  <CustomerContextPanel userId={row.customerProfileId} />
                </Suspense>
              ) : null}
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Verification context</p>
                <p className="mt-1 text-sm font-semibold text-[#1F2937]">{formatStatus(row.entityType)} verification</p>
                <p className="mt-1 text-xs text-[#6B7280]">Waiting {formatAge(row.createdAt)} for review.</p>
                {row.verificationSummary ? <p className="mt-2 text-xs leading-5 text-[#4B5563]">{row.verificationSummary}</p> : null}
              </div>
              <form action={updateVerificationStatus} className="grid gap-3">
                <input type="hidden" name="entityType" value={row.entityType} />
                <input type="hidden" name="entityId" value={row.id} />
                <input name="note" className={inputClass} placeholder="Optional admin note for audit trail" />
                <div className="grid gap-2 sm:grid-cols-4">
                  <select name="assignedEmployeeId" defaultValue={row.assignedEmployeeId ?? ''} className={inputClass}>
                    <option value="">No reviewer</option>
                    {employeeOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.label}
                      </option>
                    ))}
                  </select>
                  <select name="priority" defaultValue={row.priority ?? 'normal'} className={inputClass}>
                    {ADMIN_TASK_PRIORITIES.map((priority) => (
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
                    aria-label="Due date"
                  />
                  <select name="escalationLevel" defaultValue={row.escalationLevel ?? 0} className={inputClass}>
                    {[0, 1, 2, 3].map((level) => (
                      <option key={level} value={level}>
                        Escalation {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <PendingActionButton
                    pendingText="Updating..."
                    name="status"
                    value="under_review"
                    className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition hover:border-[#C0392B] hover:text-[#C0392B]"
                  >
                    Review
                  </PendingActionButton>
                  <PendingActionButton
                    pendingText="Updating..."
                    name="status"
                    value="needs_clarification"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Clarify
                  </PendingActionButton>
                  <PendingActionButton
                    pendingText="Updating..."
                    name="status"
                    value="rejected"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Reject
                  </PendingActionButton>
                  <PendingActionButton
                    pendingText="Updating..."
                    name="status"
                    value="approved"
                    className="rounded-lg bg-[#C0392B] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#A93226]"
                  >
                    Approve
                  </PendingActionButton>
                </div>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
