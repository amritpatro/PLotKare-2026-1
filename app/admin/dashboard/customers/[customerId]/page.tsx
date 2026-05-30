import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CustomerContextPanel } from '@/components/admin/customer-context-panel'
import { PropertyDocumentRecordTable } from '@/components/documents/property-document-record-table'
import StatusBadge from '@/components/ui/status-badge'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ customerId: string }>
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  await requirePageRole(['admin'])
  const { customerId } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: profile }, { data: customerRecord }, { data: sellerRecord }, { data: ownerRecord }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,email,phone,customer_type,role,created_at')
      .eq('id', customerId)
      .maybeSingle(),
    supabase
      .from('customers')
      .select('id,profile_id,full_name,email,phone,account_status,kyc_status,aadhaar_last4,pan_number,created_at')
      .eq('profile_id', customerId)
      .maybeSingle(),
    supabase
      .from('sellers')
      .select('id,profile_id,company_name,gst_number,pan_number,verification_status,created_at')
      .eq('profile_id', customerId)
      .maybeSingle(),
    supabase
      .from('owners')
      .select('id,profile_id,verification_status,created_at')
      .eq('profile_id', customerId)
      .maybeSingle(),
  ])

  if (!profile) notFound()

  const customerDbId = customerRecord?.id ?? null

  const [{ data: tickets }, { data: documents }, { data: links }, { data: subscription }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id,ticket_reference,subject,description,status,priority,created_at,due_at,category,assigned_employee_id')
      .eq('requester_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('property_documents')
      .select('id,title,document_type,verification_status,created_at,reviewed_at,category,requirement_level,size_bytes,mime_type,uploaded_by,customer_id')
      .or(customerDbId ? `uploaded_by.eq.${customerId},customer_id.eq.${customerDbId}` : `uploaded_by.eq.${customerId}`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('customer_property_links')
      .select('id,property_id,status,relationship_type,created_at')
      .eq('customer_id', customerDbId ?? '00000000-0000-0000-0000-000000000000')
      .order('created_at', { ascending: false })
      .limit(10),
    customerDbId
      ? supabase
          .from('subscriptions')
          .select('plan,status,created_at')
          .eq('customer_id', customerDbId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const profileRow = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    customer_type: profile.customer_type,
    role: profile.role,
    created_at: profile.created_at,
  }

  const planLabel = subscription?.plan ? `${String(subscription.plan).replaceAll('_', ' ')} · ${subscription.status}` : 'No active subscription'

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Customer management</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">{profile.full_name || 'Customer profile'}</h1>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
            Full profile context, tickets, documents, subscriptions, and verified property link activity.
          </p>
        </div>
        <Link
          href="/admin/dashboard/customers"
          className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 font-sans text-sm font-semibold text-[#1F2937] transition hover:border-[#C0392B] hover:text-[#C0392B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B]/20"
        >
          Back to customers
        </Link>
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
        <CustomerContextPanel userId={customerId} />

        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">Current plan</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-[#1F2937]">{planLabel}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={customerRecord?.kyc_status || ownerRecord?.verification_status || sellerRecord?.verification_status || 'pending'} />
              <StatusBadge status={customerRecord?.account_status || 'pending'} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6B7280]">
              Joined {formatDate(profileRow.created_at)}. Use this page to confirm the account history before making operational decisions.
            </p>
            {sellerRecord?.gst_number || sellerRecord?.pan_number ? (
              <p className="mt-3 text-sm text-[#6B7280]">
                Seller details: {sellerRecord.company_name || 'Seller profile'}{sellerRecord.gst_number ? ` · GST ${sellerRecord.gst_number}` : ''}{sellerRecord.pan_number ? ` · PAN ${sellerRecord.pan_number}` : ''}
              </p>
            ) : null}
            {customerRecord?.pan_number || customerRecord?.aadhaar_last4 ? (
              <p className="mt-2 text-sm text-[#6B7280]">
                Customer KYC: {customerRecord.pan_number ? `PAN ${customerRecord.pan_number}` : 'PAN pending'}{customerRecord.aadhaar_last4 ? ` · Aadhaar •••• ${customerRecord.aadhaar_last4}` : ''}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Active links</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Approved property links and their current operational status.</p>
            <div className="mt-4 space-y-3">
              {(links ?? []).length === 0 ? <p className="text-sm text-[#6B7280]">No active property links yet.</p> : null}
              {(links ?? []).map((link: any) => (
                <div key={link.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[#1F2937]">{link.relationship_type}</p>
                    <StatusBadge status={link.status} />
                  </div>
                  <p className="mt-1 text-xs text-[#6B7280]">Linked property: {link.property_id}</p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">Created {formatDate(link.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Recent support tickets</h2>
          <div className="mt-4 space-y-3">
            {(tickets ?? []).length === 0 ? <p className="text-sm text-[#6B7280]">No support tickets yet.</p> : null}
            {(tickets ?? []).map((ticket: any) => (
              <div key={ticket.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#1F2937]">{ticket.subject}</p>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C0392B]">{ticket.ticket_reference || `Ticket ${ticket.id.slice(0, 8).toUpperCase()}`}</p>
                <p className="mt-2 line-clamp-2 text-sm text-[#6B7280]">{ticket.description}</p>
                <p className="mt-2 text-xs text-[#9CA3AF]">{ticket.priority} · {formatDate(ticket.created_at)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Recent documents</h2>
          <div className="mt-4">
            <PropertyDocumentRecordTable
              rows={(documents ?? []).map((document: any) => ({
                ...document,
                linked_label: document.customer_id || document.uploaded_by || 'Customer profile',
              }))}
              empty="No documents uploaded yet."
              linkedLabel="Customer / link"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
