import { notFound } from 'next/navigation'
import { updateAssignedAmenityReview, updateAssignedVerificationStatus, updateAssignedWorkItem, updateMyAdminTask } from '@/app/employee/actions'
import { ADMIN_TASK_STATUSES, ADMIN_VERIFICATION_STATUSES } from '@/lib/admin/status'
import { readAmenityWorkflowRows } from '@/lib/amenity-operations'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const allowedSections = ['tasks', 'verification', 'documents', 'inspections', 'amenities', 'support', 'operations'] as const
const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]'

type PageProps = {
  params: Promise<{ section: string }>
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

export default async function EmployeeSectionPage({ params }: PageProps) {
  const { section } = await params
  if (!allowedSections.includes(section as never)) notFound()

  const { user, profile } = await requirePageRole(['employee', 'admin'])
  const supabase = createSupabaseAdminClient()
  const { data: employee } = await supabase.from('employees').select('id,employee_role,active').eq('profile_id', user.id).maybeSingle()
  const employeeId = employee?.id ?? ''

  const [{ data: tasks }, { data: verificationRequests }, { data: inspections }, { data: tickets }, { data: maintenance }, { data: documentQueue }, amenityQueue] = await Promise.all([
    employeeId ? supabase.from('admin_task_assignments').select('id,entity_type,entity_id,status,priority,due_at,escalation_level,last_employee_note,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('verification_requests').select('id,entity_type,entity_id,status,priority,due_at,escalation_level,admin_notes,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('inspections').select('id,property_id,status,scheduled_for,summary,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('support_tickets').select('id,property_id,subject,priority,status,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('maintenance_requests').select('id,property_id,title,priority,status,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? supabase.from('property_documents').select('id,title,document_type,verification_status,priority,due_at,property_id,created_at').eq('assigned_employee_id', employeeId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    employeeId ? readAmenityWorkflowRows(supabase, { assignedEmployeeId: employeeId }) : Promise.resolve([]),
  ])

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
      userId={user.id}
    >
      <div className="space-y-6">
        <div className={cardClass}>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">{employee?.employee_role || 'Employee'}</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">{body}</p>
        </div>
        {section === 'documents' ? (
          <div className="space-y-4">
            <PropertyDocumentRecordTable
              rows={(documentQueue ?? []).map((row: any) => ({
                ...row,
                linked_label: row.property_id || 'Assigned review',
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
                      <td className="px-3 py-3"><p className="font-semibold text-[#1F2937]">{row.title || row.document_type || row.id}</p><p className="mt-1 font-mono text-xs text-[#9CA3AF]">{row.request_entity_id || row.id}</p></td>
                      <td className="px-3 py-3">{badge(row.request_status || row.verification_status)}</td>
                      <td className="px-3 py-3">{badge(row.request_priority || 'normal')}</td>
                      <td className="px-3 py-3 text-[#6B7280]">{formatDate(row.request_due_at || row.created_at)}</td>
                      <td className="px-3 py-3">
                        {row.request_id ? (
                          <form action={updateAssignedVerificationStatus} className="grid min-w-[260px] gap-2">
                            <input type="hidden" name="requestId" value={row.request_id} />
                            <input type="hidden" name="entityType" value={row.request_entity_type} />
                            <input type="hidden" name="entityId" value={row.request_entity_id} />
                            <select name="status" defaultValue={row.request_status} className={inputClass}>{ADMIN_VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                            <textarea name="note" rows={2} className={inputClass} placeholder="Verification note" />
                            <button className={buttonClass}>Update verification</button>
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
                      {section === 'amenities' && row.reviewNote ? (
                        <p className="mt-2 text-xs leading-5 text-[#6B7280]">{row.reviewNote}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{badge(section === 'amenities' ? row.reviewStatus : row.status || row.new_status)}</td>
                    <td className="px-3 py-3">{badge(row.priority || 'normal')}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{formatDate(row.dueAt || row.due_at || row.scheduled_for || row.created_at || row.createdAt)}</td>
                    <td className="px-3 py-3">
                      {section === 'tasks' ? (
                        <form action={updateMyAdminTask} className="grid min-w-[260px] gap-2">
                          <input type="hidden" name="taskId" value={row.id} />
                          <select name="status" defaultValue={row.status} className={inputClass}>{ADMIN_TASK_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                          <textarea name="note" rows={2} className={inputClass} placeholder="Progress note" />
                          <button className={buttonClass}>Update task</button>
                        </form>
                      ) : section === 'verification' || (section === 'documents' && row.entity_type === 'document') ? (
                        <form action={updateAssignedVerificationStatus} className="grid min-w-[260px] gap-2">
                          <input type="hidden" name="requestId" value={row.id} />
                          <input type="hidden" name="entityType" value={row.entity_type} />
                          <input type="hidden" name="entityId" value={row.entity_id} />
                          <select name="status" defaultValue={row.status} className={inputClass}>{ADMIN_VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
                          <textarea name="note" rows={2} className={inputClass} placeholder="Verification note" />
                          <button className={buttonClass}>Update verification</button>
                        </form>
                      ) : section === 'support' || section === 'operations' ? (
                        <form action={updateAssignedWorkItem} className="grid min-w-[260px] gap-2">
                          <input type="hidden" name="kind" value={row.subject ? 'support' : 'maintenance'} />
                          <input type="hidden" name="itemId" value={row.id} />
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
                          <button className={buttonClass}>Update work</button>
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
                          <button className={buttonClass}>Update amenity</button>
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
