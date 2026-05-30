import { notFound } from 'next/navigation'
import {
  createCustomerSupportTicket,
  createListingInquiry,
  requestAdditionalPropertyLink,
  requestCustomerAmenity,
  createSiteVisitRequest,
  saveListing,
  unsaveListing,
} from '@/app/customer/actions'
import { AmenityCatalogRequestGrid } from '@/components/amenities/amenity-catalog-request-grid'
import { AmenityWorkflowTable } from '@/components/amenities/amenity-workflow-table'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import { PropertyDocumentUploadPanel } from '@/components/documents/property-document-upload-panel'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { SupportTicketThreadList } from '@/components/support/support-ticket-thread-list'
import { readAmenityWorkflowRows } from '@/lib/amenity-operations'
import { linkedPropertyFrom, getCustomerWorkspaceData } from '@/lib/customer-workspace/data'
import type { CustomerListing } from '@/lib/customer-workspace/types'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/status-badge'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]'
const secondaryButtonClass =
  'rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#1F2937] transition hover:border-[#C0392B]/30 hover:text-[#C0392B]'

const allowedSections = ['listings', 'saved', 'inquiries', 'site-visits', 'services', 'amenities', 'properties', 'documents', 'support'] as const

type Section = (typeof allowedSections)[number]

type PageProps = {
  params: Promise<{ section: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const actionMessages = {
  success: {
    listing_saved: 'Listing saved to your workspace.',
    listing_unsaved: 'Listing removed from your saved list.',
    inquiry_created: 'Your inquiry has been sent to PlotKare operations.',
    site_visit_created: 'Your site visit request has been submitted.',
    support_ticket_created: 'Support ticket opened successfully.',
    amenity_requested: 'Amenity consultation requested.',
    property_request_submitted: 'Property link request submitted for PlotKare verification.',
  },
  error: {
    invalid_listing: 'This listing is no longer available for that action.',
    invalid_inquiry: 'Complete the inquiry details and try again.',
    invalid_site_visit: 'Choose a visit date and try again.',
    invalid_support_form: 'Complete the support form and try again.',
    invalid_amenity_form: 'Select a property and amenity to request consultation.',
    marketplace_schema_pending: 'Marketplace services are temporarily unavailable.',
    save_failed: 'The listing could not be saved.',
    unsave_failed: 'The saved listing could not be removed.',
    inquiry_failed: 'Your inquiry could not be sent.',
    site_visit_failed: 'Your site visit request could not be sent.',
    support_ticket_failed: 'Your support ticket could not be opened.',
    amenity_request_failed: 'Your amenity consultation request could not be saved.',
    invalid_property_request: 'Complete the property details before submitting.',
    property_request_failed: 'The property request could not be submitted.',
  },
} as const

function searchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
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

function listingSubtitle(listing: CustomerListing) {
  if (listing.property_kind === 'apartment') return `${listing.bhk ?? '-'} BHK${listing.floor_label ? ` · ${listing.floor_label}` : ''}`
  return `${listing.size_label} · ${listing.facing} facing${listing.corner_plot ? ' · Corner' : ''}`
}

function ListingsPage({ listings, savedIds }: { listings: CustomerListing[]; savedIds: Set<string> }) {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Customer listings"
        title="Verified marketplace"
        body="Only listings approved by PlotKare verification are shown here. Pending seller submissions stay hidden until review is complete."
      />
      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Listing</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Details</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Verification</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-[#6B7280]">
                  No verified listings are available yet.
                </td>
              </tr>
            ) : null}
            {listings.map((listing) => (
              <tr key={listing.id} className="align-top">
                <td className="px-3 py-4">
                  <p className="font-mono text-[#C0392B]">{listing.plot_number}</p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">{listing.property_kind}</p>
                </td>
                <td className="px-3 py-4 font-semibold text-[#1F2937]">{listing.location}</td>
                <td className="px-3 py-4 text-[#6B7280]">{listingSubtitle(listing)}</td>
                <td className="px-3 py-4 font-semibold text-[#1F2937]">{listing.price_display}</td>
                <td className="px-3 py-4">
                  {listing.approval_status === 'approved' && listing.is_published ? <PlotKareVerifiedStamp compact /> : <StatusBadge status={listing.approval_status} />}
                </td>
                <td className="px-3 py-4">
                  <div className="grid gap-2">
                    <form action={savedIds.has(listing.id) ? unsaveListing : saveListing}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <PendingActionButton pendingText="Saving..." className={secondaryButtonClass}>
                        {savedIds.has(listing.id) ? 'Remove saved' : 'Save listing'}
                      </PendingActionButton>
                    </form>
                    <form action={createListingInquiry} className="grid gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input name="message" required className={inputClass} placeholder="Ask about documents or site visit" />
                      <PendingActionButton pendingText="Sending..." className={buttonClass}>Send inquiry</PendingActionButton>
                    </form>
                    <form action={createSiteVisitRequest} className="grid gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="datetime-local" name="preferredDate" required className={inputClass} />
                      <input type="hidden" name="notes" value={`Visit request for ${listing.plot_number}`} />
                      <PendingActionButton pendingText="Requesting..." className={secondaryButtonClass}>Request visit</PendingActionButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RecordTable({ rows, empty }: { rows: any[]; empty: string }) {
  return (
    <div className={`${cardClass} overflow-x-auto`}>
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
            <th className="px-3 py-3">Record</th>
            <th className="px-3 py-3">Status/type</th>
            <th className="px-3 py-3">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-8 text-center text-[#6B7280]">{empty}</td>
            </tr>
          ) : null}
          {rows.map((row: any) => (
            <tr key={row.id}>
              <td className="px-3 py-3 font-semibold text-[#1F2937]">{row.title || row.name || row.summary || row.id}</td>
              <td className="px-3 py-3 text-[#6B7280]">{row.document_type || row.verification_status || row.status || row.category || 'active'}</td>
              <td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function CustomerSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params
  if (!allowedSections.includes(section as Section)) notFound()
  const query = (await searchParams) ?? {}
  const successCode = searchParam(query.success) as keyof typeof actionMessages.success | undefined
  const errorCode = searchParam(query.error) as keyof typeof actionMessages.error | undefined
  const successMessage = successCode ? actionMessages.success[successCode] : undefined
  const errorMessage = errorCode ? actionMessages.error[errorCode] : undefined

  const { user, profile } = await requirePageRole(['customer', 'admin'])
  const supabase = await createSupabaseServerClient()
  const data = await getCustomerWorkspaceData(supabase, user.id)
  const { data: amenityCatalog } = await supabase
    .from('amenities')
    .select('id,name,category,kind,amount,image_path,active')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })
  const savedIds = new Set(data.savedListings.map((saved) => saved.listing_id))
  const propertyOptions = data.propertyLinks
    .map((link) => {
      const property = linkedPropertyFrom(link)
      return {
        id: link.property_id,
        label: property?.title || property?.city || property?.address || 'Linked property',
      }
    })
  const amenityWorkflowRows = propertyOptions.length
    ? await readAmenityWorkflowRows(supabase, { propertyIds: propertyOptions.map((property) => property.id), requesterIds: [user.id] })
    : []
  const page = section as Section
  const { data: propertyRequests } = page === 'properties' || page === 'documents'
    ? await supabase
        .from('customer_property_requests')
        .select('id,property_title,property_kind,address,city,state,relationship_type,status,review_notes,created_at')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }
  const { data: supportReplies } = page === 'support' && data.supportTickets.length
    ? await supabase
        .from('ticket_replies')
        .select('id,ticket_id,body,visibility,created_at')
        .in('ticket_id', data.supportTickets.map((ticket) => ticket.id))
        .eq('visibility', 'public')
        .order('created_at', { ascending: true })
    : { data: [] }
  const documentPropertyRequests = (propertyRequests ?? [])
    .filter((request: any) => ['submitted', 'under_review', 'needs_clarification'].includes(request.status))
    .map((request: any) => ({ id: request.id, label: `${request.property_title} - ${request.city}` }))

  const content = (() => {
    if (page === 'listings') return <ListingsPage listings={data.listings} savedIds={savedIds} />

    if (page === 'saved') {
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow="Saved" title="Shortlisted listings" body="Saved verified opportunities stay connected to your customer account." />
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Listing</th><th className="px-3 py-3">Saved</th><th className="px-3 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {data.savedListings.length === 0 ? <tr><td colSpan={3} className="px-3 py-8 text-center text-[#6B7280]">No saved listings yet.</td></tr> : null}
                {data.savedListings.map((saved) => {
                  const listing = data.listings.find((item) => item.id === saved.listing_id)
                  return <tr key={saved.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{listing?.location ?? saved.listing_id}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(saved.created_at)}</td><td className="px-3 py-3"><form action={unsaveListing}><input type="hidden" name="listingId" value={saved.listing_id} /><PendingActionButton pendingText="Removing..." className={secondaryButtonClass}>Remove</PendingActionButton></form></td></tr>
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (page === 'inquiries' || page === 'site-visits') {
      const rows = page === 'inquiries' ? data.inquiries : data.siteVisits
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow={page === 'inquiries' ? 'Inquiries' : 'Site visits'} title={page === 'inquiries' ? 'Buyer conversations' : 'Visit requests'} body="Track every request from submission through PlotKare operations follow-up." />
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Listing</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Notes</th><th className="px-3 py-3">Created</th></tr></thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rows.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-[#6B7280]">No records yet.</td></tr> : null}
                {rows.map((row) => <tr key={row.id}><td className="px-3 py-3 text-[#1F2937]">{row.listing_id}</td><td className="px-3 py-3"><StatusBadge status={row.status} /></td><td className="px-3 py-3 text-[#6B7280]">{'message' in row ? row.message : row.notes}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (page === 'properties') {
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow="My property" title="Linked property records" body="Purchased, rented, or nominated properties linked by sellers or admins." />
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Property</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Relationship</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Registration</th></tr></thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {data.propertyLinks.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-[#6B7280]">No linked properties yet.</td></tr> : null}
                {data.propertyLinks.map((link) => {
                  const property = linkedPropertyFrom(link)
                  return <tr key={link.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{property?.title ?? 'Property pending'}</td><td className="px-3 py-3 text-[#6B7280]">{property?.city || property?.address || 'Location pending'}</td><td className="px-3 py-3 text-[#6B7280]">{link.relationship_type}</td><td className="px-3 py-3"><StatusBadge status={link.status} /></td><td className="px-3 py-3 text-[#6B7280]">{formatDate(link.registration_date)}</td></tr>
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <form action={requestAdditionalPropertyLink} className={`${cardClass} grid gap-3`}>
              <h3 className="font-serif text-xl font-semibold text-[#1F2937]">Request another property link</h3>
              <p className="text-sm leading-6 text-[#6B7280]">Submit a property claim for verification. Access becomes active only after approval.</p>
              <select name="propertyKind" className={inputClass} defaultValue="plot"><option value="plot">Plot</option><option value="apartment">Apartment</option><option value="rental">Rental</option><option value="managed_property">Managed property</option></select>
              <input name="propertyTitle" required className={inputClass} placeholder="Property title or plot reference" />
              <input name="address" required className={inputClass} placeholder="Address or survey location" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="city" required className={inputClass} placeholder="City" />
                <input name="state" required className={inputClass} defaultValue="Andhra Pradesh" />
              </div>
              <input name="postalCode" className={inputClass} placeholder="Postal code" />
              <select name="relationshipType" className={inputClass} defaultValue="buyer"><option value="buyer">Buyer</option><option value="owner">Owner</option><option value="renter">Renter</option><option value="tenant">Tenant</option><option value="nominee">Nominee</option></select>
              <textarea name="notes" rows={3} className={inputClass} placeholder="Evidence available or notes for verification" />
              <PendingActionButton pendingText="Submitting..." className={buttonClass}>Submit verification request</PendingActionButton>
            </form>
            <div className={`${cardClass} overflow-x-auto`}>
              <h3 className="font-serif text-xl font-semibold text-[#1F2937]">Pending requests</h3>
              <table className="mt-4 w-full min-w-[620px] text-left text-sm">
                <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Request</th><th className="px-3 py-3">Relationship</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Next step</th></tr></thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {(propertyRequests ?? []).length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-[#6B7280]">No property link requests yet.</td></tr> : null}
                  {(propertyRequests ?? []).map((request: any) => <tr key={request.id}><td className="px-3 py-3"><p className="font-semibold text-[#1F2937]">{request.property_title}</p><p className="text-xs text-[#6B7280]">{request.city}, {request.state}</p></td><td className="px-3 py-3 text-[#6B7280]">{request.relationship_type}</td><td className="px-3 py-3"><StatusBadge status={request.status} /></td><td className="px-3 py-3 text-[#6B7280]">{request.review_notes || (request.status === 'approved' ? 'Property access activated.' : 'Upload supporting documents in Document vault.')}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }

    if (page === 'amenities') {
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow="Amenities" title="Amenity requests" body="Explore PlotKare-managed amenities with real images, fit guidance, area expectations, and consultation requests for linked customer properties." />
          <AmenityCatalogRequestGrid
            amenities={amenityCatalog ?? []}
            targets={propertyOptions.map((property) => ({ id: property.id, label: property.label }))}
            targetName="propertyId"
            targetLabel="Select linked property for consultation"
            action={requestCustomerAmenity}
            disabledText="A linked property is required before requesting amenities."
          />
          <AmenityWorkflowTable rows={amenityWorkflowRows} empty="No amenities requested yet." />
        </div>
      )
    }

    if (page === 'documents' || page === 'services') {
      const rows = page === 'documents' ? data.documents : [...data.inspections, ...data.maintenanceRequests]
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow={page} title={page === 'documents' ? 'Document vault' : 'Service tracking'} body="Role-safe operational records linked to your customer profile." />
          {page === 'documents' ? (
            <>
              <div className={`${cardClass} grid gap-4`}>
                <p className="text-sm leading-6 text-[#6B7280]">Required customer documents: Aadhaar, PAN, agreement or registration copy, and current property photos. Every upload enters admin/employee verification.</p>
                <PropertyDocumentUploadPanel role="customer" properties={propertyOptions} propertyRequests={documentPropertyRequests} documents={data.documents} />
              </div>
              <PropertyDocumentRecordTable
                rows={data.documents.map((row) => ({
                  ...row,
                  linked_label: propertyOptions.find((property) => property.id === row.property_id)?.label ||
                    documentPropertyRequests.find((request) => request.id === row.property_request_id)?.label ||
                    row.property_id ||
                    'Customer record',
                }))}
                empty="No documents uploaded yet."
              />
            </>
          ) : null}
          {page === 'services' ? <RecordTable rows={rows} empty="No records yet." /> : null}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Support center" title="Support tickets" body="Open account, property, document, or visit issues directly into PlotKare operations." />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form action={createCustomerSupportTicket} className={`${cardClass} grid gap-3`}>
            <select name="propertyId" className={inputClass} defaultValue="">
              <option value="">General account support</option>
              {data.propertyLinks.map((link) => {
                const property = linkedPropertyFrom(link)
                return <option key={link.id} value={link.property_id}>{property?.title || property?.city || 'Linked property'}</option>
              })}
            </select>
            <input name="subject" required placeholder="Subject" className={inputClass} />
            <textarea name="description" required rows={5} placeholder="Describe what support should resolve." className={inputClass} />
            <select name="priority" className={inputClass} defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
            <PendingActionButton pendingText="Opening..." className={buttonClass}>Open support ticket</PendingActionButton>
          </form>
          <SupportTicketThreadList tickets={data.supportTickets} replies={supportReplies ?? []} />
        </div>
      </div>
    )
  })()

  return (
    <RoleDashboardShell
      role="customer"
      title="Buyer workspace"
      subtitle="Browse listings, save opportunities, request visits, and manage linked property services."
      userLabel={profile.full_name || profile.email}
      avatarUrl={profile.avatar_path}
      userId={user.id}
    >
      {successMessage ? (
        <p role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mb-6 rounded-lg border border-[#F5C5BF] bg-[#FEF2F2] px-4 py-3 text-sm text-[#A93226]">{errorMessage}</p>
      ) : null}
      {content}
    </RoleDashboardShell>
  )
}
