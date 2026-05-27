import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass =
  'rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

type AdminListingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type ListingRow = {
  id: string
  owner_id: string | null
  plot_id: string | null
  property_id: string | null
  seller_id: string | null
  plot_number: string
  location: string
  size_label: string
  size_sq_yards: number
  facing: string
  corner_plot: boolean
  premium: boolean
  price_display: string
  status: string
  approval_status: string | null
  is_published: boolean | null
  verified_at: string | null
  inquiries_count: number
  property_kind: string
  bhk: number | null
  floor_label: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type PlotRow = {
  id: string
  property_id: string | null
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

export default async function AdminListingsPage({ searchParams }: AdminListingsPageProps) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const q = getParam(params, 'q')?.trim() ?? ''
  const status = getParam(params, 'status')?.trim() ?? ''
  const kind = getParam(params, 'kind')?.trim() ?? ''

  let listingQuery = supabase
    .from('listings')
    .select(
      'id,owner_id,property_id,seller_id,plot_id,plot_number,location,size_label,size_sq_yards,facing,corner_plot,premium,price_display,status,approval_status,is_published,verified_at,inquiries_count,property_kind,bhk,floor_label,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    const term = q.replaceAll('%', '\\%').replaceAll('_', '\\_')
    listingQuery = listingQuery.or(`plot_number.ilike.%${term}%,location.ilike.%${term}%,size_label.ilike.%${term}%`)
  }

  if (status) listingQuery = listingQuery.eq('status', status)
  if (kind) listingQuery = listingQuery.eq('property_kind', kind)

  const { data: listings } = await listingQuery
  const rows = (listings ?? []) as ListingRow[]
  const ownerIds = unique(rows.map((row) => row.owner_id))
  const plotIds = unique(rows.map((row) => row.plot_id))

  const [{ data: owners }, { data: plots }] = await Promise.all([
    ownerIds.length ? supabase.from('profiles').select('id,full_name,email').in('id', ownerIds) : Promise.resolve({ data: [] }),
    plotIds.length
      ? supabase.from('plots').select('id,property_id,lifecycle_status,verification_status').in('id', plotIds)
      : Promise.resolve({ data: [] }),
  ])

  const ownerById = new Map(((owners ?? []) as ProfileRow[]).map((row) => [row.id, row]))
  const plotById = new Map(((plots ?? []) as PlotRow[]).map((row) => [row.id, row]))
  const activeRows = rows.filter((row) => row.status === 'Active')
  const soldRows = rows.filter((row) => row.status === 'Sold')

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Listings</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Real marketplace listings from Supabase.</p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search listing, location, size" className={`${inputClass} w-64`} />
          <select name="kind" defaultValue={kind} className={inputClass}>
            <option value="">All property types</option>
            <option value="plot">Plots</option>
            <option value="apartment">Apartments</option>
          </select>
          <select name="status" defaultValue={status} className={inputClass}>
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Sold">Sold</option>
          </select>
          <button className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white" type="submit">
            Filter
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ['Listings shown', rows.length],
          ['Published', activeRows.filter((row) => row.is_published && row.approval_status === 'approved').length],
          ['Sold', soldRows.length],
          ['Inquiries', rows.reduce((sum, row) => sum + Number(row.inquiries_count || 0), 0)],
        ].map(([label, value]) => (
          <div key={label} className={`${cardClass} p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-[#C0392B]">{value}</p>
          </div>
        ))}
      </section>

      <div className={`${cardClass} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Reference</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Size</th>
              <th className="px-3 py-3">Plot state</th>
              <th className="px-3 py-3">Verification</th>
              <th className="px-3 py-3">Pricing</th>
              <th className="px-3 py-3">Inquiries</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-[#6B7280]">
                  No listings found.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const owner = row.owner_id ? ownerById.get(row.owner_id) : null
              const plot = row.plot_id ? plotById.get(row.plot_id) : null

              return (
                <tr key={row.id} className="font-sans text-[#1F2937]">
                  <td className="px-3 py-3 text-[#6B7280]">{row.property_kind === 'apartment' ? 'Apartment' : 'Plot'}</td>
                  <td className="px-3 py-3 font-mono text-[#C0392B]">{row.plot_number}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{owner?.full_name || owner?.email || 'Owner pending'}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.location}</td>
                  <td className="px-3 py-3 text-[#6B7280]">
                    {row.size_label}
                    {row.bhk ? <span className="block text-xs text-[#9CA3AF]">{row.bhk} BHK {row.floor_label || ''}</span> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {plot ? badge(plot.lifecycle_status) : badge('unlinked')}
                      {plot ? badge(plot.verification_status) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.is_published && row.approval_status === 'approved' ? <PlotKareVerifiedStamp compact /> : badge(row.approval_status ?? 'submitted')}
                      {row.verified_at ? badge('verified') : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#6B7280]">{row.price_display}</td>
                  <td className="px-3 py-3 font-mono text-[#1F2937]">{row.inquiries_count}</td>
                  <td className="px-3 py-3">{badge(row.status)}</td>
                  <td className="px-3 py-3 text-[#6B7280]">{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
