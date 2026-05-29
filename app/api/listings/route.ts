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
    .eq('approval_status', 'approved')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 400, 'LISTINGS_FETCH_FAILED')
  const rows = (data ?? []) as Array<Record<string, unknown> & { seller_id?: string | null; premium?: boolean; created_at?: string; inquiries_count?: number | null }>
  const sellerIds = rows.map((row) => row.seller_id).filter(Boolean) as string[]
  const { data: sellers } = sellerIds.length
    ? await supabase
        .from('sellers')
        .select('id,company_name,verification_status')
        .in('id', Array.from(new Set(sellerIds)))
    : { data: [] }
  const sellersById = new Map(
    ((sellers ?? []) as Array<{ id: string; company_name: string | null; verification_status: string | null }>).map((seller) => [
      seller.id,
      seller,
    ]),
  )
  const listings = rows
    .map((listing) => {
      const seller = listing.seller_id ? sellersById.get(listing.seller_id) : null
      return {
        ...listing,
        price_display: listing.price_display || 'Consult after verification',
        seller_partner_priority: seller?.verification_status === 'approved',
        seller_company_name: seller?.company_name ?? null,
      }
    })
    .sort((left, right) => {
      const leftPriority = left.seller_partner_priority ? 1 : 0
      const rightPriority = right.seller_partner_priority ? 1 : 0
      if (leftPriority !== rightPriority) return rightPriority - leftPriority
      if (left.premium !== right.premium) return Number(Boolean(right.premium)) - Number(Boolean(left.premium))
      return Number(right.inquiries_count ?? 0) - Number(left.inquiries_count ?? 0)
    })

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
      is_published: parsed.data.status === 'Active',
      verified_at: new Date().toISOString(),
      verified_by: context.user.id,
      published_at: parsed.data.status === 'Active' ? new Date().toISOString() : null,
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'LISTING_CREATE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'listing.created', entityType: 'listing', entityId: data.id })
  return apiOk({ listing: data }, { status: 201 })
}
