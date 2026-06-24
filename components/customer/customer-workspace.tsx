import Link from 'next/link'
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  Headphones,
  Home,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  createListingInquiry,
  createCustomerSupportTicket,
  createSiteVisitRequest,
  saveListing,
  unsaveListing,
} from '@/app/customer/actions'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import { linkedPropertyFrom } from '@/lib/customer-workspace/data'
import StatusBadge from '@/components/ui/status-badge'
import type {
  CustomerListing,
  CustomerWorkspaceData,
  ListingInquiry,
  SavedListing,
  SiteVisitRequest,
} from '@/lib/customer-workspace/types'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const subtleCardClass = 'rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4'
const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const labelClass = 'mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#6B7280]'
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]'
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#1F2937] transition hover:border-[#C0392B]/30 hover:text-[#C0392B] disabled:cursor-not-allowed disabled:text-[#9CA3AF]'

const successMessages = {
  listing_saved: 'Listing saved to your buyer workspace.',
  listing_unsaved: 'Listing removed from saved listings.',
  inquiry_created: 'Inquiry submitted. The team can now follow up from your account record.',
  site_visit_created: 'Site visit request submitted.',
  support_ticket_created: 'Support ticket opened. PlotKare support can now track it live.',
} as const

const errorMessages = {
  invalid_listing: 'That listing could not be identified. Please refresh and try again.',
  invalid_inquiry: 'Please add a short inquiry message before submitting.',
  invalid_site_visit: 'Please choose a valid preferred visit date.',
  invalid_support_form: 'Please add a support subject and description.',
  marketplace_schema_pending: 'Marketplace action tables are not available yet. Saved listings, inquiries, and site visits need schema migration.',
  save_failed: 'We could not save that listing right now.',
  unsave_failed: 'We could not remove that saved listing right now.',
  inquiry_failed: 'We could not submit that inquiry right now.',
  site_visit_failed: 'We could not submit that site visit request right now.',
  support_ticket_failed: 'We could not create that support ticket right now.',
} as const

type CustomerWorkspaceProps = {
  data: CustomerWorkspaceData
  profileLabel: string
  successCode?: keyof typeof successMessages
  errorCode?: keyof typeof errorMessages
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value))
}

function formatMoneyLakhs(value: number | null | undefined) {
  if (!value) return 'Consult'
  return `₹${value.toLocaleString('en-IN')}L`
}

function statusLabel(value: string | null | undefined) {
  return value ? value.replace(/_/g, ' ') : 'pending'
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-6 text-sm">
      <p className="font-semibold text-[#1F2937]">{title}</p>
      <p className="mt-2 leading-6 text-[#6B7280]">{body}</p>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C9A962]">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-[#1F2937]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function listingSubtitle(listing: CustomerListing) {
  if (listing.property_kind === 'apartment') {
    return `${listing.bhk ?? '—'} BHK${listing.floor_label ? ` · ${listing.floor_label}` : ''}`
  }

  return `${listing.size_label} · ${listing.facing} facing${listing.corner_plot ? ' · Corner' : ''}`
}

function ProfileCompletionPrompt({ data }: { data: CustomerWorkspaceData }) {
  const buyer = data.buyerDetails
  const customer = data.customer
  const checks = [
    { label: 'Customer record', done: Boolean(customer) },
    { label: 'Contact details', done: Boolean(customer?.phone || customer?.email) },
    { label: 'Budget range', done: Boolean(buyer?.investment_budget_lakhs || buyer?.investment_budget_max_lakhs) },
    { label: 'Preferred locations', done: Boolean(buyer?.preferred_locations?.length) },
    { label: 'Property types', done: Boolean(buyer?.preferred_property_types?.length) },
    { label: 'Purpose and timeline', done: Boolean(buyer?.buying_purpose && buyer?.purchase_timeline) },
  ]
  const completed = checks.filter((check) => check.done).length
  const percentage = Math.round((completed / checks.length) * 100)
  const missing = checks.filter((check) => !check.done)

  return (
    <section id="profile-completion" className={cardClass}>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#FFF1F2] p-2 text-[#C0392B]">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C9A962]">Profile completion</p>
              <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">{percentage}% ready</h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
            A complete buyer profile helps the team qualify listing matches, site visits, documents, and loan support from your real account record.
          </p>
        </div>
        <Link href="/onboarding/plot-buyer" className={primaryButtonClass}>
          Complete profile
        </Link>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div className="h-full bg-[#C0392B]" style={{ width: `${percentage}%` }} />
      </div>
      {missing.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {missing.map((item) => (
            <span key={item.label} className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">
              {item.label} pending
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function ListingActions({
  listing,
  saved,
  readiness,
}: {
  listing: CustomerListing
  saved: boolean
  readiness: {
    save: boolean
    inquiry: boolean
    siteVisit: boolean
  }
}) {
  return (
    <div className="mt-5 grid gap-3 xl:grid-cols-2">
      <form action={saved ? unsaveListing : saveListing}>
        <input type="hidden" name="listingId" value={listing.id} />
        <PendingActionButton pendingText="Saving..." disabled={!readiness.save} className={secondaryButtonClass}>
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save'}
        </PendingActionButton>
      </form>
      <form action={createSiteVisitRequest} className="space-y-2">
        <input type="hidden" name="listingId" value={listing.id} />
        <label className={labelClass} htmlFor={`visit-${listing.id}`}>
          Site visit
        </label>
        <input id={`visit-${listing.id}`} type="datetime-local" name="preferredDate" disabled={!readiness.siteVisit} className={inputClass} />
        <input type="hidden" name="notes" value={`Interested in ${listing.plot_number}`} />
        <PendingActionButton pendingText="Requesting..." disabled={!readiness.siteVisit} className={primaryButtonClass}>
          <CalendarDays className="h-4 w-4" />
          Request
        </PendingActionButton>
      </form>
      <form action={createListingInquiry} className="space-y-2 xl:col-span-2">
        <input type="hidden" name="listingId" value={listing.id} />
        <label className={labelClass} htmlFor={`inquiry-${listing.id}`}>
          Inquiry
        </label>
        <textarea
          id={`inquiry-${listing.id}`}
          name="message"
          disabled={!readiness.inquiry}
          rows={3}
          className={inputClass}
          placeholder="Ask about documents, pricing, availability, or loan support."
        />
        <PendingActionButton pendingText="Sending..." disabled={!readiness.inquiry} className={secondaryButtonClass}>
          <MessageSquare className="h-4 w-4" />
          Send inquiry
        </PendingActionButton>
      </form>
    </div>
  )
}

function BrowseListingsSection({ data }: { data: CustomerWorkspaceData }) {
  const savedIds = new Set(data.savedListings.map((saved) => saved.listing_id))
  const readiness = {
    save: data.schemaStatus.savedListingsReady,
    inquiry: data.schemaStatus.inquiriesReady,
    siteVisit: data.schemaStatus.siteVisitsReady,
  }
  const unavailableActions = [
    !readiness.save ? 'saved listings' : null,
    !readiness.inquiry ? 'inquiries' : null,
    !readiness.siteVisit ? 'site visits' : null,
  ].filter(Boolean)

  return (
    <section id="browse-listings" className={cardClass}>
      <SectionHeader eyebrow="Browse listings" title="Marketplace opportunities">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{data.listings.length} active</span>
      </SectionHeader>
      {unavailableActions.length ? (
        <p className="mt-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          Marketplace {unavailableActions.join(', ')} data is pending migration. Each ready action remains available independently.
        </p>
      ) : null}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {data.listings.length === 0 ? (
          <div className="xl:col-span-2">
            <EmptyState title="No active listings available" body="When sellers publish active listings, they will appear here for browsing and follow-up." />
          </div>
        ) : null}
        {data.listings.map((listing) => (
          <article key={listing.id} className={subtleCardClass}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C0392B]">{listing.plot_number}</p>
                <h3 className="mt-2 font-serif text-xl font-semibold text-[#1F2937]">{listing.location}</h3>
                <p className="mt-1 text-sm text-[#6B7280]">{listingSubtitle(listing)}</p>
              </div>
              <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                {listing.approval_status === 'approved' && listing.is_published ? <PlotKareVerifiedStamp compact /> : null}
                {/* Use shared StatusBadge to ensure consistent tones */}
                <StatusBadge status={listing.premium ? 'premium' : listing.status} />
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[#9CA3AF]">Price</dt>
                <dd className="font-semibold text-[#1F2937]">{listing.price_display || formatMoneyLakhs(listing.price_lakhs)}</dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Size</dt>
                <dd className="font-semibold text-[#1F2937]">{listing.size_sq_yards.toLocaleString('en-IN')} sq yd</dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Inquiries</dt>
                <dd className="font-semibold text-[#1F2937]">{listing.inquiries_count}</dd>
              </div>
            </dl>
            <ListingActions listing={listing} saved={savedIds.has(listing.id)} readiness={readiness} />
          </article>
        ))}
      </div>
    </section>
  )
}

function SavedListingsSection({ listings, savedListings, schemaReady }: { listings: CustomerListing[]; savedListings: SavedListing[]; schemaReady: boolean }) {
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]))

  return (
    <section id="saved-listings" className={cardClass}>
      <SectionHeader eyebrow="Saved listings" title="Shortlisted inventory" />
      <div className="mt-5 divide-y divide-[#E5E7EB]">
        {savedListings.length === 0 ? (
          <EmptyState title="No saved listings yet" body="Save active marketplace listings to keep your shortlist connected to your account." />
        ) : null}
        {savedListings.map((saved) => {
          const listing = listingsById.get(saved.listing_id)
          return (
            <div key={saved.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-[#1F2937]">{listing?.location ?? 'Listing not in active browse results'}</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">Saved {formatDate(saved.created_at)}</p>
              </div>
              <form action={unsaveListing}>
                <input type="hidden" name="listingId" value={saved.listing_id} />
                <PendingActionButton pendingText="Removing..." disabled={!schemaReady} className={secondaryButtonClass}>
                  Remove
                </PendingActionButton>
              </form>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TimelineList({
  rows,
  listings,
  emptyTitle,
  emptyBody,
}: {
  rows: Array<ListingInquiry | SiteVisitRequest>
  listings: CustomerListing[]
  emptyTitle: string
  emptyBody: string
}) {
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]))

  return (
    <div className="mt-5 divide-y divide-[#E5E7EB]">
      {rows.length === 0 ? <EmptyState title={emptyTitle} body={emptyBody} /> : null}
      {rows.map((row) => {
      const listing = listingsById.get(row.listing_id)
      const preferredDate = (row as any).preferred_date ?? (row as any).scheduled_for ?? null
      const note = 'message' in row ? row.message : row.notes
        return (
          <div key={row.id} className="py-4">
              <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[#1F2937]">{listing?.location ?? 'Listing reference'}</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">{preferredDate ? `Preferred ${formatDate(preferredDate)}` : `Created ${formatDate(row.created_at)}`}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            {note ? <p className="mt-2 text-sm leading-6 text-[#6B7280]">{note}</p> : null}
          </div>
        )
      })}
    </div>
  )
}

export function CustomerWorkspace({ data, profileLabel, successCode, errorCode }: CustomerWorkspaceProps) {
  const successMessage = successCode ? successMessages[successCode] : null
  const errorMessage = errorCode ? errorMessages[errorCode] : null
  const kycStatus = data.customer?.kyc_status || data.buyerDetails?.kyc_status || 'pending'
  const budgetLabel = data.buyerDetails
    ? `${formatMoneyLakhs(data.buyerDetails.investment_budget_lakhs)} - ${formatMoneyLakhs(data.buyerDetails.investment_budget_max_lakhs)}`
    : 'Not set'
  const overviewStats: Array<{ label: string; value: number; Icon: LucideIcon }> = [
    { label: 'Active listings', value: data.listings.length, Icon: Sparkles },
    { label: 'Saved listings', value: data.savedListings.length, Icon: BookmarkCheck },
    { label: 'Open inquiries', value: data.inquiries.length, Icon: MessageSquare },
    { label: 'Linked properties', value: data.propertyLinks.length, Icon: Home },
  ]

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Customer marketplace workspace</p>
            <h2 className="mt-4 font-serif text-4xl font-bold leading-tight text-[#1F2937]">Find, save, verify, and manage property activity</h2>
            <p className="mt-3 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
              Browse active listings, track your inquiries and visits, and manage linked-property services from live PlotKare records.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">KYC status</p>
              <p className="mt-2 font-sans text-lg font-semibold capitalize text-[#C0392B]">{statusLabel(kycStatus)}</p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">Buyer budget</p>
              <p className="mt-2 font-sans text-lg font-semibold text-[#1F2937]">{budgetLabel}</p>
            </div>
          </div>
        </div>
        {(successMessage || errorMessage) && (
          <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${successMessage ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]' : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'}`}>
            {successMessage || errorMessage}
          </div>
        )}
      </div>

      {!data.customer ? (
        <div className={cardClass}>
          <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Customer operations record pending</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            {profileLabel} has a customer role, but the customer table record is not linked yet. Marketplace browsing is still visible when listings are active; linked-property operations unlock after the customer record is created.
          </p>
        </div>
      ) : null}

      <ProfileCompletionPrompt data={data} />

      <section className="grid gap-4 md:grid-cols-4" id="overview">
        {overviewStats.map(({ label, value, Icon }) => (
          <div key={label} className={cardClass}>
            <Icon className="h-5 w-5 text-[#C0392B]" />
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#1F2937]">{value}</p>
          </div>
        ))}
      </section>

      <BrowseListingsSection data={data} />

      <section className="grid gap-6 lg:grid-cols-2">
        <SavedListingsSection listings={data.listings} savedListings={data.savedListings} schemaReady={data.schemaStatus.savedListingsReady} />

        <section id="inquiries" className={cardClass}>
          <SectionHeader eyebrow="Inquiries" title="Buyer conversations">
            <MessageSquare className="h-5 w-5 text-[#C0392B]" />
          </SectionHeader>
          {!data.schemaStatus.inquiriesReady ? (
            <p className="mt-4 text-sm text-[#92400E]">Inquiry table is pending migration.</p>
          ) : (
            <TimelineList rows={data.inquiries} listings={data.listings} emptyTitle="No inquiries yet" emptyBody="Questions sent from listing cards will appear here with their live status." />
          )}
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section id="site-visits" className={cardClass}>
          <SectionHeader eyebrow="Site visits" title="Visit requests">
            <CalendarDays className="h-5 w-5 text-[#C0392B]" />
          </SectionHeader>
          {!data.schemaStatus.siteVisitsReady ? (
            <p className="mt-4 text-sm text-[#92400E]">Site visit request table is pending migration.</p>
          ) : (
            <TimelineList rows={data.siteVisits} listings={data.listings} emptyTitle="No site visits requested" emptyBody="When you request a visit from an active listing, the request and scheduling status will appear here." />
          )}
        </section>

        <section id="preferences" className={cardClass}>
          <SectionHeader eyebrow="Buyer profile" title="Search preferences" />
          {data.buyerDetails ? (
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#9CA3AF]">Budget</dt>
                <dd className="mt-1 font-medium text-[#1F2937]">{budgetLabel}</dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Property types</dt>
                <dd className="mt-1 font-medium capitalize text-[#1F2937]">
                  {data.buyerDetails.preferred_property_types?.length
                    ? data.buyerDetails.preferred_property_types.map((type) => type.replaceAll('_', ' ')).join(', ')
                    : 'Any'}
                </dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Size preference</dt>
                <dd className="mt-1 font-medium text-[#1F2937]">
                  {data.buyerDetails.preferred_plot_size_min || 'Any'} - {data.buyerDetails.preferred_plot_size_max || 'Any'} sq. yards
                </dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Locations</dt>
                <dd className="mt-1 font-medium text-[#1F2937]">
                  {data.buyerDetails.preferred_locations?.length ? data.buyerDetails.preferred_locations.join(', ') : 'Any'}
                </dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Purpose</dt>
                <dd className="mt-1 font-medium capitalize text-[#1F2937]">{statusLabel(data.buyerDetails.buying_purpose)}</dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Timeline</dt>
                <dd className="mt-1 font-medium capitalize text-[#1F2937]">{statusLabel(data.buyerDetails.purchase_timeline)}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState title="Buyer preferences not completed" body="Complete onboarding to store preferred budget, location, size, property type, purpose, and purchase timeline." />
          )}
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" id="linked-properties">
        <div className={cardClass}>
          <SectionHeader eyebrow="Linked properties" title="Ownership and tenancy records">
            <Home className="h-5 w-5 text-[#C0392B]" />
          </SectionHeader>
          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {data.propertyLinks.length === 0 ? <EmptyState title="No property is linked yet" body="Purchased, rented, or nominated properties connected by sellers or admins will appear here." /> : null}
            {data.propertyLinks.map((link) => {
              const property = linkedPropertyFrom(link)

              return (
                <div key={link.id} className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1F2937]">{property?.title || 'Property title pending'}</p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {property?.property_kind || 'property'} · {property?.city || property?.address || 'Location pending'} · {link.relationship_type}
                      </p>
                    </div>
                        <StatusBadge status={link.status} />
                  </div>
                  <p className="mt-3 text-sm text-[#9CA3AF]">
                    Registration: {formatDate(link.registration_date)} · Verification: {statusLabel(property?.verification_status)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className={cardClass}>
          <SectionHeader eyebrow="Amenities & services" title="Active care" >
            <ShieldCheck className="h-5 w-5 text-[#C0392B]" />
          </SectionHeader>
          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {data.amenities.length === 0 ? <EmptyState title="No active amenities" body="Activated amenities for linked plots will appear here with category and billing type." /> : null}
            {data.amenities.map((amenity) => (
              <div key={amenity.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#1F2937]">{amenity.name}</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      {amenity.category} · {amenity.kind} · {amenity.plot_number || 'Linked plot'}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-[#C0392B]">₹{amenity.amount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className={cardClass} id="documents">
          <SectionHeader eyebrow="Documents" title="Document vault">
            <FileText className="h-5 w-5 text-[#C0392B]" />
          </SectionHeader>
          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {data.documents.length === 0 ? <EmptyState title="No documents visible" body="Customer-visible property documents will appear after upload or linkage." /> : null}
            {data.documents.slice(0, 8).map((document) => (
              <div key={document.id} className="py-3">
                <p className="font-medium text-[#1F2937]">{document.title}</p>
                <p className="mt-1 text-xs capitalize text-[#9CA3AF]">{document.document_type} · {statusLabel(document.verification_status)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass} id="tracking">
          <SectionHeader eyebrow="Inspections" title="Site checks">
            <ClipboardList className="h-5 w-5 text-[#C0392B]" />
          </SectionHeader>
          <div className="mt-5 divide-y divide-[#E5E7EB]">
            {data.inspections.length === 0 ? <EmptyState title="No inspections recorded" body="Requested or completed inspections linked to your customer record will appear here." /> : null}
            {data.inspections.map((inspection) => (
              <div key={inspection.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium capitalize text-[#1F2937]">{statusLabel(inspection.status)}</p>
                  <span className="text-xs text-[#9CA3AF]">{formatDate(inspection.scheduled_for || inspection.completed_at || inspection.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-[#9CA3AF]">{inspection.summary || 'Report details pending'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass} id="support">
          <SectionHeader eyebrow="Support" title="Requests and tickets">
            <Headphones className="h-5 w-5 text-[#C0392B]" />
          </SectionHeader>
          <div className="mt-5 space-y-5">
            <form action={createCustomerSupportTicket} className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <select name="propertyId" className={inputClass} defaultValue="">
                <option value="">General account support</option>
                {data.propertyLinks.map((link) => {
                  const property = linkedPropertyFrom(link)

                  return (
                    <option key={link.id} value={link.property_id}>
                      {property?.title || property?.city || 'Linked property'}
                    </option>
                  )
                })}
              </select>
              <input name="subject" required placeholder="What should support help with?" className={inputClass} />
              <textarea name="description" required rows={3} placeholder="Add the issue, property reference, and what outcome you need." className={inputClass} />
              <select name="priority" className={inputClass} defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <PendingActionButton pendingText="Opening..." className={primaryButtonClass}>
                Open support ticket
              </PendingActionButton>
            </form>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF]">Maintenance</p>
              <div className="mt-2 divide-y divide-[#E5E7EB]">
                {data.maintenanceRequests.length === 0 ? <p className="py-3 text-sm text-[#6B7280]">No maintenance requests.</p> : null}
                {data.maintenanceRequests.map((request) => (
                  <div key={request.id} className="py-3">
                    <p className="font-medium text-[#1F2937]">{request.title}</p>
                    <p className="mt-1 text-xs capitalize text-[#9CA3AF]">{request.priority} · {statusLabel(request.status)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF]">Support tickets</p>
              <div className="mt-2 divide-y divide-[#E5E7EB]">
                {data.supportTickets.length === 0 ? <p className="py-3 text-sm text-[#6B7280]">No support tickets raised.</p> : null}
                {data.supportTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-[#1F2937]">{ticket.subject}</p>
                      <p className="mt-1 text-xs capitalize text-[#9CA3AF]">{ticket.priority}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  )
}
