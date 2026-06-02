import { logger } from '@/lib/monitoring/logger'
type SupabaseAdminLike = {
  from: (table: string) => any
}

type PublishResult = {
  listingId: string | null
  published: boolean
  reason: string
}

type PropertyRow = {
  id: string
  owner_profile_id: string | null
  seller_id: string | null
  property_kind: string | null
  title: string | null
  address: string | null
  city: string | null
  state: string | null
  lifecycle_status: string | null
  verification_status: string | null
}

type PlotRow = {
  id: string
  property_id: string | null
  seller_id: string | null
  plot_number: string | null
  location: string | null
  sq_yards: number | null
  facing: string | null
  corner_plot: boolean | null
  current_value_lakhs: number | null
  lifecycle_status: string | null
  verification_status: string | null
  status: string | null
}

type SellerRow = {
  id: string
  profile_id: string | null
  verification_status: string | null
}

function toFacing(value: string | null | undefined) {
  if (value === 'North' || value === 'South' || value === 'West') return value
  return 'East'
}

function formatSize(plot: PlotRow | null) {
  const size = Number(plot?.sq_yards ?? 0)
  return size > 0 ? `${size.toLocaleString('en-IN')} sq yards` : 'Size under review'
}

function formatPrice(plot: PlotRow | null) {
  const price = Number(plot?.current_value_lakhs ?? 0)
  return price > 0 ? `₹${price.toLocaleString('en-IN')}L` : 'Consult after verification'
}

function isPublishable(property: PropertyRow, plot: PlotRow | null, seller: SellerRow | null) {
  if (property.verification_status !== 'approved') return 'property_not_approved'
  if (!['available', 'registered', 'managed'].includes(property.lifecycle_status ?? 'available')) return 'property_not_available'
  if (seller && seller.verification_status !== 'approved') return 'seller_not_approved'
  if (plot && plot.verification_status !== 'approved') return 'plot_not_approved'
  if (plot && ['sold', 'reserved', 'archived'].includes(plot.lifecycle_status ?? '')) return 'plot_not_available'
  if (plot && ['sold', 'reserved', 'archived'].includes(plot.status ?? '')) return 'plot_not_available'
  return null
}

async function notifyListingPublication(
  supabase: SupabaseAdminLike,
  values: {
    recipientId: string | null
    actorId: string | null
    published: boolean
    property: PropertyRow
    listingId: string | null
    reason: string
  },
) {
  if (!values.recipientId) return

  const { error } = await supabase.from('notifications').insert({
    recipient_id: values.recipientId,
    actor_id: values.actorId,
    title: values.published ? 'Listing verified and published' : 'Listing publication paused',
    message: values.published
      ? `${values.property.title || 'Your property'} is now PlotKare Verified and visible to buyers.`
      : `${values.property.title || 'Your property'} is not visible to buyers yet: ${values.reason.replaceAll('_', ' ')}.`,
    category: 'verification',
    metadata: {
      property_id: values.property.id,
      listing_id: values.listingId,
      published: values.published,
      reason: values.reason,
    },
  })

  if (error) {
    logger.error('Listing publication notification failed:', error)
  }
}

export async function syncVerifiedListingForProperty(
  supabase: SupabaseAdminLike,
  propertyId: string,
  actorId: string | null,
): Promise<PublishResult> {
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id,owner_profile_id,seller_id,property_kind,title,address,city,state,lifecycle_status,verification_status')
    .eq('id', propertyId)
    .maybeSingle()

  if (propertyError) throw propertyError
  if (!property) return { listingId: null, published: false, reason: 'property_not_found' }

  const propertyRow = property as PropertyRow
  const { data: plot } = await supabase
    .from('plots')
    .select('id,property_id,seller_id,plot_number,location,sq_yards,facing,corner_plot,current_value_lakhs,lifecycle_status,verification_status,status')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const plotRow = (plot ?? null) as PlotRow | null
  const sellerId = propertyRow.seller_id ?? plotRow?.seller_id ?? null
  const { data: seller } = sellerId
    ? await supabase.from('sellers').select('id,profile_id,verification_status').eq('id', sellerId).maybeSingle()
    : { data: null }
  const sellerRow = (seller ?? null) as SellerRow | null
  const blockedReason = isPublishable(propertyRow, plotRow, sellerRow)

  const existing = await supabase
    .from('listings')
    .select('id')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const listingId = existing.data?.id ?? null

  if (blockedReason) {
    if (listingId) {
      const { error } = await supabase
        .from('listings')
        .update({
          is_published: false,
          approval_status: propertyRow.verification_status ?? 'submitted',
          verified_by: actorId,
        })
        .eq('id', listingId)

      if (error) throw error
    }

    await notifyListingPublication(supabase, {
      recipientId: sellerRow?.profile_id ?? propertyRow.owner_profile_id,
      actorId,
      published: false,
      property: propertyRow,
      listingId,
      reason: blockedReason,
    })

    return { listingId, published: false, reason: blockedReason }
  }

  const now = new Date().toISOString()
  const payload = {
    owner_id: propertyRow.owner_profile_id,
    property_id: propertyRow.id,
    seller_id: sellerId,
    plot_id: plotRow?.id ?? null,
    plot_number: plotRow?.plot_number || propertyRow.title || `PK-${propertyRow.id.slice(0, 8)}`,
    location: plotRow?.location || propertyRow.city || propertyRow.address || 'Location under review',
    size_sq_yards: Number(plotRow?.sq_yards ?? 0),
    size_label: formatSize(plotRow),
    facing: toFacing(plotRow?.facing),
    corner_plot: Boolean(plotRow?.corner_plot),
    premium: false,
    price_lakhs: Number(plotRow?.current_value_lakhs ?? 0),
    price_display: formatPrice(plotRow),
    status: 'Active',
    property_kind: propertyRow.property_kind === 'apartment' ? 'apartment' : 'plot',
    approval_status: 'approved',
    is_published: true,
    verified_at: now,
    verified_by: actorId,
    published_at: now,
  }

  let publishedListingId = listingId

  if (listingId) {
    const { data, error } = await supabase.from('listings').update(payload).eq('id', listingId).select('id').single()
    if (error) throw error
    publishedListingId = data.id
  } else {
    const { data, error } = await supabase.from('listings').insert(payload).select('id').single()
    if (error) throw error
    publishedListingId = data.id
  }

  await notifyListingPublication(supabase, {
    recipientId: sellerRow?.profile_id ?? propertyRow.owner_profile_id,
    actorId,
    published: true,
    property: propertyRow,
    listingId: publishedListingId,
    reason: 'approved',
  })

  return { listingId: publishedListingId, published: true, reason: 'approved' }
}

export async function syncVerifiedListingsForSeller(
  supabase: SupabaseAdminLike,
  sellerId: string,
  actorId: string | null,
) {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id')
    .eq('seller_id', sellerId)
    .limit(200)

  if (error) throw error

  const results: PublishResult[] = []
  for (const property of properties ?? []) {
    results.push(await syncVerifiedListingForProperty(supabase, property.id, actorId))
  }

  return results
}
