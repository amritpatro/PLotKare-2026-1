import { notFound } from 'next/navigation'
import {
  createCustomerSupportTicket,
  createListingInquiry,
  requestCustomerAmenity,
  createSiteVisitRequest,
  saveListing,
  unsaveListing,
} from '@/app/customer/actions'
import { AmenityCatalogRequestGrid } from '@/components/amenities/amenity-catalog-request-grid'
import { AmenityWorkflowTable } from '@/components/amenities/amenity-workflow-table'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import { PropertyDocumentUploadPanel } from '@/components/documents/property-document-upload-panel'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { readAmenityWorkflowRows } from '@/lib/amenity-operations'
import { linkedPropertyFrom, getCustomerWorkspaceData } from '@/lib/customer-workspace/data'
import type { CustomerListing } from '@/lib/customer-workspace/types'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

function statusPill(value: string | null | undefined) {
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
                  {listing.approval_status === 'approved' && listing.is_published ? <PlotKareVerifiedStamp compact /> : statusPill(listing.approval_status)}
                </td>
                <td className="px-3 py-4">
                  <div className="grid gap-2">
                    <form action={savedIds.has(listing.id) ? unsaveListing : saveListing}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button type="submit" className={secondaryButtonClass}>{savedIds.has(listing.id) ? 'Remove saved' : 'Save listing'}</button>
                    </form>
                    <form action={createListingInquiry} className="grid gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input name="message" required className={inputClass} placeholder="Ask about documents or site visit" />
                      <button type="submit" className={buttonClass}>Send inquiry</button>
                    </form>
                    <form action={createSiteVisitRequest} className="grid gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="datetime-local" name="preferredDate" required className={inputClass} />
                      <input type="hidden" name="notes" value={`Visit request for ${listing.plot_number}`} />
                      <button type="submit" className={secondaryButtonClass}>Request visit</button>
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

  const { user, profile } = await requirePageRole(['customer', 'admin'])
  const supabase = await createSupabaseServerClient()
  const data = await getCustomerWorkspaceData(supabase, user.id)
  const { data: amenityCatalog } = await supabase
    .from('amenities')
    .select('id,name,category,kind,amount,active')
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
                  return <tr key={saved.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{listing?.location ?? saved.listing_id}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(saved.created_at)}</td><td className="px-3 py-3"><form action={unsaveListing}><input type="hidden" name="listingId" value={saved.listing_id} /><button className={secondaryButtonClass}>Remove</button></form></td></tr>
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
                {rows.map((row) => <tr key={row.id}><td className="px-3 py-3 text-[#1F2937]">{row.listing_id}</td><td className="px-3 py-3">{statusPill(row.status)}</td><td className="px-3 py-3 text-[#6B7280]">{'message' in row ? row.message : row.notes}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at)}</td></tr>)}
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
                  return <tr key={link.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{property?.title ?? 'Property pending'}</td><td className="px-3 py-3 text-[#6B7280]">{property?.city || property?.address || 'Location pending'}</td><td className="px-3 py-3 text-[#6B7280]">{link.relationship_type}</td><td className="px-3 py-3">{statusPill(link.status)}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(link.registration_date)}</td></tr>
                })}
              </tbody>
            </table>
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
                <PropertyDocumentUploadPanel role="customer" properties={propertyOptions} />
              </div>
              <PropertyDocumentRecordTable
                rows={data.documents.map((row) => ({
                  ...row,
                  linked_label: propertyOptions.find((property) => property.id === row.property_id)?.label || row.property_id || 'Customer record',
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
            <button type="submit" className={buttonClass}>Open support ticket</button>
          </form>
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Ticket</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {data.supportTickets.length === 0 ? <tr><td colSpan={3} className="px-3 py-8 text-center text-[#6B7280]">No support tickets yet.</td></tr> : null}
                {data.supportTickets.map((ticket) => <tr key={ticket.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{ticket.subject}</td><td className="px-3 py-3 text-[#6B7280]">{ticket.priority}</td><td className="px-3 py-3">{statusPill(ticket.status)}</td></tr>)}
              </tbody>
            </table>
          </div>
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
      userId={user.id}
    >
      {content}
    </RoleDashboardShell>
  )
}
