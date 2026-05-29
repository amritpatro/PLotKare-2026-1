import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createOwnerServiceRequest, createOwnerSupportTicket, registerOwnerProperty, requestOwnerAmenity } from '@/app/owner/actions'
import { AmenityCatalogRequestGrid } from '@/components/amenities/amenity-catalog-request-grid'
import { AmenityWorkflowTable } from '@/components/amenities/amenity-workflow-table'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import { PropertyDocumentUploadPanel } from '@/components/documents/property-document-upload-panel'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { SupportTicketThreadList } from '@/components/support/support-ticket-thread-list'
import { readAmenityWorkflowRows } from '@/lib/amenity-operations'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const allowedSections = ['properties', 'register', 'verification', 'documents', 'amenities', 'services', 'support'] as const

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]'

type PageProps = {
  params: Promise<{ section: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const actionMessages = {
  success: {
    property_registered: 'Property submitted for verification.',
    service_requested: 'Service request sent to PlotKare operations.',
    support_ticket_created: 'Support ticket opened for operations follow-up.',
    amenity_requested: 'Amenity consultation request submitted.',
  },
  error: {
    invalid_property_form: 'Complete the required property details and try again.',
    invalid_service_form: 'Select a property and describe the required service.',
    invalid_support_form: 'Add a subject and description for support.',
    invalid_amenity_form: 'Select a plot and amenity before submitting.',
    property_save_failed: 'The property could not be saved. Please retry.',
    service_request_failed: 'The service request could not be created.',
    support_ticket_failed: 'The support ticket could not be created.',
    amenity_request_failed: 'The amenity request could not be created.',
  },
} as const

function searchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function badge(value: string | null | undefined) {
  return <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">{String(value ?? 'pending').replaceAll('_', ' ')}</span>
}

function Title({ title, body }: { title: string; body: string }) {
  return <div className={cardClass}><p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Land owner workspace</p><h2 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#6B7280]">{body}</p></div>
}

export default async function OwnerSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params
  if (!allowedSections.includes(section as never)) notFound()
  const query = (await searchParams) ?? {}
  const successCode = searchParam(query, 'success') as keyof typeof actionMessages.success | undefined
  const errorCode = searchParam(query, 'error') as keyof typeof actionMessages.error | undefined
  const successMessage = successCode ? actionMessages.success[successCode] : null
  const errorMessage = errorCode ? actionMessages.error[errorCode] : null

  const { user, profile } = await requirePageRole(['land_owner', 'admin'])
  const supabase = await createSupabaseServerClient()
  const [{ data: owner }, { data: properties }, { data: documents }, { data: services }, { data: tickets }, { data: amenityCatalog }] = await Promise.all([
    supabase.from('owners').select('id,verification_status,admin_notes').eq('profile_id', user.id).maybeSingle(),
    supabase.from('properties').select('id,title,property_kind,address,city,state,lifecycle_status,verification_status,created_at').eq('owner_profile_id', user.id).order('created_at', { ascending: false }),
    supabase.from('property_documents').select('id,title,document_type,verification_status,property_id,created_at,category,requirement_level,description,review_reason,mime_type,size_bytes,reviewed_at,withdrawal_requested_at').eq('uploaded_by', user.id).order('created_at', { ascending: false }),
    supabase.from('maintenance_requests').select('id,property_id,title,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('support_tickets').select('id,ticket_reference,property_id,subject,description,category,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('amenities').select('id,name,category,kind,amount,image_path,active').eq('active', true).order('category', { ascending: true }).order('name', { ascending: true }),
  ])

  const propertyRows = properties ?? []
  const { data: inspections } = propertyRows.length
    ? await supabase
        .from('inspections')
        .select('id,property_id,status,scheduled_for,completed_at,summary,created_at')
        .in('property_id', propertyRows.map((property: any) => property.id))
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }
  const { data: ownerPlots } = await supabase
    .from('plots')
    .select('id,property_id,plot_number,location')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  const { data: releasedReports } = section === 'services'
    ? await supabase
        .from('inspection_reports')
        .select('id,inspection_id,plot_id,month,finding,status,released_at,report_file_path,delivery_status,email_delivery_status,delivery_error')
        .eq('owner_id', user.id)
        .eq('delivery_status', 'released')
        .order('released_at', { ascending: false })
        .limit(30)
    : { data: [] }
  const activeAmenities = (ownerPlots ?? []).length
    ? await readAmenityWorkflowRows(supabase, { plotIds: (ownerPlots ?? []).map((plot: any) => plot.id) })
    : []
  const { data: supportReplies } = section === 'support' && (tickets ?? []).length
    ? await supabase.from('ticket_replies').select('id,ticket_id,body,visibility,created_at').in('ticket_id', (tickets ?? []).map((ticket: any) => ticket.id)).eq('visibility', 'public').order('created_at', { ascending: true })
    : { data: [] }
  let content: React.ReactNode

  if (section === 'register') {
    content = <div className="space-y-6"><Title title="Register property" body="Register a property into PlotKare verification and care operations." /><form action={registerOwnerProperty} className={`${cardClass} grid gap-3 md:grid-cols-2`}><select name="propertyKind" className={inputClass} defaultValue="plot"><option value="plot">Plot</option><option value="apartment">Apartment</option></select><input name="title" required placeholder="Property title" className={inputClass} /><input name="address" required placeholder="Address" className={inputClass} /><input name="city" required placeholder="City" className={inputClass} /><input name="state" defaultValue="Andhra Pradesh" className={inputClass} /><input name="postalCode" placeholder="Postal code" className={inputClass} /><input name="plotNumber" placeholder="Plot ID" className={inputClass} /><input name="sqYards" type="number" min="1" placeholder="Sq. yards" className={inputClass} /><PendingActionButton className={`${buttonClass} md:col-span-2`} pendingText="Submitting...">Submit for verification</PendingActionButton></form></div>
  } else if (section === 'support') {
    content = <div className="space-y-6"><Title title="Support" body="Open owner support tickets linked to properties or account operations." /><div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><form action={createOwnerSupportTicket} className={`${cardClass} grid gap-3`}><select name="propertyId" className={inputClass} defaultValue=""><option value="">General owner support</option>{propertyRows.map((property: any) => <option key={property.id} value={property.id}>{property.title || property.city || property.id}</option>)}</select><input name="subject" required placeholder="Subject" className={inputClass} /><textarea name="description" required rows={5} placeholder="Describe what support should resolve" className={inputClass} /><select name="priority" className={inputClass} defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><PendingActionButton className={buttonClass} pendingText="Opening...">Open ticket</PendingActionButton></form><SupportTicketThreadList tickets={tickets ?? []} replies={supportReplies ?? []} /></div></div>
  } else if (section === 'services') {
    const rows = [...(services ?? []), ...(inspections ?? [])]
    content = <div className="space-y-6"><Title title="Service activity" body="Request inspections or maintenance support and view released field-evidence reports tied to your property." /><div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><form action={createOwnerServiceRequest} className={`${cardClass} grid gap-3`}><select name="propertyId" required className={inputClass} defaultValue=""><option value="" disabled>Select property</option>{propertyRows.map((property: any) => <option key={property.id} value={property.id}>{property.title || property.city || property.id}</option>)}</select><input name="title" required placeholder="Service request title" className={inputClass} /><textarea name="description" rows={5} placeholder="Describe the service needed" className={inputClass} /><select name="priority" className={inputClass} defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><PendingActionButton className={buttonClass} pendingText="Creating..." disabled={propertyRows.length === 0}>Create service request</PendingActionButton></form><RecordTable rows={rows} /></div><section className={cardClass}><h3 className="font-serif text-2xl font-semibold text-[#1F2937]">Verified inspection reports</h3><p className="mt-2 text-sm text-[#6B7280]">Only reports reviewed and released by PlotKare operations appear here.</p><div className="mt-5 grid gap-3">{(releasedReports ?? []).length === 0 ? <p className="rounded-lg bg-[#F9FAFB] p-4 text-sm text-[#6B7280]">No released field reports yet.</p> : null}{(releasedReports ?? []).map((report: any) => <div key={report.id} className="flex flex-col justify-between gap-3 rounded-lg border border-[#E5E7EB] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-semibold text-[#1F2937]">{report.month} inspection report</p><p className="mt-1 text-sm text-[#6B7280]">{report.finding}</p><p className="mt-2 text-xs text-[#9CA3AF]">{report.email_delivery_status === 'sent' ? 'Report delivered by email and available below.' : 'Report available below (email delivery pending).'}</p>{report.email_delivery_status === 'failed' && report.delivery_error ? <p className="mt-2 text-xs text-red-600">Email delivery is pending. PlotKare has kept the report available in your dashboard.</p> : null}</div><Link target="_blank" href={`/api/inspection-reports/${report.id}/access`} className={`${buttonClass} inline-flex min-h-11 items-center justify-center`}>Download secure PDF</Link></div></div>)}</div></section></div>
  } else if (section === 'amenities') {
    content = (
      <div className="space-y-6">
        <Title title="Amenities" body="Explore PlotKare-managed amenities with real images, fit guidance, area expectations, and consultation requests." />
        <AmenityCatalogRequestGrid
          amenities={amenityCatalog ?? []}
          targets={(ownerPlots ?? []).map((plot: any) => ({ id: plot.id, label: `${plot.plot_number} · ${plot.location}` }))}
          targetName="plotId"
          targetLabel="Select plot for consultation"
          action={requestOwnerAmenity}
          disabledText="Register a plot before requesting amenities."
        />
        <AmenityWorkflowTable rows={activeAmenities} empty="No amenities requested yet." />
      </div>
    )
  } else {
    const rows = section === 'documents' ? documents ?? [] : section === 'services' ? [...(services ?? []), ...(inspections ?? [])] : propertyRows
    content = <div className="space-y-6"><Title title={section === 'verification' ? 'Verification status' : section} body="Focused owner records with status, dates, and next operational state." />{section === 'documents' ? <><div className={`${cardClass} grid gap-4`}><p className="text-sm leading-6 text-[#6B7280]">Required owner documents: Aadhaar, PAN, EC, survey documents, tax receipts, and real property photos. Uploads are sent to admin/employee review.</p><PropertyDocumentUploadPanel role="owner" properties={propertyRows.map((property: any) => ({ id: property.id, label: property.title || property.city || property.id }))} documents={documents ?? []} /></div><PropertyDocumentRecordTable rows={(documents ?? []).map((row: any) => ({ ...row, linked_label: propertyRows.find((property: any) => property.id === row.property_id)?.title || row.property_id || 'Owner property' }))} empty="No documents uploaded yet." /></> : <RecordTable rows={rows} />}</div>
  }

  return <RoleDashboardShell role="owner" title="Property care workspace" subtitle="Register properties, track verification, and manage service activity tied to your account." userLabel={profile.full_name || profile.email} avatarUrl={profile.avatar_path} userId={user.id}>{successMessage ? <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}{errorMessage ? <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}{content}</RoleDashboardShell>
}

function RecordTable({ rows }: { rows: any[] }) {
  return <div className={`${cardClass} overflow-x-auto`}><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Record</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Location/type</th><th className="px-3 py-3">Date</th></tr></thead><tbody className="divide-y divide-[#F3F4F6]">{rows.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-[#6B7280]">No records yet.</td></tr> : null}{rows.map((row) => <tr key={row.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{row.title || row.subject || row.summary || row.amenities?.name || row.id}</td><td className="px-3 py-3">{badge(row.verification_status || row.status || row.priority || row.amenities?.category)}</td><td className="px-3 py-3 text-[#6B7280]">{row.city || row.address || row.document_type || row.property_kind || row.property_id || row.plot_id || 'Account'}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at || row.scheduled_for)}</td></tr>)}</tbody></table></div>
}
