import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

type AdminPlotsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type PlotRow = {
  id: string
  owner_id: string
  property_id: string | null
  reserved_customer_id: string | null
  sold_customer_id: string | null
  plot_number: string
  location: string
  sq_yards: number
  facing: string
  corner_plot: boolean
  status: string
  lifecycle_status: string
  verification_status: string
  last_inspection: string | null
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
  state: string | null
  lifecycle_status: string
  verification_status: string
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function badge(value: string) {
  return (
    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
      {value.replaceAll('_', ' ')}
    </span>
  )
}

export default async function AdminPlotsPage({ searchParams }: AdminPlotsPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const q = getParam(params, 'q')?.trim() ?? ''
  const lifecycle = getParam(params, 'lifecycle')?.trim() ?? ''

  let plotQuery = supabase
    .from('plots')
    .select('id,owner_id,property_id,reserved_customer_id,sold_customer_id,plot_number,location,sq_yards,facing,corner_plot,status,lifecycle_status,verification_status,last_inspection,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    const term = q.replaceAll('%', '\\%').replaceAll('_', '\\_')
    plotQuery = plotQuery.or(`plot_number.ilike.%${term}%,location.ilike.%${term}%,survey_number.ilike.%${term}%`)
  }

  if (lifecycle) {
    plotQuery = plotQuery.eq('lifecycle_status', lifecycle)
  }

  const { data: plots } = await plotQuery
  const rows = (plots ?? []) as PlotRow[]
  const ownerIds = unique(rows.map((row) => row.owner_id))
  const customerIds = unique(rows.flatMap((row) => [row.reserved_customer_id, row.sold_customer_id]))
  const propertyIds = unique(rows.map((row) => row.property_id))

  const [{ data: profiles }, { data: customers }, { data: properties }] = await Promise.all([
    ownerIds.length
      ? supabase.from('profiles').select('id,full_name,email').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    customerIds.length
      ? supabase.from('customers').select('id,full_name,email').in('id', customerIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? supabase.from('properties').select('id,title,city,state,lifecycle_status,verification_status').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((row) => [row.id, row]))
  const customerById = new Map(((customers ?? []) as CustomerRow[]).map((row) => [row.id, row]))
  const propertyById = new Map(((properties ?? []) as PropertyRow[]).map((row) => [row.id, row]))

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Plots</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">All registered Supabase plots across owners and customers.</p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search plot, location, survey" className={`${inputClass} w-64`} />
          <select name="lifecycle" defaultValue={lifecycle} className={inputClass}>
            <option value="">All lifecycle states</option>
            <option value="registered">Registered</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="managed">Managed</option>
            <option value="archived">Archived</option>
          </select>
          <button className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white" type="submit">
            Filter
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ['Plots shown', rows.length],
          ['Available', rows.filter((row) => row.lifecycle_status === 'available').length],
          ['Sold', rows.filter((row) => row.lifecycle_status === 'sold' || row.status === 'sold').length],
          ['Pending review', rows.filter((row) => row.verification_status !== 'approved').length],
        ].map(([label, value]) => (
          <div key={label} className={`${cardClass} p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <div className={`${cardClass} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Plot #</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Size</th>
              <th className="px-3 py-3">Facing</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Inspection</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] font-sans text-[#1F2937]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-[#6B7280]">
                  No plots found.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const owner = profileById.get(row.owner_id)
              const customer = row.sold_customer_id
                ? customerById.get(row.sold_customer_id)
                : row.reserved_customer_id
                  ? customerById.get(row.reserved_customer_id)
                  : null
              const property = row.property_id ? propertyById.get(row.property_id) : null

              return (
                <tr key={row.id}>
                  <td className="px-3 py-3 font-mono text-[#C0392B]">{row.plot_number}</td>
                  <td className="px-3 py-3">{owner?.full_name || owner?.email || 'Owner pending'}</td>
                  <td className="px-3 py-3 text-[#6B7280]">
                    {property?.title || 'Unlinked'}
                    {property?.city ? <span className="block text-xs text-[#9CA3AF]">{property.city}{property.state ? `, ${property.state}` : ''}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.location}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.sq_yards} sq. yd</td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.facing}{row.corner_plot ? ' · corner' : ''}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{customer?.full_name || customer?.email || 'Not assigned'}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.last_inspection || 'Pending'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {badge(row.lifecycle_status)}
                      {badge(row.verification_status)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
