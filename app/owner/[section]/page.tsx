import { notFound } from 'next/navigation'
import { createOwnerServiceRequest, createOwnerSupportTicket, registerOwnerProperty } from '@/app/owner/actions'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const allowedSections = ['properties', 'register', 'verification', 'documents', 'services', 'support'] as const

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass = 'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]'

type PageProps = {
  params: Promise<{ section: string }>
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

export default async function OwnerSectionPage({ params }: PageProps) {
  const { section } = await params
  if (!allowedSections.includes(section as never)) notFound()

  const { user, profile } = await requirePageRole(['land_owner', 'admin'])
  const supabase = await createSupabaseServerClient()
  const [{ data: owner }, { data: properties }, { data: documents }, { data: services }, { data: tickets }] = await Promise.all([
    supabase.from('owners').select('id,verification_status,admin_notes').eq('profile_id', user.id).maybeSingle(),
    supabase.from('properties').select('id,title,property_kind,address,city,state,lifecycle_status,verification_status,created_at').eq('owner_profile_id', user.id).order('created_at', { ascending: false }),
    supabase.from('property_documents').select('id,title,document_type,verification_status,property_id,created_at').eq('uploaded_by', user.id).order('created_at', { ascending: false }),
    supabase.from('maintenance_requests').select('id,property_id,title,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('support_tickets').select('id,property_id,subject,priority,status,created_at').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(100),
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
  let content: React.ReactNode

  if (section === 'register') {
    content = <div className="space-y-6"><Title title="Register property" body="Register a property into PlotKare verification and care operations." /><form action={registerOwnerProperty} className={`${cardClass} grid gap-3 md:grid-cols-2`}><select name="propertyKind" className={inputClass} defaultValue="plot"><option value="plot">Plot</option><option value="apartment">Apartment</option></select><input name="title" required placeholder="Property title" className={inputClass} /><input name="address" required placeholder="Address" className={inputClass} /><input name="city" required placeholder="City" className={inputClass} /><input name="state" defaultValue="Andhra Pradesh" className={inputClass} /><input name="postalCode" placeholder="Postal code" className={inputClass} /><input name="plotNumber" placeholder="Plot ID" className={inputClass} /><input name="sqYards" type="number" min="1" placeholder="Sq. yards" className={inputClass} /><button className={`${buttonClass} md:col-span-2`}>Submit for verification</button></form></div>
  } else if (section === 'support') {
    content = <div className="space-y-6"><Title title="Support" body="Open owner support tickets linked to properties or account operations." /><div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><form action={createOwnerSupportTicket} className={`${cardClass} grid gap-3`}><select name="propertyId" className={inputClass} defaultValue=""><option value="">General owner support</option>{propertyRows.map((property: any) => <option key={property.id} value={property.id}>{property.title || property.city || property.id}</option>)}</select><input name="subject" required placeholder="Subject" className={inputClass} /><textarea name="description" required rows={5} placeholder="Describe what support should resolve" className={inputClass} /><select name="priority" className={inputClass} defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><button className={buttonClass}>Open ticket</button></form><RecordTable rows={tickets ?? []} /></div></div>
  } else if (section === 'services') {
    const rows = [...(services ?? []), ...(inspections ?? [])]
    content = <div className="space-y-6"><Title title="Service activity" body="Request inspections or maintenance support and track service records tied to your property." /><div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><form action={createOwnerServiceRequest} className={`${cardClass} grid gap-3`}><select name="propertyId" required className={inputClass} defaultValue=""><option value="" disabled>Select property</option>{propertyRows.map((property: any) => <option key={property.id} value={property.id}>{property.title || property.city || property.id}</option>)}</select><input name="title" required placeholder="Service request title" className={inputClass} /><textarea name="description" rows={5} placeholder="Describe the service needed" className={inputClass} /><select name="priority" className={inputClass} defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><button className={buttonClass} disabled={propertyRows.length === 0}>Create service request</button></form><RecordTable rows={rows} /></div></div>
  } else {
    const rows = section === 'documents' ? documents ?? [] : section === 'services' ? [...(services ?? []), ...(inspections ?? [])] : propertyRows
    content = <div className="space-y-6"><Title title={section === 'verification' ? 'Verification status' : section} body="Focused owner records with status, dates, and next operational state." /><RecordTable rows={rows} /></div>
  }

  return <RoleDashboardShell role="owner" title="Property care workspace" subtitle="Register properties, track verification, and manage service activity tied to your account." userLabel={profile.full_name || profile.email} userId={user.id}>{content}</RoleDashboardShell>
}

function RecordTable({ rows }: { rows: any[] }) {
  return <div className={`${cardClass} overflow-x-auto`}><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]"><th className="px-3 py-3">Record</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Location/type</th><th className="px-3 py-3">Date</th></tr></thead><tbody className="divide-y divide-[#F3F4F6]">{rows.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-[#6B7280]">No records yet.</td></tr> : null}{rows.map((row) => <tr key={row.id}><td className="px-3 py-3 font-semibold text-[#1F2937]">{row.title || row.subject || row.summary || row.id}</td><td className="px-3 py-3">{badge(row.verification_status || row.status || row.priority)}</td><td className="px-3 py-3 text-[#6B7280]">{row.city || row.address || row.document_type || row.property_kind || row.property_id || 'Account'}</td><td className="px-3 py-3 text-[#6B7280]">{formatDate(row.created_at || row.scheduled_for)}</td></tr>)}</tbody></table></div>
}
