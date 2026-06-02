import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listingSchema } from '@/lib/validation/app'
import { requireAdminContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

type ListingVisibilityRow = {
  id: string
  property_id: string | null
  plot_id: string | null
}

function archivedState(value: string | null | undefined) {
  return ['archived', 'sold', 'reserved'].includes(String(value ?? '').toLowerCase())
}

async function filterVisibleListings<T extends ListingVisibilityRow>(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: T[],
) {
  const propertyIds = Array.from(new Set(rows.map((row) => row.property_id).filter(Boolean))) as string[]
  const plotIds = Array.from(new Set(rows.map((row) => row.plot_id).filter(Boolean))) as string[]

  const [{ data: properties }, { data: plots }] = await Promise.all([
    propertyIds.length
      ? supabase.from('properties').select('id,lifecycle_status').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
    plotIds.length
      ? supabase.from('plots').select('id,lifecycle_status,status').in('id', plotIds)
      : Promise.resolve({ data: [] }),
  ])

  const propertyById = new Map(((properties ?? []) as Array<{ id: string; lifecycle_status: string | null }>).map((row) => [row.id, row]))
  const plotById = new Map(((plots ?? []) as Array<{ id: string; lifecycle_status: string | null; status: string | null }>).map((row) => [row.id, row]))

  return rows.filter((row) => {
    const property = row.property_id ? propertyById.get(row.property_id) : null
    const plot = row.plot_id ? plotById.get(row.plot_id) : null
    return !archivedState(property?.lifecycle_status) && !archivedState(plot?.lifecycle_status) && !archivedState(plot?.status)
  })
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .in('status', ['Active', 'featured'])
    .eq('approval_status', 'approved')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 400, 'LISTINGS_FETCH_FAILED')
  const visibleRows = await filterVisibleListings(supabase, data ?? [])
  const listings = visibleRows.map(({ price_lakhs, ...listing }) => ({
    ...listing,
    price_display: listing.price_display || 'Consult after verification',
  }))

  return apiOk({ listings })
}

export async function POST(request: Request) {
  const context = await requireAdminContext()
  if ('response' in context) return context.response

  const parsed = listingSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await context.supabase
    .from('listings')
    .insert({
      owner_id: parsed.data.ownerId ?? null,
      plot_id: parsed.data.plotId ?? null,
      plot_number: parsed.data.plotNumber,
      location: parsed.data.location,
      size_sq_yards: parsed.data.sizeSqYards,
      size_label: parsed.data.sizeLabel,
      facing: parsed.data.facing,
      corner_plot: parsed.data.cornerPlot,
      premium: parsed.data.premium,
      price_lakhs: parsed.data.priceLakhs,
      price_display: parsed.data.priceDisplay,
      image_path: parsed.data.imagePath ?? null,
      status: parsed.data.status,
      property_kind: parsed.data.propertyKind,
      bhk: parsed.data.bhk ?? null,
      floor_label: parsed.data.floorLabel ?? null,
      approval_status: 'approved',
      is_published: ['Active', 'featured'].includes(parsed.data.status),
      verified_at: new Date().toISOString(),
      verified_by: context.user.id,
      published_at: ['Active', 'featured'].includes(parsed.data.status) ? new Date().toISOString() : null,
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'LISTING_CREATE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'listing.created', entityType: 'listing', entityId: data.id })
  return apiOk({ listing: data }, { status: 201 })
}
