import { notFound } from 'next/navigation'
import { addSoldCustomer, createSellerPlot, createSellerServiceRequest, createSellerSupportTicket } from '@/app/seller/actions'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const allowedSections = ['plots', 'customers', 'services', 'support', 'notifications', 'documents'] as const
type Section = (typeof allowedSections)[number]

type PageProps = {
  params: Promise<{ section: string }>
}

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226] disabled:cursor-not-allowed disabled:opacity-50'

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

export default async function SellerSectionPage({ params }: PageProps) {
  const { section } = await params
  if (!allowedSections.includes(section as Section)) notFound()

  const { user, profile } = await requirePageRole(['plot_seller', 'admin'])
  const supabase = await createSupabaseServerClient()

  const { data: seller } = await supabase
    .from('sellers')
    .select('id,company_name,verification_status')
    .eq('profile_id', user.id)
    .maybeSingle()

  const sellerId = seller?.id ?? ''
  const [{ data: properties }, { data: plots }, { data: customers }, { data: links }, { data: listings }, { data: services }, { data: tickets }, { data: notifications }, { data: plans }] =
    await Promise.all([
      sellerId ? supabase.from('properties').select('id,title,city,address,lifecycle_status,verification_status,created_at').eq('seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('plots').select('id,property_id,plot_number,location,sq_yards,status,lifecycle_status,verification_status,current_value_lakhs,created_at').eq('seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('customers').select('id,full_name,email,phone,address,account_status,kyc_status,created_at').eq('created_by_seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('customer_property_links').select('id,property_id,customer_id,status,relationship_type,registration_date').eq('seller_id', sellerId) : Promise.resolve({ data: [] }),
      sellerId ? supabase.from('listings').select('id,property_id,plot_id,plot_number,location,status,approval_status,is_published,verified_at,published_at,inquiries_count').eq('seller_id', sellerId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from('maintenance_requests').select('id,property_id,title,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('support_tickets').select('id,property_id,subject,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('notifications').select('id,title,message,category,read_at,created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('plans').select('id,name,price_monthly,active').eq('audience_role', 'plot_seller').eq('active', true).order('price_monthly', { ascending: true }),
    ])

  const propertyRows = properties ?? []
  const { data: documents } = sellerId && propertyRows.length
    ? await supabase
        .from('property_documents')
        .select('id,title,document_type,verification_status,visibility,property_id,created_at')
        .in('property_id', propertyRows.map((item: any) => item.id))
        .order('created_at', { ascending: false })
    : { data: [] }
  const plotRows = plots ?? []
  const customerRows = customers ?? []
  const linkRows = links ?? []
  const listingRows = listings ?? []
  const documentRows = documents ?? []
  const serviceRows = services ?? []
  const ticketRows = tickets ?? []
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
              <button className={buttonClass}>Submit plot for verification</button>
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
              <button className={buttonClass} disabled={propertyRows.length === 0}>Link customer to property</button>
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

    if (section === 'documents' || section === 'notifications') {
      const rows = section === 'documents' ? documentRows : notificationRows
      return (
        <div className="space-y-6">
          <SectionTitle eyebrow={section} title={section === 'documents' ? 'Seller documents' : 'Notifications'} body="Operational records connected to your seller workspace." />
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Record</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th></tr></thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rows.length === 0 ? <tr><td colSpan={3} className="px-3 py-10 text-center text-[#6B7280]">No records yet.</td></tr> : null}
                {rows.map((row: any) => <tr key={row.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{row.title}</td><td className="px-3 py-3">{badge(row.verification_status || row.category || (row.read_at ? 'read' : 'new'))}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at)}</td></tr>)}
              </tbody>
            </table>
          </div>
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
              <button className={buttonClass} disabled={propertyRows.length === 0}>Create service request</button>
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
            <button className={buttonClass}>Open support ticket</button>
          </form>
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Ticket</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th></tr></thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {ticketRows.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-[#6B7280]">No support tickets yet.</td></tr> : null}
                {ticketRows.map((ticket: any) => <tr key={ticket.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{ticket.subject}</td><td className="px-3 py-3 text-[#6B7280]">{ticket.priority}</td><td className="px-3 py-3">{badge(ticket.status)}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(ticket.created_at)}</td></tr>)}
              </tbody>
            </table>
          </div>
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
      userId={user.id}
    >
      {content}
    </RoleDashboardShell>
  )
}
