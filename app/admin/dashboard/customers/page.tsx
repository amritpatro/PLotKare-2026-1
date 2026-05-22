import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

type AdminCustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type CustomerRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  account_status: string
  kyc_status: string
  created_at: string
}

type CustomerPropertyLink = {
  customer_id: string
  status: string
}

type SubscriptionRow = {
  customer_id: string | null
  plan: string
  status: string
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function statusBadge(status: string) {
  return (
    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const q = getParam(params, 'q')?.trim() ?? ''
  const status = getParam(params, 'status')?.trim() ?? ''

  let customerQuery = supabase
    .from('customers')
    .select('id,full_name,email,phone,address,account_status,kyc_status,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    const term = q.replaceAll('%', '\\%').replaceAll('_', '\\_')
    customerQuery = customerQuery.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  if (status) {
    customerQuery = customerQuery.eq('account_status', status)
  }

  const [{ data: customers }, { data: links }, { data: subscriptions }] = await Promise.all([
    customerQuery,
    supabase.from('customer_property_links').select('customer_id,status'),
    supabase.from('subscriptions').select('customer_id,plan,status').not('customer_id', 'is', null),
  ])

  const rows = (customers ?? []) as CustomerRow[]
  const linkRows = (links ?? []) as CustomerPropertyLink[]
  const subscriptionRows = (subscriptions ?? []) as SubscriptionRow[]
  const plotCounts = new Map<string, number>()
  const activeLinkCounts = new Map<string, number>()
  const plans = new Map<string, string>()

  linkRows.forEach((link) => {
    plotCounts.set(link.customer_id, (plotCounts.get(link.customer_id) ?? 0) + 1)
    if (link.status === 'active' || link.status === 'completed') {
      activeLinkCounts.set(link.customer_id, (activeLinkCounts.get(link.customer_id) ?? 0) + 1)
    }
  })

  subscriptionRows.forEach((subscription) => {
    if (subscription.customer_id && !plans.has(subscription.customer_id)) {
      plans.set(subscription.customer_id, `${subscription.plan} · ${subscription.status}`)
    }
  })

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Customers</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Real customer records from Supabase.</p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, email, phone" className={`${inputClass} w-64`} />
          <select name="status" defaultValue={status} className={inputClass}>
            <option value="">All accounts</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
          <button className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white" type="submit">
            Filter
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ['Customers shown', rows.length],
          ['Linked properties', linkRows.length],
          ['Active links', Array.from(activeLinkCounts.values()).reduce((sum, value) => sum + value, 0)],
        ].map(([label, value]) => (
          <div key={label} className={`${cardClass} p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <div className={`${cardClass} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Properties</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] font-sans text-[#1F2937]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#6B7280]">
                  No customers found.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">{row.full_name || 'Unnamed customer'}</td>
                <td className="px-4 py-3 text-[#6B7280]">{row.email || 'Pending'}</td>
                <td className="px-4 py-3 text-[#6B7280]">{row.phone || 'Pending'}</td>
                <td className="max-w-xs truncate px-4 py-3 text-[#6B7280]">{row.address || 'Pending'}</td>
                <td className="px-4 py-3">{plotCounts.get(row.id) ?? 0}</td>
                <td className="px-4 py-3 text-[#6B7280]">{plans.get(row.id) ?? 'No subscription'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {statusBadge(row.account_status)}
                    {statusBadge(row.kyc_status)}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6B7280]">{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
