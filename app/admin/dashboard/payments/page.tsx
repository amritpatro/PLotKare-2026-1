import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

type AdminPaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type PaymentRow = {
  id: string
  owner_id: string
  customer_id: string | null
  property_id: string | null
  subscription_id: string | null
  description: string
  amount: number
  status: string
  provider: string
  provider_payment_id: string | null
  paid_at: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type CustomerRow = {
  id: string
  full_name: string
  email: string | null
}

type PropertyRow = {
  id: string
  title: string
  city: string | null
}

type SubscriptionRow = {
  id: string
  plan: string
  status: string
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function statusBadge(status: string) {
  const className =
    status === 'Paid'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'Failed'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'

  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${className}`}>
      {status}
    </span>
  )
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const q = getParam(params, 'q')?.trim() ?? ''
  const status = getParam(params, 'status')?.trim() ?? ''

  let paymentQuery = supabase
    .from('payments')
    .select('id,owner_id,customer_id,property_id,subscription_id,description,amount,status,provider,provider_payment_id,paid_at,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    const term = q.replaceAll('%', '\\%').replaceAll('_', '\\_')
    paymentQuery = paymentQuery.or(`description.ilike.%${term}%,provider_payment_id.ilike.%${term}%,provider.ilike.%${term}%`)
  }

  if (status) {
    paymentQuery = paymentQuery.eq('status', status)
  }

  const { data: payments } = await paymentQuery
  const rows = (payments ?? []) as PaymentRow[]
  const ownerIds = unique(rows.map((row) => row.owner_id))
  const customerIds = unique(rows.map((row) => row.customer_id))
  const propertyIds = unique(rows.map((row) => row.property_id))
  const subscriptionIds = unique(rows.map((row) => row.subscription_id))

  const [{ data: profiles }, { data: customers }, { data: properties }, { data: subscriptions }] = await Promise.all([
    ownerIds.length
      ? supabase.from('profiles').select('id,full_name,email').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    customerIds.length
      ? supabase.from('customers').select('id,full_name,email').in('id', customerIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? supabase.from('properties').select('id,title,city').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
    subscriptionIds.length
      ? supabase.from('subscriptions').select('id,plan,status').in('id', subscriptionIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((row) => [row.id, row]))
  const customerById = new Map(((customers ?? []) as CustomerRow[]).map((row) => [row.id, row]))
  const propertyById = new Map(((properties ?? []) as PropertyRow[]).map((row) => [row.id, row]))
  const subscriptionById = new Map(((subscriptions ?? []) as SubscriptionRow[]).map((row) => [row.id, row]))
  const paidTotal = rows.filter((row) => row.status === 'Paid').reduce((sum, row) => sum + Number(row.amount), 0)

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Payments</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Consultation, subscription, and service payment records from Supabase.</p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search description, provider" className={`${inputClass} w-64`} />
          <select name="status" defaultValue={status} className={inputClass}>
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>
          <button className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white" type="submit">
            Filter
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ['Payments shown', rows.length],
          ['Paid value', formatAmount(paidTotal)],
          ['Pending', rows.filter((row) => row.status === 'Pending').length],
          ['Razorpay', rows.filter((row) => row.provider === 'razorpay').length],
        ].map(([label, value]) => (
          <div key={label} className={`${cardClass} p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-2xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <div className={`${cardClass} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Payer</th>
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Subscription</th>
              <th className="px-3 py-3">Provider</th>
              <th className="px-3 py-3">Amount</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-[#6B7280]">
                  No payment records found.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const owner = profileById.get(row.owner_id)
              const customer = row.customer_id ? customerById.get(row.customer_id) : null
              const property = row.property_id ? propertyById.get(row.property_id) : null
              const subscription = row.subscription_id ? subscriptionById.get(row.subscription_id) : null

              return (
                <tr key={row.id}>
                  <td className="px-3 py-3 text-[#6B7280]">
                    {new Date(row.paid_at ?? row.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-3 py-3 text-[#1F2937]">
                    {customer?.full_name || customer?.email || owner?.full_name || owner?.email || 'Payer pending'}
                  </td>
                  <td className="px-3 py-3 text-[#6B7280]">
                    {property?.title || 'Unlinked'}
                    {property?.city ? <span className="block text-xs text-[#9CA3AF]">{property.city}</span> : null}
                  </td>
                  <td className="max-w-xs truncate px-3 py-3 text-[#6B7280]">{row.description}</td>
                  <td className="px-3 py-3 text-[#6B7280]">
                    {subscription ? `${subscription.plan} · ${subscription.status}` : 'No subscription'}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-[#6B7280]">
                    {row.provider}
                    {row.provider_payment_id ? <span className="block text-[#9CA3AF]">{row.provider_payment_id}</span> : null}
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#1F2937]">{formatAmount(Number(row.amount))}</td>
                  <td className="px-3 py-3">{statusBadge(row.status)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
