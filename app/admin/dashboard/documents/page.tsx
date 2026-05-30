import { updateVerificationStatus } from '@/app/admin/dashboard/verification/actions'
import { CustomerContextPanel } from '@/components/admin/customer-context-panel'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { ADMIN_VERIFICATION_STATUSES } from '@/lib/admin/status'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'submitted').replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export default async function AdminDocumentsPage({ searchParams }: PageProps) {
  await requirePageRole(['admin'])
  const query = (await searchParams) ?? {}
  const success = query.success === 'verification_updated'
  const error = query.error === 'verification_update_failed' || query.error === 'invalid_verification_action'
  const supabase = await createSupabaseServerClient()
  const { data: documents } = await supabase
    .from('property_documents')
    .select('id,title,document_type,verification_status,priority,due_at,uploaded_by,property_id,customer_id,created_at,category,requirement_level,description,review_reason,mime_type,size_bytes,reviewed_at')
    .order('created_at', { ascending: false })
    .limit(150)

  const uploaderProfileIds = Array.from(new Set((documents ?? []).map((document: any) => document.uploaded_by).filter(Boolean)))
  const { data: uploaderProfiles } = uploaderProfileIds.length
    ? await supabase
        .from('profiles')
        .select('id,full_name,email,created_at,customer_type')
        .in('id', uploaderProfileIds)
    : { data: [] }
  const uploaderProfilesById = new Map((uploaderProfiles ?? []).map((profile: any) => [profile.id, profile]))

  const uploaderCustomerProfileIds = Array.from(new Set((documents ?? []).map((document: any) => document.uploaded_by).filter(Boolean)))
  const { data: uploaderCustomerRows } = uploaderCustomerProfileIds.length
    ? await supabase
        .from('customers')
        .select('id,profile_id')
        .in('profile_id', uploaderCustomerProfileIds)
    : { data: [] }
  const customerIdsByProfileId = new Map((uploaderCustomerRows ?? []).map((row: any) => [row.profile_id, row.id]))

  const customerIds = Array.from(new Set((uploaderCustomerRows ?? []).map((row: any) => row.id).filter(Boolean)))
  const { data: uploaderSubscriptions } = customerIds.length
    ? await supabase
        .from('subscriptions')
        .select('customer_id,plan,status')
        .in('customer_id', customerIds)
    : { data: [] }
  const planByCustomerId = new Map((uploaderSubscriptions ?? []).map((subscription: any) => [subscription.customer_id, `${String(subscription.plan).replaceAll('_', ' ')} · ${subscription.status}`]))

  function uploaderContext(profileId: string | null | undefined) {
    if (!profileId) return null
    const profile = uploaderProfilesById.get(profileId)
    if (!profile) return null
    const customerId = customerIdsByProfileId.get(profile.id)
    const plan = customerId ? planByCustomerId.get(customerId) : null
    const joined = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null
    return [profile.email, profile.customer_type ? String(profile.customer_type).replaceAll('_', ' ') : null, plan ? `Plan ${plan}` : null, joined ? `Joined ${joined}` : null]
      .filter(Boolean)
      .join(' · ')
  }

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      {success ? (
        <p role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Document verification updated.</p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-6 rounded-lg border border-[#F5C5BF] bg-[#FEF2F2] px-4 py-3 text-sm text-[#A93226]">Document verification could not be updated.</p>
      ) : null}
      <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Document review</h1>
      <p className="mt-1 font-sans text-sm text-[#9CA3AF]">
        Review customer, owner, and seller documents from the same property document source used by role dashboards.
      </p>

      <div className="mt-8">
        <PropertyDocumentRecordTable
          rows={(documents ?? []).map((document: any) => ({
            ...document,
            linked_label: document.property_id || document.customer_id || document.uploaded_by,
            uploader_label: uploaderProfilesById.get(document.uploaded_by)?.full_name || uploaderProfilesById.get(document.uploaded_by)?.email || document.uploaded_by,
            uploader_context: uploaderContext(document.uploaded_by),
            uploader_href: document.uploaded_by ? `/admin/dashboard/customers/${document.uploaded_by}` : null,
          }))}
          linkedLabel="Linked record"
          empty="No documents submitted yet."
        />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase tracking-[0.12em] text-[#9CA3AF]">
              <th className="px-3 py-3">Document</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Linked record</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {(documents ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-[#6B7280]">No documents submitted yet.</td>
              </tr>
            ) : null}
            {(documents ?? []).map((document: any) => (
              <tr key={document.id} className="align-top" data-document-review-title={document.title}>
                <td className="px-3 py-3 font-semibold text-[#1F2937]">{document.title}</td>
                <td className="px-3 py-3 text-[#6B7280]">{document.document_type}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                    {statusLabel(document.verification_status)}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-xs text-[#9CA3AF]">{document.property_id || document.customer_id || document.uploaded_by}</td>
                <td className="px-3 py-3 text-[#6B7280]">{formatDate(document.created_at)}</td>
                <td className="px-3 py-3">
                  <form action={updateVerificationStatus} className="grid min-w-[260px] gap-2">
                    <input type="hidden" name="entityType" value="document" />
                    <input type="hidden" name="entityId" value={document.id} />
                    <input type="hidden" name="returnSection" value="documents" />
                    <select name="status" defaultValue={document.verification_status} className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15">
                      {ADMIN_VERIFICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                    <textarea name="note" rows={2} className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" placeholder="Internal review note" />
                    <PendingActionButton pendingText="Updating..." className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]">Update document</PendingActionButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
