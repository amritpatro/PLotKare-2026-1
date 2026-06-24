import { addSoldCustomer, createSellerPlot, createSellerServiceRequest, createSellerSupportTicket } from './actions'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const labelClass = 'mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]'

type SellerDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const sellerMessages = {
  success: {
    plot_created: 'Plot added and submitted for PlotKare verification.',
    customer_linked: 'Customer linked to the selected property. The sale history is now stored.',
    service_requested: 'Service request created and routed to PlotKare operations.',
    support_ticket_created: 'Support ticket created. PlotKare support can now track this request.',
  },
  error: {
    invalid_plot_form: 'Please complete all required plot details before submitting.',
    invalid_customer_form: 'Please complete the customer details and select a property.',
    invalid_service_form: 'Please select a property and describe the service request.',
    invalid_support_form: 'Please add a support subject and description.',
    seller_profile_missing: 'Your seller business profile is not ready yet. Complete onboarding or contact support.',
    plot_save_failed: 'We could not save the plot. Please try again or contact support.',
    customer_link_failed: 'We could not link this customer. Please confirm the property is still available.',
    service_request_failed: 'We could not create the service request. Please try again or contact support.',
    support_ticket_failed: 'We could not create the support ticket. Please try again or contact support.',
  },
} as const

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

export default async function PlotSellerDashboardPage({ searchParams }: SellerDashboardPageProps) {
  const { user, profile } = await requirePageRole(['plot_seller', 'admin'])
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const successCode = getParam(params, 'success') as keyof typeof sellerMessages.success | undefined
  const errorCode = getParam(params, 'error') as keyof typeof sellerMessages.error | undefined
  const successMessage = successCode ? sellerMessages.success[successCode] : null
  const errorMessage = errorCode ? sellerMessages.error[errorCode] : null

  const { data: seller } = await supabase
    .from('sellers')
    .select('id,company_name,verification_status')
    .eq('profile_id', user.id)
    .maybeSingle()

  const sellerId = seller?.id ?? ''

  const [
    { data: sellerDetails },
    { data: plots },
    { data: properties },
    { data: customers },
    { data: links },
    { data: plans },
    { data: subscriptions },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from('plot_seller_details')
      .select('company_name,seller_type,gst_number,pan_number,address,listing_property_kind,listing_location,expected_price_lakhs,listing_notes,commission_model,commission_rate,listing_fee_amount,bank_verified,verification_status,updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    sellerId
      ? supabase
          .from('plots')
          .select('id,property_id,plot_number,location,sq_yards,status,lifecycle_status,verification_status,current_value_lakhs,created_at')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    sellerId
      ? supabase
          .from('properties')
          .select('id,title,lifecycle_status,verification_status,city,created_at')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    sellerId
      ? supabase
          .from('customers')
          .select('id,full_name,email,phone,account_status,kyc_status,created_at')
          .eq('created_by_seller_id', sellerId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    sellerId
      ? supabase
          .from('customer_property_links')
          .select('id,property_id,customer_id,status,registration_date,relationship_type')
          .eq('seller_id', sellerId)
      : Promise.resolve({ data: [] }),
    supabase
      .from('plans')
      .select('id,name,slug,audience_role,price_monthly,price_yearly,features,active')
      .eq('audience_role', 'plot_seller')
      .eq('active', true)
      .order('price_monthly', { ascending: true }),
    supabase
      .from('subscriptions')
      .select('id,status,plan,current_period_end,property_id,plans(name,audience_role)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('notifications')
      .select('id,title,message,category,read_at,created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const plotRows = plots ?? []
  const propertyRows = properties ?? []
  const customerRows = customers ?? []
  const linkRows = links ?? []
  const propertyIds = propertyRows.map((property) => property.id)
  const [{ data: uploadedDocuments }, { data: propertyDocuments }, { data: serviceRequests }, { data: supportTickets }] = await Promise.all([
    supabase
      .from('property_documents')
      .select('id,title,document_type,verification_status,visibility,property_id,created_at')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    propertyIds.length
      ? supabase
          .from('property_documents')
          .select('id,title,document_type,verification_status,visibility,property_id,created_at')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? supabase
          .from('maintenance_requests')
          .select('id,property_id,title,priority,status,created_at')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    supabase
      .from('support_tickets')
      .select('id,subject,priority,status,property_id,created_at')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
  ])
  const documentsById = new Map([...(uploadedDocuments ?? []), ...(propertyDocuments ?? [])].map((document) => [document.id, document]))
  const documentRows = [...documentsById.values()]
  const serviceRows = serviceRequests ?? []
  const planRows = plans ?? []
  const subscriptionRows = subscriptions ?? []
  const notificationRows = notifications ?? []
  const ticketRows = supportTickets ?? []
  const soldPlots = plotRows.filter((plot) => plot.lifecycle_status === 'sold' || plot.status === 'sold').length
  const availableProperties = propertyRows.filter((property) => property.lifecycle_status !== 'sold')
  const pendingVerification = propertyRows.filter((property) => property.verification_status !== 'approved').length

  return (
    <RoleDashboardShell
      role="seller"
      title={seller?.company_name || sellerDetails?.company_name || 'Seller operations'}
      subtitle="Manage plots, sold customers, verification state, and service requests."
      userLabel={profile.full_name || profile.email}
      avatarUrl={profile.avatar_path}
      userId={user.id}
    >
      <section className="space-y-8">
        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
            {successMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Personalized seller workspace</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h2 className="font-serif text-4xl font-bold leading-tight text-[#1F2937]">
                {seller?.company_name || sellerDetails?.company_name || 'PlotKare seller'}
              </h2>
              <p className="mt-3 max-w-2xl font-sans text-sm leading-6 text-[#6B7280]">
                Add plots, link sold customers, track document readiness, and keep the sales record connected to PlotKare operations.
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">Verification</p>
              <p className="mt-2 font-sans text-lg font-semibold text-[#C0392B]">
                {seller?.verification_status || sellerDetails?.verification_status || 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {!seller ? (
          <div className={cardClass}>
            <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Seller profile pending</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Your role is active, but the seller business record has not been created yet.</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4" id="overview">
              {[
                ['Total plots', plotRows.length],
                ['Available plots', Math.max(plotRows.length - soldPlots, 0)],
                ['Sold plots', soldPlots],
                ['Pending verification', pendingVerification],
              ].map(([label, value]) => (
                <div key={label} className={cardClass}>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
                  <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
                </div>
              ))}
            </section>

            {sellerDetails ? (
              <section className={cardClass}>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C9A962]">Onboarding business profile</p>
                    <h2 className="mt-2 font-serif text-2xl font-semibold text-[#1F2937]">{sellerDetails.company_name || seller.company_name}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-[#6B7280]">{sellerDetails.address || 'Business address pending'}</p>
                  </div>
                  <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">
                    {sellerDetails.verification_status}
                  </span>
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-[#9CA3AF]">Seller type</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{statusLabel(sellerDetails.seller_type)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">First listing type</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{statusLabel(sellerDetails.listing_property_kind)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">Listing location</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{sellerDetails.listing_location || 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">Expected price</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{sellerDetails.expected_price_lakhs ? `₹${sellerDetails.expected_price_lakhs}L` : 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">GST</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{sellerDetails.gst_number || 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">PAN</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{sellerDetails.pan_number || 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">Model</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{sellerDetails.commission_model || 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">Bank</dt>
                    <dd className="mt-1 font-medium text-[#1F2937]">{sellerDetails.bank_verified ? 'Verified' : 'Pending'}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]" id="plots">
              <div className={cardClass}>
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Add new plot</h2>
                <form action={createSellerPlot} className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Plot title</label>
                    <input name="title" required placeholder="Boduvalasa Phase 2 Plot" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Plot ID</label>
                    <input name="plotNumber" required placeholder="VZG-047" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Location</label>
                    <input name="location" required placeholder="Bheemunipatnam" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Sq. yards</label>
                    <input name="sqYards" required type="number" min="50" placeholder="200" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Facing</label>
                    <select name="facing" className={inputClass} defaultValue="East">
                      <option>East</option>
                      <option>West</option>
                      <option>North</option>
                      <option>South</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Expected value in lakhs</label>
                    <input name="priceLakhs" type="number" min="0" step="0.1" placeholder="32" className={inputClass} />
                  </div>
                  <PendingActionButton pendingText="Submitting..." className="rounded-lg bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225] md:col-span-2">
                    Add plot
                  </PendingActionButton>
                </form>
              </div>

              <div className={cardClass} id="customers">
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Add sold customer</h2>
                <form action={addSoldCustomer} className="mt-5 grid gap-4">
                  <input name="fullName" required placeholder="Customer full name" className={inputClass} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="email" type="email" placeholder="email@example.com" className={inputClass} />
                    <input name="phone" placeholder="+91 phone" className={inputClass} />
                  </div>
                  <input name="address" placeholder="Customer address" className={inputClass} />
                  <select name="propertyId" required className={inputClass} defaultValue="">
                    <option value="" disabled>Select sold property</option>
                    {availableProperties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title || property.id}
                      </option>
                    ))}
                  </select>
                  <input name="registrationDate" type="date" className={inputClass} />
                  {availableProperties.length === 0 ? (
                    <p className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs leading-5 text-[#6B7280]">
                      Add an available plot first, then return here to link the sold customer.
                    </p>
                  ) : null}
                  <PendingActionButton
                    pendingText="Linking..."
                    className="rounded-lg bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={availableProperties.length === 0}
                  >
                    Link customer to property
                  </PendingActionButton>
                </form>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className={cardClass}>
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">My plots</h2>
                <div className="mt-4 divide-y divide-[#E5E7EB]">
                  {plotRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No plots added yet.</p> : null}
                  {plotRows.map((plot) => (
                    <div key={plot.id} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#1F2937]">{plot.plot_number}</p>
                        <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">{plot.lifecycle_status}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#6B7280]">{plot.location} · {plot.sq_yards} sq. yards · {plot.verification_status}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Customer CRM</h2>
                <div className="mt-4 divide-y divide-[#E5E7EB]">
                  {customerRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6">
                      <p className="font-semibold text-[#1F2937]">No sold customers linked yet</p>
                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                        Customer records will appear here after a sold property is linked from the form above.
                      </p>
                    </div>
                  ) : null}
                  {customerRows.map((customer) => (
                    <div key={customer.id} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#1F2937]">{customer.full_name}</p>
                          <p className="mt-1 text-sm text-[#6B7280]">{customer.phone || customer.email || 'Contact pending'}</p>
                        </div>
                        <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">
                          {statusLabel(customer.kyc_status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#9CA3AF]">
                        Account {statusLabel(customer.account_status)} · Added {formatDate(customer.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-[#9CA3AF]">{linkRows.length} customer-property links stored.</p>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]" id="services">
              <div className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Plans & services</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                      Live seller service plans and requests connected to your listed properties.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">
                    {subscriptionRows.length} active records
                  </span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {planRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#6B7280]">
                      No seller plans are currently published.
                    </p>
                  ) : null}
                  {planRows.slice(0, 4).map((plan) => (
                    <div key={plan.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <p className="font-semibold text-[#1F2937]">{plan.name}</p>
                      <p className="mt-2 font-mono text-sm font-bold text-[#C0392B]">
                        ₹{plan.price_monthly ?? 0}/month
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 divide-y divide-[#E5E7EB]">
                  {serviceRows.length === 0 ? <p className="py-4 text-sm text-[#6B7280]">No service requests raised yet.</p> : null}
                  {serviceRows.map((request) => (
                    <div key={request.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-[#1F2937]">{request.title}</p>
                        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#6B7280]">{statusLabel(request.status)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#9CA3AF]">{request.priority} priority · {formatDate(request.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Request service</h2>
                <form action={createSellerServiceRequest} className="mt-5 grid gap-4">
                  <select name="propertyId" required className={inputClass} defaultValue="">
                    <option value="" disabled>Select property</option>
                    {propertyRows.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title || property.id}
                      </option>
                    ))}
                  </select>
                  <input name="title" required placeholder="Inspection coordination, document pickup, legal review" className={inputClass} />
                  <textarea name="description" placeholder="Add context for the operations team" rows={4} className={inputClass} />
                  <select name="priority" className={inputClass} defaultValue="normal">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  {propertyRows.length === 0 ? (
                    <p className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs leading-5 text-[#6B7280]">
                      Add a plot before opening a service request.
                    </p>
                  ) : null}
                  <PendingActionButton
                    pendingText="Creating..."
                    className="rounded-lg bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={propertyRows.length === 0}
                  >
                    Create service request
                  </PendingActionButton>
                </form>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className={cardClass} id="documents">
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Documents</h2>
                <div className="mt-4 divide-y divide-[#E5E7EB]">
                  {documentRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No seller-visible documents yet.</p> : null}
                  {documentRows.slice(0, 6).map((document) => (
                    <div key={document.id} className="py-3">
                      <p className="font-medium text-[#1F2937]">{document.title}</p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        {document.document_type} · {statusLabel(document.verification_status)} · {statusLabel(document.visibility)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass} id="notifications">
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Notifications</h2>
                <div className="mt-4 divide-y divide-[#E5E7EB]">
                  {notificationRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No notifications yet.</p> : null}
                  {notificationRows.map((notification) => (
                    <div key={notification.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-[#1F2937]">{notification.title}</p>
                        <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[10px] text-[#6B7280]">
                          {notification.read_at ? 'read' : 'new'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#6B7280]">{notification.message}</p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">{notification.category} · {formatDate(notification.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass} id="support">
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Support tickets</h2>
                <form action={createSellerSupportTicket} className="mt-5 grid gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <select name="propertyId" className={inputClass} defaultValue="">
                    <option value="">General seller support</option>
                    {propertyRows.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title || property.city || property.id}
                      </option>
                    ))}
                  </select>
                  <input name="subject" required placeholder="What should support help with?" className={inputClass} />
                  <textarea name="description" required rows={3} placeholder="Add the issue, property reference, and expected outcome." className={inputClass} />
                  <select name="priority" className={inputClass} defaultValue="normal">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <PendingActionButton pendingText="Opening..." className="rounded-lg bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225]">
                    Open support ticket
                  </PendingActionButton>
                </form>
                <div className="mt-4 divide-y divide-[#E5E7EB]">
                  {ticketRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No seller support tickets raised yet.</p> : null}
                  {ticketRows.map((ticket) => (
                    <div key={ticket.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[#1F2937]">{ticket.subject}</p>
                        <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">{statusLabel(ticket.status)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#9CA3AF]">{ticket.priority} priority · {formatDate(ticket.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </RoleDashboardShell>
  )
}
