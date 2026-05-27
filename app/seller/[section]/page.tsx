import { notFound } from 'next/navigation'
import { addSoldCustomer, createSellerPlot, createSellerServiceRequest, createSellerSupportTicket, requestSellerAmenity } from '@/app/seller/actions'
import { AmenityCatalogRequestGrid } from '@/components/amenities/amenity-catalog-request-grid'
import { AmenityWorkflowTable } from '@/components/amenities/amenity-workflow-table'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import { PropertyDocumentUploadPanel } from '@/components/documents/property-document-upload-panel'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { SupportTicketThreadList } from '@/components/support/support-ticket-thread-list'
import { readAmenityWorkflowRows } from '@/lib/amenity-operations'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const allowedSections = ['plots', 'customers', 'services', 'amenities', 'support', 'notifications', 'documents'] as const
type Section = (typeof allowedSections)[number]

type PageProps = {
  params: Promise<{ section: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226] disabled:cursor-not-allowed disabled:opacity-50'

const actionMessages = {
  success: {
    plot_created: 'Plot submitted for verification.',
    customer_linked: 'Customer linked to the selected property.',
    service_requested: 'Service request sent to PlotKare operations.',
    support_ticket_created: 'Support ticket opened for operations follow-up.',
    amenity_requested: 'Amenity consultation request submitted.',
  },
  error: {
    invalid_plot_form: 'Complete the required plot details and try again.',
    invalid_customer_form: 'Complete the customer details and select a property.',
    invalid_service_form: 'Select a property and describe the required service.',
    invalid_support_form: 'Add a subject and description for support.',
    invalid_amenity_form: 'Select a plot and amenity before submitting.',
    plot_save_failed: 'The plot could not be saved. Please retry.',
    customer_link_failed: 'The customer could not be linked. Please retry.',
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

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

function badge(value: string | null | undefined) {
  return (
    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
      {statusLabel(value)}
    </span>
  )
}

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className={cardClass}>
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">{body}</p>
    </div>
  )
}

export default async function SellerSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params
  if (!allowedSections.includes(section as Section)) notFound()
  const query = (await searchParams) ?? {}
  const successCode = searchParam(query, 'success') as keyof typeof actionMessages.success | undefined
  const errorCode = searchParam(query, 'error') as keyof typeof actionMessages.error | undefined
  const successMessage = successCode ? actionMessages.success[successCode] : null
  const errorMessage = errorCode ? actionMessages.error[errorCode] : null

  const { user, profile } = await requirePageRole(['plot_seller', 'admin'])
  const supabase = await createSupabaseServerClient()

  const { data: seller } = await supabase
    .from('sellers')
    .select('id,company_name,verification_status')
    .eq('profile_id', user.id)
    .maybeSingle()

  const sellerId = seller?.id ?? ''
  const [{ data: properties }, { data: plots }, { data: customers }, { data: links }, { data: listings }, { data: services }, { data: tickets }, { data: notifications }, { data: plans }, { data: amenityCatalog }] =
    await Promise.all([
      sellerId ? supabase.from('properties').select('id,title,city,address,lifecycle_status,verification_status,created_at').eq('seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('plots').select('id,property_id,plot_number,location,sq_yards,status,lifecycle_status,verification_status,current_value_lakhs,created_at').eq('seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('customers').select('id,full_name,email,phone,address,account_status,kyc_status,created_at').eq('created_by_seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('customer_property_links').select('id,property_id,customer_id,status,relationship_type,registration_date').eq('seller_id', sellerId) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('listings').select('id,property_id,plot_id,plot_number,location,status,approval_status,is_published,verified_at,published_at,inquiries_count').eq('seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from('maintenance_requests').select('id,property_id,title,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('support_tickets').select('id,ticket_reference,property_id,subject,description,category,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('notifications').select('id,title,message,category,read_at,created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('plans').select('id,name,price_monthly,active').eq('audience_role', 'plot_seller').eq('active', true).order('price_monthly', { ascending: true }),
      supabase.from('amenities').select('id,name,category,kind,amount,image_path,active').eq('active', true).order('category', { ascending: true }).order('name', { ascending: true }),
    ])

  const propertyRows = properties ?? []
  const { data: documents } = sellerId && propertyRows.length
    ? await supabase
        .from('property_documents')
        .select('id,title,document_type,verification_status,visibility,property_id,created_at,category,requirement_level,description,review_reason,mime_type,size_bytes,reviewed_at,withdrawal_requested_at')
        .in('property_id', propertyRows.map((item: any) => item.id))
        .order('created_at', { ascending: false })
    : { data: [] }
  const plotRows = plots ?? []
  const customerRows = customers ?? []
  const linkRows = links ?? []
  const listingRows = listings ?? []
  const documentRows = documents ?? []
  const activeAmenities = plotRows.length
    ? await readAmenityWorkflowRows(supabase, { plotIds: plotRows.map((plot: any) => plot.id) })
    : []
  const serviceRows = services ?? []
  const ticketRows = tickets ?? []
  const { data: supportReplies } = section === 'support' && ticketRows.length
    ? await supabase
        .from('ticket_replies')
        .select('id,ticket_id,body,visibility,created_at')
        .in('ticket_id', ticketRows.map((ticket: any) => ticket.id))
        .eq('visibility', 'public')
        .order('created_at', { ascending: true })
    : { data: [] }
  const notificationRows = notifications ?? []

  const content = (() => {
    if (section === 'plots') {
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow="Seller inventory" title="My plots" body="Seller-created plots are submitted to PlotKare verification first. Approved records become customer-visible listings." />
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <form action={createSellerPlot} className={`${cardClass} grid gap-3`}>
              <input name="title" required placeholder="Plot title" className={inputClass} />
              <input name="plotNumber" required placeholder="Plot ID / number" className={inputClass} />
              <input name="location" required placeholder="Location" className={inputClass} />
              <input name="sqYards" required type="number" min="50" placeholder="Sq. yards" className={inputClass} />
              <select name="facing" className={inputClass} defaultValue="East"><option>East</option><option>West</option><option>North</option><option>South</option></select>
              <input name="priceLakhs" type="number" min="0" step="0.1" placeholder="Expected value in lakhs" className={inputClass} />
              <PendingActionButton className={buttonClass} pendingText="Submitting...">Submit plot for verification</PendingActionButton>
            </form>
            <div className={`${cardClass} overflow-x-auto`}>
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Plot</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Size</th><th className="px-3 py-3">Lifecycle</th><th className="px-3 py-3">Verification</th><th className="px-3 py-3">Listing</th></tr></thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {plotRows.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-[#6B7280]">No plots submitted yet.</td></tr> : null}
                  {plotRows.map((plot: any) => {
                    const listing = listingRows.find((row: any) => row.plot_id === plot.id || row.property_id === plot.property_id)
                    return <tr key={plot.id}><td className="px-3 py-3 font-mono text-[#C0392B]">{plot.plot_number}</td><td className="px-3 py-3 text-[#6B7280]">{plot.location}</td><td className="px-3 py-3 text-[#6B7280]">{plot.sq_yards} sq yd</td><td className="px-3 py-3">{badge(plot.lifecycle_status)}</td><td className="px-3 py-3">{plot.verification_status === 'approved' ? <PlotKareVerifiedStamp compact /> : badge(plot.verification_status)}</td><td className="px-3 py-3">{listing?.is_published ? <PlotKareVerifiedStamp compact /> : badge(listing?.approval_status ?? 'not published')}</td></tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }

    if (section === 'customers') {
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow="Seller CRM" title="Sold customers" body="Customer contact and property-link data remains scoped to this seller, employees assigned to the work, and admins." />
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <form action={addSoldCustomer} className={`${cardClass} grid gap-3`}>
              <input name="fullName" required placeholder="Customer full name" className={inputClass} />
              <input name="email" type="email" placeholder="Email" className={inputClass} />
              <input name="phone" placeholder="Phone" className={inputClass} />
              <input name="address" placeholder="Address" className={inputClass} />
              <select name="propertyId" required className={inputClass} defaultValue="">
                <option value="" disabled>Select property</option>
                {propertyRows.filter((property: any) => property.lifecycle_status !== 'sold').map((property: any) => <option key={property.id} value={property.id}>{property.title || property.city || property.id}</option>)}
              </select>
              <input name="registrationDate" type="date" className={inputClass} />
              <PendingActionButton className={buttonClass} pendingText="Linking..." disabled={propertyRows.length === 0}>Link customer to property</PendingActionButton>
            </form>
            <div className={`${cardClass} overflow-x-auto`}>
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">KYC</th><th className="px-3 py-3">Linked property</th><th className="px-3 py-3">Registration</th></tr></thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {customerRows.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-[#6B7280]">No sold customers linked yet.</td></tr> : null}
                  {customerRows.map((customer: any) => {
                    const link = linkRows.find((row: any) => row.customer_id === customer.id)
                    const property = propertyRows.find((row: any) => row.id === link?.property_id)
                    return <tr key={customer.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{customer.full_name}</td><td className="px-3 py-3 text-[#6B7280]">{customer.email || 'Pending'}</td><td className="px-3 py-3 text-[#6B7280]">{customer.phone || 'Pending'}</td><td className="px-3 py-3">{badge(customer.kyc_status)}</td><td className="px-3 py-3 text-[#6B7280]">{property?.title || property?.city || 'Not linked'}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(link?.registration_date)}</td></tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }

    if (section === 'amenities') {
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow="Seller amenities" title="Amenity requests" body="Explore PlotKare-managed amenities with real images, fit guidance, area expectations, and consultation requests for seller plots." />
          <AmenityCatalogRequestGrid
            amenities={amenityCatalog ?? []}
            targets={plotRows.map((plot: any) => ({ id: plot.id, label: `${plot.plot_number} · ${plot.location}` }))}
            targetName="plotId"
            targetLabel="Select plot for consultation"
            action={requestSellerAmenity}
            disabledText="Add a seller plot before requesting amenities."
          />
          <AmenityWorkflowTable rows={activeAmenities} empty="No amenities requested yet." />
        </div>
      )
    }

    if (section === 'documents' || section === 'notifications') {
      const rows = section === 'documents' ? documentRows : notificationRows
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow={section} title={section === 'documents' ? 'Seller documents' : 'Notifications'} body="Operational records connected to your seller workspace." />
          {section === 'documents' ? (
            <>
              <div className={`${cardClass} grid gap-4`}>
                <p className="text-sm leading-6 text-[#6B7280]">Upload survey copies, layout images, ownership proof, tax receipts, and real property photos. Every upload enters PlotKare verification.</p>
                <PropertyDocumentUploadPanel
                  role="seller"
                  properties={propertyRows.map((property: any) => ({ id: property.id, label: property.title || property.city || property.id }))}
                  documents={documentRows}
                />
              </div>
              <PropertyDocumentRecordTable
                rows={documentRows.map((row: any) => ({
                  ...row,
                  linked_label: propertyRows.find((property: any) => property.id === row.property_id)?.title || row.property_id || 'Seller property',
                }))}
                empty="No documents uploaded yet."
              />
            </>
          ) : null}
          {section === 'notifications' ? <RecordTable rows={rows} /> : null}
        </div>
      )
    }

    if (section === 'services') {
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow="Plans & services" title="Service operations" body="Request inspections, document pickup, legal review, or maintenance support for seller-managed properties." />
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <form action={createSellerServiceRequest} className={`${cardClass} grid gap-3`}>
              <select name="propertyId" required className={inputClass} defaultValue=""><option value="" disabled>Select property</option>{propertyRows.map((property: any) => <option key={property.id} value={property.id}>{property.title || property.city || property.id}</option>)}</select>
              <input name="title" required placeholder="Service request title" className={inputClass} />
              <textarea name="description" rows={5} placeholder="Describe the work needed" className={inputClass} />
              <select name="priority" className={inputClass} defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
              <PendingActionButton className={buttonClass} pendingText="Creating..." disabled={propertyRows.length === 0}>Create service request</PendingActionButton>
            </form>
            <div className={`${cardClass} overflow-x-auto`}>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Request</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th></tr></thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {serviceRows.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-[#6B7280]">No service requests yet.</td></tr> : null}
                  {serviceRows.map((row: any) => <tr key={row.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{row.title}</td><td className="px-3 py-3 text-[#6B7280]">{row.priority}</td><td className="px-3 py-3">{badge(row.status)}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">{(plans ?? []).map((plan: any) => <div key={plan.id} className={cardClass}><p className="font-semibold text-[#1F2937]">{plan.name}</p><p className="mt-2 font-mono text-[#C0392B]">₹{plan.price_monthly ?? 0}/month</p></div>)}</div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Support" title="Seller support tickets" body="Raise listing, customer-linking, document, or verification support issues." />
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form action={createSellerSupportTicket} className={`${cardClass} grid gap-3`}>
            <select name="propertyId" className={inputClass} defaultValue=""><option value="">General seller support</option>{propertyRows.map((property: any) => <option key={property.id} value={property.id}>{property.title || property.city || property.id}</option>)}</select>
            <input name="subject" required placeholder="Subject" className={inputClass} />
            <textarea name="description" required rows={5} placeholder="Describe the support issue" className={inputClass} />
            <select name="priority" className={inputClass} defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
            <PendingActionButton className={buttonClass} pendingText="Opening...">Open support ticket</PendingActionButton>
          </form>
          <SupportTicketThreadList tickets={ticketRows} replies={supportReplies ?? []} />
        </div>
      </div>
    )
  })()

  return (
    <RoleDashboardShell
      role="seller"
      title={seller?.company_name || 'Seller operations'}
      subtitle="Manage plots, sold customers, verification state, and service requests."
      userLabel={profile.full_name || profile.email}
      avatarUrl={profile.avatar_path}
      userId={user.id}
    >
      {successMessage ? (
        <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {content}
    </RoleDashboardShell>
  )
}

function RecordTable({ rows }: { rows: any[] }) {
  return (
    <div className={`${cardClass} overflow-x-auto`}>
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Record</th><th className="px-3 py-3">Status/type</th><th className="px-3 py-3">Date</th></tr></thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.length === 0 ? <tr><td colSpan={3} className="px-3 py-10 text-center text-[#6B7280]">No records yet.</td></tr> : null}
          {rows.map((row: any) => <tr key={row.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{row.title || row.amenities?.name || row.name || row.subject || row.id}</td><td className="px-3 py-3">{badge(row.verification_status || row.category || row.amenities?.category || (row.read_at ? 'read' : 'new'))}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at)}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}
