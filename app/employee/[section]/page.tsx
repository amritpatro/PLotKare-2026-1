import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { replyToAssignedSupportTicket, reviewAssignedPropertyLinkRequest, updateAssignedAmenityReview, updateAssignedVerificationStatus, updateAssignedWorkItem, updateMyAdminTask } from '@/app/employee/actions'
import { CustomerContextPanel, CustomerContextPanelSkeleton } from '@/components/admin/customer-context-panel'
import { ADMIN_TASK_STATUSES, ADMIN_VERIFICATION_STATUSES } from '@/lib/admin/status'
import { readAmenityWorkflowRows } from '@/lib/amenity-operations'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const allowedSections = ['tasks', 'verification', 'documents', 'inspections', 'amenities', 'support', 'operations'] as const
const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]'

type PageProps = {
  params: Promise<{ section: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const actionMessages = {
  success: {
    task_updated: 'Task status updated.',
    work_updated: 'Operational work updated.',
    verification_updated: 'Verification status updated.',
    amenity_updated: 'Amenity review updated.',
    inspection_reported: 'Inspection report submitted.',
    support_replied: 'Support response saved.',
  },
  error: {
    invalid_task_update: 'Choose a valid task status and try again.',
    task_update_failed: 'Task update could not be saved.',
    invalid_work_update: 'Choose a valid work status and try again.',
    work_update_failed: 'Operational update could not be saved.',
    invalid_verification_update: 'Choose a valid verification status and try again.',
    verification_update_failed: 'Verification update could not be saved.',
    invalid_amenity_update: 'Choose a valid amenity status and try again.',
    amenity_update_failed: 'Amenity review could not be saved.',
    invalid_support_reply: 'Write a valid support reply.',
    support_reply_failed: 'Support reply could not be saved.',
    invalid_inspection_report: 'Complete the required inspection details.',
    inspection_report_failed: 'Inspection report could not be saved.',
  },
} as const

function searchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function badge(value: string | null | undefined) {
  return <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">{statusLabel(value)}</span>
}

export default async function EmployeeSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params
  if (!allowedSections.includes(section as never)) notFound()
  const query = (await searchParams) ?? {}
  const successCode = searchParam(query.success) as keyof typeof actionMessages.success | undefined
  const errorCode = searchParam(query.error) as keyof typeof actionMessages.error | undefined
  const successMessage = successCode ? actionMessages.success[successCode] : undefined
  const errorMessage = errorCode ? actionMessages.error[errorCode] : undefined

  const { user, profile } = await requirePageRole(['employee', 'admin'])
  const supabase = createSupabaseAdminClient()
  const { data: employee } = await supabase.from('employees').select('id,employee_role,active').eq('profile_id', user.id).maybeSingle()
  const employeeId = employee?.id ?? ''

  const [{ data: tasks }, { data: verificationRequests }, { data: inspections }, { data: tickets }, { data: maintenance }, { data: documentQueue }, amenityQueue] = await Promise.all([
    employeeId ? supabase.from('admin_task_assignments').select('id,entity_type,entity_id,status,priority,due_at,escalation_level,last_employee_note,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('verification_requests').select('id,entity_type,entity_id,status,priority,due_at,escalation_level,admin_notes,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('inspections').select('id,property_id,status,scheduled_for,summary,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('support_tickets').select('id,ticket_reference,requester_id,property_id,subject,description,category,priority,status,created_at,due_at,escalation_level').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('maintenance_requests').select('id,property_id,title,priority,status,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('property_documents').select('id,title,document_type,verification_status,priority,due_at,property_id,property_request_id,uploaded_by,customer_id,created_at,category,requirement_level,description,review_reason,mime_type,size_bytes,reviewed_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? readAmenityWorkflowRows(supabase, { assignedEmployeeId: employeeId }) : Promise.resolve([]),
  ])
  const { data: supportReplies } = section === 'support' && (tickets ?? []).length
    ? await supabase.from('ticket_replies').select('id,ticket_id,body,visibility,created_at').in('ticket_id', (tickets ?? []).map((ticket: any) => ticket.id)).order('created_at', { ascending: true })
    : { data: [] }
  const { data: propertyLinkRequests } = section === 'verification' && employeeId
    ? await supabase
        .from('customer_property_requests')
        .select('id,requester_id,property_kind,property_title,address,city,state,relationship_type,status,review_notes,created_at')
        .eq('assigned_employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }
  const visibleProfileIds = Array.from(new Set([
    ...(section === 'documents' ? (documentQueue ?? []).map((row: any) => row.uploaded_by) : []),
    ...(section === 'support' ? (tickets ?? []).map((row: any) => row.requester_id) : []),
    ...(section === 'verification' ? (propertyLinkRequests ?? []).map((row: any) => row.requester_id) : []),
  ].filter(Boolean)))
  const visiblePropertyIds = Array.from(new Set([
    ...(section === 'documents' ? (documentQueue ?? []).map((row: any) => row.property_id) : []),
    ...(section === 'support' ? (tickets ?? []).map((row: any) => row.property_id) : []),
  ].filter(Boolean)))
  const visibleRequestIds = section === 'documents'
    ? Array.from(new Set((documentQueue ?? []).map((row: any) => row.property_request_id).filter(Boolean)))
    : []
  const [{ data: contextualProfiles }, { data: contextualProperties }, { data: contextualRequests }] = await Promise.all([
    visibleProfileIds.length
      ? supabase.from('profiles').select('id,full_name,email,role').in('id', visibleProfileIds)
      : Promise.resolve({ data: [] }),
    visiblePropertyIds.length
      ? supabase.from('properties').select('id,title,city').in('id', visiblePropertyIds)
      : Promise.resolve({ data: [] }),
    visibleRequestIds.length
      ? supabase.from('customer_property_requests').select('id,property_title,city,status').in('id', visibleRequestIds)
      : Promise.resolve({ data: [] }),
  ])
  const profilesById = new Map((contextualProfiles ?? []).map((row: any) => [row.id, row]))
  const propertiesById = new Map((contextualProperties ?? []).map((row: any) => [row.id, row]))
  const requestsById = new Map((contextualRequests ?? []).map((row: any) => [row.id, row]))

  function profileLabel(profileId: string | null | undefined) {
    const record = profileId ? profilesById.get(profileId) : null
    return record ? `${record.full_name || record.email} (${statusLabel(record.role)})` : 'Requester details pending'
  }

  function linkedContextLabel(propertyId: string | null | undefined, requestId: string | null | undefined) {
    const property = propertyId ? propertiesById.get(propertyId) : null
    if (property) return `${property.title || 'Property'}${property.city ? ` - ${property.city}` : ''}`
    const request = requestId ? requestsById.get(requestId) : null
    if (request) return `Pending request: ${request.property_title}${request.city ? ` - ${request.city}` : ''} (${statusLabel(request.status)})`
    return 'Profile scope'
  }

  const documentReviewRows =
    section === 'documents'
      ? (documentQueue ?? []).map((document: any) => {
          const request = (verificationRequests ?? []).find(
            (row: any) => row.entity_type === 'document' && row.entity_id === document.id,
          )

          return {
            ...document,
            request_id: request?.id ?? null,
            request_status: request?.status ?? document.verification_status,
            request_priority: request?.priority ?? document.priority,
            request_due_at: request?.due_at ?? document.due_at,
            request_entity_type: request?.entity_type ?? 'document',
            request_entity_id: request?.entity_id ?? document.id,
          }
        })
      : []

  let rows: any[] = []
  let title = 'Employee records'
  let body = 'Focused operational records assigned to your employee account.'
  if (section === 'tasks') {
    rows = tasks ?? []
    title = 'Assigned tasks'
    body = 'Admin-assigned work items with priority, due dates, and status updates.'
  } else if (section === 'verification') {
    rows = verificationRequests ?? []
    title = 'Verification work'
    body = 'Assigned verification requests. Verification agents can approve, reject, or request clarification from here.'
  } else if (section === 'documents') {
    rows = documentReviewRows
    title = 'Document review'
    body = 'Customer, owner, and seller documents assigned to your employee account for verification.'
  } else if (section === 'inspections') {
    rows = inspections ?? []
    title = 'Inspection queue'
    body = 'Inspection records assigned for field work and status follow-up.'
  } else if (section === 'amenities') {
    rows = amenityQueue ?? []
    title = 'Amenity review'
    body = 'Review amenity requests assigned to your employee account with direct status, notes, and requester context.'
  } else if (section === 'support') {
    rows = tickets ?? []
    title = 'Support tickets'
    body = 'Support tickets assigned to you for customer, seller, or owner follow-up.'
  } else {
    rows = [...(maintenance ?? []), ...(tickets ?? [])]
    title = 'Operations'
    body = 'Maintenance and support operations assigned to your employee queue.'
  }

  return (
    <RoleDashboardShell
      role="employee"
      title="Employee operations"
      subtitle="Assigned tasks, verification events, inspections, maintenance, and support."
      userLabel={profile.full_name || profile.email}
      avatarUrl={profile.avatar_path}
      userId={user.id}
    >
      <div className="space-y-6">
        {successMessage ? (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>
        ) : null}
        {errorMessage ? (
          <p role="alert" className="rounded-lg border border-[#F5C5BF] bg-[#FEF2F2] px-4 py-3 text-sm text-[#A93226]">{errorMessage}</p>
        ) : null}
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">{employee?.employee_role || 'Employee'}</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">{body}</p>
        </div>
        {section === 'verification' ? (
          <div className={cardClass}>
            <h3 className="font-serif text-2xl font-semibold text-[#1F2937]">Customer property link requests</h3>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Review customers requesting an additional verified property. An active link is created only after approval.</p>
            <div className="mt-5 divide-y divide-[#E5E7EB]">
              {(propertyLinkRequests ?? []).length === 0 ? (
                <p className="py-5 text-sm text-[#6B7280]">No assigned property link requests.</p>
              ) : null}
              {(propertyLinkRequests ?? []).map((request: any) => (
                <div key={request.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-[#1F2937]">{request.property_title}</p>
                      {badge(request.status)}
                    </div>
                    <p className="mt-2 text-sm text-[#6B7280]">{request.property_kind} · {request.address}, {request.city}, {request.state}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">Relationship: {statusLabel(request.relationship_type)} · Requested {formatDate(request.created_at)}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">Requester: {profileLabel(request.requester_id)}</p>
                      {request.review_notes ? <p className="mt-2 text-sm text-[#6B7280]">{request.review_notes}</p> : null}
                  </div>
                  <div className="grid gap-3">
                    <Suspense fallback={<CustomerContextPanelSkeleton />}>
                      <CustomerContextPanel userId={request.requester_id} />
                    </Suspense>
                    <form action={reviewAssignedPropertyLinkRequest} className="grid gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <textarea name="note" rows={2} className={inputClass} placeholder="Review note or clarification needed" />
                    <div className="grid grid-cols-2 gap-2">
                      {['under_review', 'approved', 'rejected', 'needs_clarification'].map((status) => (
                        <PendingActionButton key={status} pendingText="Saving..." name="status" value={status} className={buttonClass}>
                          {statusLabel(status)}
                        </PendingActionButton>
                      ))}
                    </div>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {section === 'documents' ? (
          <div className="space-y-4">
            <PropertyDocumentRecordTable
              rows={(documentQueue ?? []).map((row: any) => ({
                ...row,
                uploader_label: profileLabel(row.uploaded_by),
                linked_label: linkedContextLabel(row.property_id, row.property_request_id),
              }))}
              empty="No documents assigned yet."
            />
            <div className={`${cardClass} overflow-x-auto`}>
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Record</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Due/date</th><th className="px-3 py-3">Update</th></tr></thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {rows.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-[#6B7280]">No records assigned yet.</td></tr> : null}
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top" data-document-review-title={row.title || row.document_type || row.id}>
                      <td className="px-3 py-3"><p className="font-semibold text-[#1F2937]">{row.title || row.document_type || row.id}</p><p className="mt-1 text-xs text-[#6B7280]">{profileLabel(row.uploaded_by)}</p><p className="mt-1 text-xs text-[#6B7280]">{linkedContextLabel(row.property_id, row.property_request_id)}</p><p className="mt-1 font-mono text-xs text-[#9CA3AF]">{row.request_entity_id || row.id}</p></td>
                      <td className="px-3 py-3">{badge(row.request_status || row.verification_status)}</td>
                      <td className="px-3 py-3">{badge(row.request_priority || 'normal')}</td>
                      <td className="px-3 py-3 text-[#6B7280]">{formatDate(row.request_due_at || row.created_at)}</td>
                      <td className="px-3 py-3">
                        {row.request_id ? (
                          <form action={updateAssignedVerificationStatus} className="grid min-w-[260px] gap-2">
                            <input type="hidden" name="requestId" value={row.request_id} />
                            <input type="hidden" name="entityType" value={row.request_entity_type} />
                            <input type="hidden" name="entityId" value={row.request_entity_id} />
                            <input type="hidden" name="returnSection" value="documents" />
                            <select name="status" defaultValue={row.request_status} className={inputClass}>{ADMIN_VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                            <textarea name="note" rows={2} className={inputClass} placeholder="Verification note" />
                            <PendingActionButton pendingText="Updating..." className={buttonClass}>Update verification</PendingActionButton>
                          </form>
                        ) : (
                          <span className="text-xs text-[#6B7280]">Awaiting verification assignment.</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Record</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Due/date</th><th className="px-3 py-3">Update</th></tr></thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rows.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-[#6B7280]">No records assigned yet.</td></tr> : null}
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="align-top"
                    data-amenity-request-id={section === 'amenities' ? row.id : undefined}
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[#1F2937]">
                        {section === 'amenities'
                          ? row.amenityName
                          : row.subject || row.title || row.entity_type || row.property_id || row.id}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[#9CA3AF]">
                        {section === 'amenities'
                          ? `${row.requesterName} · ${row.plotNumber || row.propertyTitle || row.location || row.id}`
                          : row.entity_id || row.property_id || row.plot_id || row.id}
                      </p>
                      {section === 'support' ? (
                        <>
                          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C0392B]">{row.ticket_reference || `Ticket ${row.id.slice(0, 8).toUpperCase()}`}</p>
                          <p className="mt-2 text-xs text-[#6B7280]">Requester: {profileLabel(row.requester_id)}</p>
                          <p className="mt-1 text-xs text-[#6B7280]">Property: {linkedContextLabel(row.property_id, null)}</p>
                          <p className="mt-2 max-w-[360px] text-xs leading-5 text-[#4B5563]">{row.description || 'No issue description submitted.'}</p>
                          {(supportReplies ?? []).filter((reply: any) => reply.ticket_id === row.id).map((reply: any) => (
                            <p key={reply.id} className="mt-2 max-w-[360px] rounded-lg bg-[#F9FAFB] px-3 py-2 text-xs text-[#4B5563]">
                              {reply.visibility}: {reply.body}
                            </p>
                          ))}
                        </>
                      ) : null}
                      {section === 'amenities' && row.reviewNote ? (
                        <p className="mt-2 text-xs leading-5 text-[#6B7280]">{row.reviewNote}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{badge(section === 'amenities' ? row.reviewStatus : row.status || row.new_status)}</td>
                    <td className="px-3 py-3">{badge(row.priority || 'normal')}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{formatDate(row.dueAt || row.due_at || row.scheduled_for || row.created_at || row.createdAt)}</td>
                    <td className="px-3 py-3">
                      {section === 'support' ? (
                        <div className="grid min-w-[260px] gap-3">
                          <Suspense fallback={<CustomerContextPanelSkeleton />}>
                            <CustomerContextPanel userId={row.requester_id} />
                          </Suspense>
                          <form action={updateAssignedWorkItem} className="grid gap-2">
                            <input type="hidden" name="kind" value={row.subject ? 'support' : 'maintenance'} />
                            <input type="hidden" name="itemId" value={row.id} />
                            <input type="hidden" name="returnSection" value={section === 'support' ? 'support' : 'operations'} />
                            <select name="status" defaultValue={row.status} className={inputClass}>
                              {row.subject ? (
                                <>
                                  <option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="waiting_on_customer">Waiting on customer</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                                </>
                              ) : (
                                <>
                                  <option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="waiting_on_vendor">Waiting on vendor</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
                                </>
                              )}
                            </select>
                            <textarea name="note" rows={2} className={inputClass} placeholder="Operational note" />
                            <PendingActionButton pendingText="Updating..." className={buttonClass}>Update work</PendingActionButton>
                          </form>
                          <form action={replyToAssignedSupportTicket} className="grid gap-2 rounded-lg border border-[#E5E7EB] p-3">
                            <input type="hidden" name="ticketId" value={row.id} />
                            <select name="visibility" defaultValue="public" className={inputClass}>
                              <option value="public">Public reply</option>
                              <option value="internal">Internal note</option>
                            </select>
                            <textarea name="body" required rows={2} className={inputClass} placeholder="Reply or internal note" />
                            <PendingActionButton pendingText="Saving..." className={buttonClass}>Save response</PendingActionButton>
                          </form>
                        </div>
                      ) : section === 'tasks' ? (
                        <form action={updateMyAdminTask} className="grid min-w-[260px] gap-2">
                          <input type="hidden" name="taskId" value={row.id} />
                          <select name="status" defaultValue={row.status} className={inputClass}>{ADMIN_TASK_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                          <textarea name="note" rows={2} className={inputClass} placeholder="Progress note" />
                          <PendingActionButton pendingText="Updating..." className={buttonClass}>Update task</PendingActionButton>
                        </form>
                      ) : section === 'verification' || (section === 'documents' && row.entity_type === 'document') ? (
                        <form action={updateAssignedVerificationStatus} className="grid min-w-[260px] gap-2">
                          <input type="hidden" name="requestId" value={row.id} />
                          <input type="hidden" name="entityType" value={row.entity_type} />
                          <input type="hidden" name="entityId" value={row.entity_id} />
                          <input type="hidden" name="returnSection" value="verification" />
                          <select name="status" defaultValue={row.status} className={inputClass}>{ADMIN_VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                          <textarea name="note" rows={2} className={inputClass} placeholder="Verification note" />
                          <PendingActionButton pendingText="Updating..." className={buttonClass}>Update verification</PendingActionButton>
                        </form>
                      ) : section === 'operations' ? (
                        <form action={updateAssignedWorkItem} className="grid min-w-[260px] gap-2">
                          <input type="hidden" name="kind" value="maintenance" />
                          <input type="hidden" name="itemId" value={row.id} />
                          <input type="hidden" name="returnSection" value="operations" />
                          <select name="status" defaultValue={row.status} className={inputClass}>
                            <option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="waiting_on_vendor">Waiting on vendor</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
                          </select>
                          <textarea name="note" rows={2} className={inputClass} placeholder="Operational note" />
                          <PendingActionButton pendingText="Updating..." className={buttonClass}>Update work</PendingActionButton>
                        </form>
                      ) : section === 'amenities' ? (
                        <form action={updateAssignedAmenityReview} className="grid min-w-[260px] gap-2">
                          <input type="hidden" name="amenityRequestId" value={row.id} />
                          <select name="reviewStatus" defaultValue={row.reviewStatus} className={inputClass}>
                            {['requested', 'under_review', 'approved', 'rejected', 'scheduled', 'completed'].map((status) => (
                              <option key={status} value={status}>{statusLabel(status)}</option>
                            ))}
                          </select>
                          <textarea name="note" rows={2} className={inputClass} placeholder="Amenity review note" />
                          <PendingActionButton pendingText="Updating..." className={buttonClass}>Update amenity</PendingActionButton>
                        </form>
                      ) : (
                        <span className="text-xs text-[#6B7280]">Use the overview inspection form for detailed report submission.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleDashboardShell>
  )
}
