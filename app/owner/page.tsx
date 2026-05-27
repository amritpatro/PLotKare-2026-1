import { createOwnerServiceRequest, createOwnerSupportTicket, registerOwnerProperty } from './actions'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const labelClass = 'mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]'

type OwnerDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const ownerMessages = {
  success: {
    property_registered: 'Property submitted for verification and connected to your dashboard.',
    service_requested: 'Service request created and routed to PlotKare operations.',
    support_ticket_created: 'Support ticket created. PlotKare support can now track this request.',
  },
  error: {
    invalid_property_form: 'Please complete the required property details before submitting.',
    invalid_service_form: 'Please select a property and describe the service request.',
    invalid_support_form: 'Please add a support subject and description.',
    property_save_failed: 'We could not save the property. Please try again or contact support.',
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

export default async function LandOwnerDashboardPage({ searchParams }: OwnerDashboardPageProps) {
  const { user, profile } = await requirePageRole(['land_owner', 'admin'])
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const successCode = getParam(params, 'success') as keyof typeof ownerMessages.success | undefined
  const errorCode = getParam(params, 'error') as keyof typeof ownerMessages.error | undefined
  const successMessage = successCode ? ownerMessages.success[successCode] : null
  const errorMessage = errorCode ? ownerMessages.error[errorCode] : null

  const [
    { data: owner },
    { data: onboardingDetails },
    { data: properties },
    { data: documents },
    { data: inspections },
    { data: requests },
    { data: supportTickets },
    { data: plans },
    { data: subscriptions },
  ] = await Promise.all([
    supabase
      .from('owners')
      .select('id,verification_status,admin_notes,created_at')
      .eq('profile_id', user.id)
      .maybeSingle(),
    supabase
      .from('land_owner_details')
      .select('property_location,property_size_sqyards,property_facing,is_corner_plot,property_type,interested_in,verification_status,updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('properties')
      .select('id,title,property_kind,address,city,state,lifecycle_status,verification_status,created_at')
      .eq('owner_profile_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('property_documents')
      .select('id,title,document_type,verification_status,created_at,property_id')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('inspections')
      .select('id,property_id,status,scheduled_for,completed_at,summary,created_at')
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('maintenance_requests')
      .select('id,property_id,title,description,priority,status,created_at')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('support_tickets')
      .select('id,property_id,subject,priority,status,created_at')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('plans')
      .select('id,name,slug,audience_role,price_monthly,price_yearly,features,active')
      .eq('audience_role', 'land_owner')
      .eq('active', true)
      .order('price_monthly', { ascending: true }),
    supabase
      .from('subscriptions')
      .select('id,status,plan,current_period_end,property_id,plans(name,audience_role)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const propertyRows = properties ?? []
  const documentRows = documents ?? []
  const inspectionRows = inspections ?? []
  const requestRows = requests ?? []
  const ticketRows = supportTickets ?? []
  const planRows = plans ?? []
  const subscriptionRows = subscriptions ?? []
  const approvedCount = propertyRows.filter((property) => property.verification_status === 'approved').length
  const pendingCount = propertyRows.filter((property) => property.verification_status !== 'approved').length
  const registeredPropertyCount = Math.max(propertyRows.length, onboardingDetails ? 1 : 0)

  return (
    <RoleDashboardShell
      role="owner"
      title="Property care workspace"
      subtitle="Register properties, track verification, and view inspections, documents, and service activity."
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
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Personalized owner workspace</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight text-[#1F2937]">Your property command room</h2>
            <p className="mt-3 max-w-2xl font-sans text-sm leading-6 text-[#6B7280]">
              Register properties, track verification, and view inspections, documents, and service activity tied to your account.
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">Owner status</p>
            <p className="mt-2 font-sans text-lg font-semibold text-[#C0392B]">{owner?.verification_status || onboardingDetails?.verification_status || 'Pending'}</p>
          </div>
          </div>
        </div>

        {!owner ? (
          <div className={cardClass}>
            <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Owner record will be created on first registration</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Your role is active. Add a property below to create the operational owner record.
            </p>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ['Registered properties', registeredPropertyCount],
            ['Approved', approvedCount],
            ['Pending review', Math.max(pendingCount, onboardingDetails && approvedCount === 0 ? 1 : 0)],
            ['Documents', documentRows.length],
          ].map(([label, value]) => (
            <div key={label} className={cardClass}>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
              <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" id="register">
          <div className={cardClass}>
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Register property</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              This creates a real property record with submitted verification status.
            </p>
            <form action={registerOwnerProperty} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Property type</label>
                  <select name="propertyKind" className={inputClass} defaultValue="plot">
                    <option value="plot">Plot</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Property title</label>
                  <input name="title" required placeholder="Madhurawada family plot" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input name="address" required placeholder="Street, survey reference, or landmark" className={inputClass} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>City</label>
                  <input name="city" required placeholder="Visakhapatnam" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input name="state" required defaultValue="Andhra Pradesh" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Postal code</label>
                  <input name="postalCode" placeholder="530003" className={inputClass} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Plot ID</label>
                  <input name="plotNumber" placeholder="Optional for apartments" className={inputClass} />
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
              </div>
              <PendingActionButton pendingText="Submitting..." className="rounded-lg bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A93225]">
                Submit for verification
              </PendingActionButton>
            </form>
          </div>

          <div className={cardClass} id="verification">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Verification status</h2>
            {onboardingDetails ? (
              <div className="mt-4 rounded-lg border border-[#C9A962]/20 bg-[#C9A962]/10 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C9A962]">Onboarding property profile</p>
                <dl className="mt-3 grid gap-3 text-sm text-[#1F2937] sm:grid-cols-2">
                  <div>
                    <dt className="text-[#9CA3AF]">Location</dt>
                    <dd className="mt-1 font-medium">{onboardingDetails.property_location || 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">Plot size</dt>
                    <dd className="mt-1 font-medium">
                      {onboardingDetails.property_size_sqyards ? `${onboardingDetails.property_size_sqyards} sq. yards` : 'Pending'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">Facing</dt>
                    <dd className="mt-1 font-medium">{onboardingDetails.property_facing || 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#9CA3AF]">Type</dt>
                    <dd className="mt-1 font-medium">{onboardingDetails.property_type || 'Pending'}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
            <div className="mt-4 divide-y divide-[#E5E7EB]">
              {propertyRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No properties registered yet.</p> : null}
              {propertyRows.map((property) => (
                <div key={property.id} className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1F2937]">{property.title}</p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {property.property_kind} · {property.city || 'City pending'} · {property.lifecycle_status}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">
                      {property.verification_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className={cardClass} id="documents">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Documents vault</h2>
            <div className="mt-4 divide-y divide-[#E5E7EB]">
              {documentRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6">
                  <p className="font-semibold text-[#1F2937]">No uploaded documents visible yet</p>
                  <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                    Uploaded ownership, verification, and agreement records will appear here when available.
                  </p>
                </div>
              ) : null}
              {documentRows.slice(0, 5).map((document) => (
                <div key={document.id} className="py-3">
                  <p className="font-medium text-[#1F2937]">{document.title}</p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    {document.document_type} · {statusLabel(document.verification_status)} · {formatDate(document.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Inspection reports</h2>
            <div className="mt-4 divide-y divide-[#E5E7EB]">
              {inspectionRows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#6B7280]">
                  No inspection history yet.
                </p>
              ) : null}
              {inspectionRows.map((inspection) => (
                <div key={inspection.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[#1F2937]">{statusLabel(inspection.status)}</p>
                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">
                      {inspection.completed_at ? 'completed' : formatDate(inspection.scheduled_for)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#9CA3AF]">{inspection.summary || 'Report details pending'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass} id="services">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Service activity</h2>
            <div className="mt-4 grid gap-3">
              {planRows.length === 0 ? null : (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">Published owner plans</p>
                  <p className="mt-2 text-sm text-[#1F2937]">
                    {planRows.slice(0, 2).map((plan) => `${plan.name} (₹${plan.price_monthly ?? 0}/mo)`).join(', ')}
                  </p>
                </div>
              )}
              <p className="text-xs text-[#9CA3AF]">{subscriptionRows.length} subscription records found for this account.</p>
            </div>
            <div className="mt-4 divide-y divide-[#E5E7EB]">
              {requestRows.length === 0 ? <p className="py-6 text-sm text-[#6B7280]">No maintenance requests yet.</p> : null}
              {requestRows.map((request) => (
                <div key={request.id} className="py-3">
                  <p className="font-medium text-[#1F2937]">{request.title}</p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">{request.priority} · {statusLabel(request.status)} · {formatDate(request.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={cardClass}>
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Request property service</h2>
            <form action={createOwnerServiceRequest} className="mt-5 grid gap-4">
              <select name="propertyId" required className={inputClass} defaultValue="">
                <option value="" disabled>Select property</option>
                {propertyRows.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title || property.id}
                  </option>
                ))}
              </select>
              <input name="title" required placeholder="Boundary check, cleaning, legal review" className={inputClass} />
              <textarea name="description" placeholder="Add instructions for PlotKare operations" rows={4} className={inputClass} />
              <select name="priority" className={inputClass} defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              {propertyRows.length === 0 ? (
                <p className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs leading-5 text-[#6B7280]">
                  Register a property before opening a service request.
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

          <div className={cardClass} id="support">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Support center</h2>
                <p className="mt-2 text-sm text-[#6B7280]">Live support tickets opened from this owner account.</p>
              </div>
              <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#6B7280]">
                {ticketRows.length} tickets
              </span>
            </div>
            <form action={createOwnerSupportTicket} className="mt-5 grid gap-4">
              <select name="propertyId" className={inputClass} defaultValue="">
                <option value="">General account support</option>
                {propertyRows.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title || property.id}
                  </option>
                ))}
              </select>
              <input name="subject" required placeholder="What should support help with?" className={inputClass} />
              <textarea name="description" required placeholder="Share the issue or request details" rows={4} className={inputClass} />
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
            <div className="mt-5 divide-y divide-[#E5E7EB]">
              {ticketRows.length === 0 ? <p className="py-4 text-sm text-[#6B7280]">No support tickets raised yet.</p> : null}
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
      </section>
    </RoleDashboardShell>
  )
}
