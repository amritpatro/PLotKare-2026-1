import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listingSchema } from '@/lib/validation/pilot'
import { requireAdminContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'Active')
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 400, 'LISTINGS_FETCH_FAILED')
  const listings = (data ?? []).map(({ price_lakhs, ...listing }) => ({
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
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'LISTING_CREATE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'listing.created', entityType: 'listing', entityId: data.id })
  return apiOk({ listing: data }, { status: 201 })
}
