import Link from 'next/link'
import { cache } from 'react'
import { getInspectionTemplate, inspectionTypeFromProperty, type InspectionPropertyType } from '@/lib/agent/inspection-templates'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type CustomerContextPanelProps = {
  userId: string
  className?: string
}

type CustomerProfile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  address_line?: string | null
  city?: string | null
  role: string | null
  customer_type: string | null
  created_at: string | null
}

type CustomerContext = {
  profile: CustomerProfile
  ownerProperty: OwnerPropertySummary | null
  ownerPlot: OwnerPlotSummary | null
  verificationStatus: string | null
  customerTypeLabel: string
  verificationTone: 'amber' | 'green' | 'red' | 'slate'
  planLabel: string
  planTone: 'blue' | 'violet' | 'slate'
  supportTotal: number
  supportOpen: number
  documentsTotal: number
  documentsPending: number
  ownerPropertyTotal: number
  detailHref: string
  joinedLabel: string
  profileSummary: string
  documentRequirements: string[]
  propertyContextSummary: string
}

type OwnerPropertySummary = {
  id: string
  title: string | null
  property_kind: string | null
  asset_type: string | null
  address: string | null
  city: string | null
  state: string | null
  onboarding_details: Record<string, unknown> | null
}

type OwnerPlotSummary = {
  plot_number: string | null
  location: string | null
  sq_yards: number | null
  facing: string | null
}

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  land_owner: 'Land Owner',
  plot_seller: 'Plot Seller',
  plot_buyer: 'Plot Buyer',
}

const CUSTOMER_TYPE_TONES: Record<string, 'blue' | 'orange' | 'violet'> = {
  land_owner: 'blue',
  plot_seller: 'orange',
  plot_buyer: 'violet',
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic Monitor',
  standard: 'Complete Care',
  premium: 'Premium NRI',
}

const PLAN_TONES: Record<string, 'blue' | 'violet' | 'slate'> = {
  basic: 'blue',
  standard: 'violet',
  premium: 'slate',
}

const VERIFICATION_TONES: Record<string, 'amber' | 'green' | 'red' | 'slate'> = {
  submitted: 'amber',
  under_review: 'amber',
  needs_clarification: 'amber',
  approved: 'green',
  verified: 'green',
  rejected: 'red',
  withdrawn: 'red',
  expired: 'slate',
  pending: 'amber',
  active: 'green',
  suspended: 'red',
  closed: 'slate',
}

const OPEN_SUPPORT_STATUSES = ['open', 'assigned', 'in_progress', 'waiting_on_customer', 'waiting_on_admin', 'escalated']
const PENDING_DOCUMENT_STATUSES = ['submitted', 'under_review', 'needs_clarification', 'withdrawal_requested']

const DOCUMENT_REQUIREMENTS: Record<InspectionPropertyType, string[]> = {
  vacant_plot: ['Property papers', 'EC certificate', 'Survey/layout proof', 'Tax receipts'],
  apartment: ['Sale deed/agreement', 'Society NOC', 'Possession letter', 'EC certificate'],
  house_villa: ['Sale deed', 'Completion certificate', 'EC certificate', 'Building plan'],
  commercial: ['Sale deed', 'Usage certificate', 'EC certificate', 'Trade license if applicable'],
}

function toneClasses(tone: 'amber' | 'green' | 'red' | 'slate' | 'blue' | 'orange' | 'violet') {
  switch (tone) {
    case 'blue':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'orange':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'violet':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'green':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'red':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'slate':
      return 'border-slate-200 bg-slate-50 text-slate-700'
    case 'amber':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700'
  }
}

function badgeClass(tone: 'amber' | 'green' | 'red' | 'slate' | 'blue' | 'orange' | 'violet') {
  return `rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${toneClasses(tone)}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatRelativeDays(value: string | null | undefined) {
  if (!value) return 'Just now'

  const diffMs = Date.now() - new Date(value).getTime()
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes || 1} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function propertyContextSummary(property: OwnerPropertySummary | null, plot: OwnerPlotSummary | null, propertyType: InspectionPropertyType) {
  if (!property) return 'No property record linked yet.'
  const details = asRecord(property.onboarding_details?.details)
  const address = [property.address, property.city, property.state].filter(Boolean).join(', ')

  if (propertyType === 'apartment') {
    const unit = asText(details.unit_number) || asText(details.apartment_number) || 'unit pending'
    const floor = asText(details.floor_label) || 'floor pending'
    const building = asText(details.tower_or_block) || asText(details.building_name) || property.title || 'building pending'
    return `${building} · ${unit} · ${floor} · ${address || 'address pending'}`
  }

  if (propertyType === 'house_villa') {
    const builtUp = asText(details.built_up_sqft) || asText(details.built_up_area) || 'built-up area pending'
    return `${address || property.title || 'address pending'} · plot area ${plot?.sq_yards ?? 'pending'} sq yd · ${builtUp}`
  }

  if (propertyType === 'commercial') {
    const useType = asText(details.commercial_use) || asText(details.usage_type) || 'commercial use pending'
    return `${address || property.title || 'address pending'} · ${useType}`
  }

  return [
    plot?.plot_number ? `Plot ${plot.plot_number}` : property.title || 'Plot details pending',
    plot?.location || address || 'location pending',
    plot?.sq_yards ? `${plot.sq_yards} sq yd` : null,
    plot?.facing ? `${plot.facing} facing` : null,
  ].filter(Boolean).join(' · ')
}

const loadCustomerContext = cache(async (userId: string): Promise<CustomerContext | null> => {
  const supabase = await createSupabaseServerClient()

  const [{ data: profile }, { data: seller }, { data: owner }, { data: customer }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,email,phone,address_line,city,role,customer_type,created_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('sellers')
      .select('verification_status,company_name,gst_number,pan_number')
      .eq('profile_id', userId)
      .maybeSingle(),
    supabase
      .from('owners')
      .select('verification_status')
      .eq('profile_id', userId)
      .maybeSingle(),
    supabase
      .from('customers')
      .select('id,kyc_status,account_status,pan_number,aadhaar_last4,profile_id')
      .eq('profile_id', userId)
      .maybeSingle(),
  ])

  if (!profile) return null

  const customerType = profile.customer_type || (profile.role === 'user' ? 'plot_buyer' : null)
  const customerTypeLabel = customerType ? CUSTOMER_TYPE_LABELS[customerType] ?? customerType.replaceAll('_', ' ') : 'Customer'

  const verificationStatus =
    seller?.verification_status ||
    owner?.verification_status ||
    customer?.kyc_status ||
    customer?.account_status ||
    'pending'

  const verificationTone = VERIFICATION_TONES[verificationStatus] ?? 'amber'

  const customerRecordId = customer?.id ?? null
  const [supportCount, openSupportCount, documentsCount, pendingDocumentsCount, ownerPropertiesCount, subscription, latestOwnerProperty] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', userId),
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', userId)
      .in('status', OPEN_SUPPORT_STATUSES),
    customerRecordId
      ? supabase
          .from('property_documents')
          .select('id', { count: 'exact', head: true })
          .or(`uploaded_by.eq.${userId},customer_id.eq.${customerRecordId}`)
      : supabase.from('property_documents').select('id', { count: 'exact', head: true }).eq('uploaded_by', userId),
    customerRecordId
      ? supabase
          .from('property_documents')
          .select('id', { count: 'exact', head: true })
          .or(`uploaded_by.eq.${userId},customer_id.eq.${customerRecordId}`)
          .in('verification_status', PENDING_DOCUMENT_STATUSES)
      : supabase
          .from('property_documents')
          .select('id', { count: 'exact', head: true })
          .eq('uploaded_by', userId)
          .in('verification_status', PENDING_DOCUMENT_STATUSES),
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_profile_id', userId),
    customerRecordId
      ? supabase
          .from('subscriptions')
          .select('plan,status,created_at')
          .eq('customer_id', customerRecordId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('properties')
      .select('id,title,property_kind,asset_type,address,city,state,onboarding_details,created_at')
      .eq('owner_profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const ownerProperty = (latestOwnerProperty.data ?? null) as OwnerPropertySummary | null
  const { data: ownerPlot } = ownerProperty?.id
    ? await supabase
        .from('plots')
        .select('plot_number,location,sq_yards,facing')
        .eq('property_id', ownerProperty.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }
  const propertyType = inspectionTypeFromProperty({
    assetType: ownerProperty?.asset_type,
    propertyKind: ownerProperty?.property_kind,
    hasPlot: Boolean(ownerPlot),
  })

  const subscriptionRow =
    subscription && typeof subscription === 'object' && 'data' in subscription ? subscription.data : null
  const planTier =
    subscriptionRow && subscriptionRow.plan && subscriptionRow.plan in PLAN_LABELS
      ? (subscriptionRow.plan as keyof typeof PLAN_LABELS)
      : null
  const planLabel = planTier ? PLAN_LABELS[planTier] : 'No active plan'
  const planTone = planTier ? PLAN_TONES[planTier] : 'slate'

  const profileSummaryParts = [
    seller?.company_name ? `Company: ${seller.company_name}` : null,
    seller?.gst_number ? `GST: ${seller.gst_number}` : null,
    seller?.pan_number ? `PAN: ${seller.pan_number}` : null,
    customer?.pan_number ? `PAN: ${customer.pan_number}` : null,
    customer?.aadhaar_last4 ? `Aadhaar: •••• ${customer.aadhaar_last4}` : null,
  ].filter(Boolean)

  return {
    profile,
    ownerProperty,
    ownerPlot: (ownerPlot ?? null) as OwnerPlotSummary | null,
    verificationStatus,
    customerTypeLabel,
    verificationTone,
    planLabel,
    planTone,
    supportTotal: supportCount.count ?? 0,
    supportOpen: openSupportCount.count ?? 0,
    documentsTotal: documentsCount.count ?? 0,
    documentsPending: pendingDocumentsCount.count ?? 0,
    ownerPropertyTotal: ownerPropertiesCount.count ?? 0,
    detailHref: `/admin/dashboard/customers/${profile.id}`,
    joinedLabel: formatDate(profile.created_at),
    profileSummary: profileSummaryParts.join(' · '),
    documentRequirements: DOCUMENT_REQUIREMENTS[propertyType],
    propertyContextSummary: propertyContextSummary(ownerProperty, (ownerPlot ?? null) as OwnerPlotSummary | null, propertyType),
  }
})

function formatVerificationStatus(value: string | null | undefined) {
  return (value ?? 'pending').replaceAll('_', ' ')
}

export async function CustomerContextPanel({ userId, className = '' }: CustomerContextPanelProps) {
  const context = await loadCustomerContext(userId)

  if (!context) {
    return (
      <aside className={`rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`.trim()}>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#9CA3AF]">Customer context</p>
        <p className="mt-3 text-sm text-[#6B7280]">Customer record not found.</p>
      </aside>
    )
  }

  return (
    <aside className={`rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`.trim()}>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#9CA3AF]">Customer context</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-[#1F2937]">{context.profile.full_name || 'Unnamed customer'}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{context.profileSummary || 'Profile verified through platform records.'}</p>
        </div>
        <Link
          href={context.detailHref}
          className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#1F2937] transition hover:border-[#C0392B] hover:text-[#C0392B]"
        >
          Open profile
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={badgeClass(CUSTOMER_TYPE_TONES[context.profile.customer_type || 'plot_buyer'] ?? 'slate')}>
          {context.customerTypeLabel}
        </span>
        <span className={badgeClass(context.verificationTone)}>
          {formatVerificationStatus(context.verificationStatus)}
        </span>
        <span className={badgeClass(context.planTone)}>{context.planLabel}</span>
        {context.ownerProperty ? (
          <span className={badgeClass('slate')}>{getInspectionTemplate(inspectionTypeFromProperty({
            assetType: context.ownerProperty.asset_type,
            propertyKind: context.ownerProperty.property_kind,
            hasPlot: Boolean(context.ownerPlot),
          })).label}</span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a href={`mailto:${context.profile.email ?? ''}`} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 transition hover:border-[#C0392B]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Email</p>
          <p className="mt-1 break-all text-sm font-semibold text-[#1F2937]">{context.profile.email || 'Email pending'}</p>
        </a>
        <a href={`tel:${context.profile.phone ?? ''}`} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 transition hover:border-[#C0392B]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Phone</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{context.profile.phone || 'Phone pending'}</p>
        </a>
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Contact address</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{context.profile.address_line || context.profile.city || 'Address pending'}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Joined</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{context.joinedLabel}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{formatRelativeDays(context.profile.created_at)}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Support tickets</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{context.supportTotal}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{context.supportOpen} currently open</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Owner properties</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{context.ownerPropertyTotal}</p>
          <p className="mt-1 text-xs text-[#6B7280]">Registered from onboarding or owner dashboard</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Documents</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{context.documentsTotal}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{context.documentsPending} pending review</p>
        </div>
        <div className="sm:col-span-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Verification</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{formatVerificationStatus(context.verificationStatus)}</p>
          <p className="mt-1 text-xs text-[#6B7280]">Use the linked profile to review full account history, documents, and support records.</p>
        </div>
        {context.ownerProperty ? (
          <div className="sm:col-span-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Property context</p>
            <p className="mt-1 text-sm font-semibold text-[#1F2937]">{context.ownerProperty.title || 'Registered property'}</p>
            <p className="mt-1 text-xs leading-5 text-[#6B7280]">{context.propertyContextSummary}</p>
          </div>
        ) : null}
        {context.documentRequirements.length ? (
          <div className="sm:col-span-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Expected documents</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {context.documentRequirements.map((label) => (
                <span key={label} className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#4B5563]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

export function CustomerContextPanelSkeleton({ className = '' }: { className?: string }) {
  return (
    <aside className={`rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`.trim()}>
      <div className="h-3 w-28 animate-pulse rounded bg-[#E5E7EB]" />
      <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-[#E5E7EB]" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-[#F3F4F6]" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded-lg bg-[#F3F4F6]" />
        <div className="h-20 animate-pulse rounded-lg bg-[#F3F4F6]" />
        <div className="h-20 animate-pulse rounded-lg bg-[#F3F4F6]" />
        <div className="h-20 animate-pulse rounded-lg bg-[#F3F4F6]" />
      </div>
    </aside>
  )
}
