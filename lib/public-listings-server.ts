import { getLocalListingImage, type PublicPlotListing } from '@/lib/public-listings'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Facing } from '@/lib/plotkare-storage'

type ListingRow = {
  id: string
  plot_number: string | null
  location: string | null
  size_sq_yards: number | null
  size_label: string | null
  facing: string | null
  corner_plot: boolean | null
  premium: boolean | null
  price_lakhs: number | null
  price_display: string | null
  image_path: string | null
  status: string | null
  inquiries_count: number | null
  property_kind: string | null
  bhk: number | null
  floor_label: string | null
}

function toFacing(value: string | null): Facing {
  if (value === 'North' || value === 'South' || value === 'West') return value
  return 'East'
}

function toPublicListing(row: ListingRow): PublicPlotListing {
  const propertyKind = row.property_kind === 'apartment' ? 'apartment' : 'plot'
  const premium = Boolean(row.premium)
  const sizeSqYards = Number(row.size_sq_yards ?? 0)
  const imageUrl = getLocalListingImage({
    id: row.id,
    propertyKind,
    premium,
    imageUrl: row.image_path ?? undefined,
  })

  return {
    id: row.id,
    plotNumber: row.plot_number || `PK-${row.id.slice(0, 8)}`,
    location: row.location || 'Location under verification',
    sizeSqYards,
    sizeLabel: row.size_label || (sizeSqYards > 0 ? `${sizeSqYards.toLocaleString('en-IN')} sq yards` : 'Size verified on request'),
    facing: toFacing(row.facing),
    cornerPlot: Boolean(row.corner_plot),
    premium,
    priceLakhs: Number(row.price_lakhs ?? 0),
    priceDisplay: row.price_display || 'Consult after verification',
    imageUrl,
    status: row.status === 'Sold' ? 'Sold' : 'Active',
    verified: true,
    inquiriesCount: Number(row.inquiries_count ?? 0),
    propertyKind,
    bhk: row.bhk ?? undefined,
    floorLabel: row.floor_label ?? undefined,
  }
}

export async function getVerifiedPublicListings(limit?: number): Promise<PublicPlotListing[]> {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('listings')
    .select('id,plot_number,location,size_sq_yards,size_label,facing,corner_plot,premium,price_lakhs,price_display,image_path,status,inquiries_count,property_kind,bhk,floor_label')
    .eq('status', 'Active')
    .eq('approval_status', 'approved')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data, error } = await query
  if (error) {
    console.error('Verified public listings fetch failed:', error)
    return []
  }

  return ((data ?? []) as ListingRow[]).map(toPublicListing)
}
