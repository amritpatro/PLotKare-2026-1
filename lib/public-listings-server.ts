import { getLocalListingImage, type PublicPlotListing } from '@/lib/public-listings'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Facing } from '@/lib/plotkare-storage'

type ListingRow = {
  id: string
  property_id: string | null
  seller_id: string | null
  plot_id: string | null
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

type SellerRow = {
  id: string
  profile_id: string
  company_name: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

type PropertyRow = {
  id: string
  title: string | null
  city: string | null
  address: string | null
  lifecycle_status: string | null
  verification_status: string | null
}

type PlotStateRow = {
  id: string
  lifecycle_status: string | null
  status: string | null
  verification_status: string | null
}

type DocumentRow = {
  id: string
  property_id: string | null
  plot_id: string | null
  bucket: string
  object_path: string
  mime_type: string | null
  uploaded_by: string | null
}

function toFacing(value: string | null): Facing {
  if (value === 'North' || value === 'South' || value === 'West') return value
  return 'East'
}

function toPublicListing(
  row: ListingRow,
  options: {
    sellerName?: string
    sellerPhone?: string | null
    corridor?: string | null
    imageUrls: string[]
  },
): PublicPlotListing {
  const propertyKind = row.property_kind === 'apartment' ? 'apartment' : 'plot'
  const premium = Boolean(row.premium)
  const sizeSqYards = Number(row.size_sq_yards ?? 0)
  const fallbackImage = getLocalListingImage({
    id: row.id,
    propertyKind,
    premium,
    imageUrl: row.image_path ?? undefined,
  })
  const imageUrls = options.imageUrls.length ? options.imageUrls : [fallbackImage]

  function normalizeStatus(raw: string | null) {
    const s = (raw ?? 'Active').toString()
    const key = s.toLowerCase()
    if (key === 'active') return 'Active' as const
    if (key === 'sold') return 'Sold' as const
    if (key === 'featured') return 'featured' as const
    if (key === 'archived') return 'archived' as const
    return 'Active' as const
  }

  return {
    id: row.id,
    plotNumber: row.plot_number || `PK-${row.id.slice(0, 8)}`,
    location: row.location || 'Location under verification',
    corridor: options.corridor ?? null,
    sizeSqYards,
    sizeLabel: row.size_label || (sizeSqYards > 0 ? `${sizeSqYards.toLocaleString('en-IN')} sq yards` : 'Size verified on request'),
    facing: toFacing(row.facing),
    cornerPlot: Boolean(row.corner_plot),
    premium,
    priceLakhs: Number(row.price_lakhs ?? 0),
    priceDisplay: row.price_display || 'Consult after verification',
    imageUrl: imageUrls[0],
    imageUrls,
    status: normalizeStatus(row.status),
    verified: true,
    inquiriesCount: Number(row.inquiries_count ?? 0),
    propertyKind,
    bhk: row.bhk ?? undefined,
    floorLabel: row.floor_label ?? undefined,
    sellerName: options.sellerName,
    sellerPhone: options.sellerPhone ?? null,
  }
}

export async function getVerifiedPublicListings(limit?: number): Promise<PublicPlotListing[]> {
  const admin = createSupabaseAdminClient()
  let query = admin
    .from('listings')
    .select('id,property_id,seller_id,plot_id,plot_number,location,size_sq_yards,size_label,facing,corner_plot,premium,price_lakhs,price_display,image_path,status,inquiries_count,property_kind,bhk,floor_label')
    .eq('approval_status', 'approved')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data, error } = await query
  if (error) {
    console.error('Verified public listings fetch failed:', error)
    return []
  }

  const rows = (data ?? []) as ListingRow[]
  // Filter client-side to avoid passing enum labels that might not exist
  const statusFilteredRows = rows.filter((r) => ['active', 'featured'].includes((r.status ?? '').toString().toLowerCase()))
  const propertyIds = Array.from(new Set(statusFilteredRows.map((row) => row.property_id).filter(Boolean))) as string[]
  const plotIds = Array.from(new Set(statusFilteredRows.map((row) => row.plot_id).filter(Boolean))) as string[]

  const [{ data: properties }, { data: plots }] = await Promise.all([
    propertyIds.length
      ? admin.from('properties').select('id,title,city,address,lifecycle_status,verification_status').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
    plotIds.length
      ? admin.from('plots').select('id,lifecycle_status,status,verification_status').in('id', plotIds)
      : Promise.resolve({ data: [] }),
  ])

  const propertyById = new Map(((properties ?? []) as PropertyRow[]).map((row) => [row.id, row]))
  const plotById = new Map(((plots ?? []) as PlotStateRow[]).map((row) => [row.id, row]))
  const filteredRows = statusFilteredRows.filter((row) => {
    const property = row.property_id ? propertyById.get(row.property_id) : null
    const plot = row.plot_id ? plotById.get(row.plot_id) : null
    const propertyLifecycle = property?.lifecycle_status?.toLowerCase() ?? ''
    const plotLifecycle = plot?.lifecycle_status?.toLowerCase() ?? ''
    const plotStatus = plot?.status?.toLowerCase() ?? ''

    if (['archived', 'sold', 'reserved'].includes(propertyLifecycle)) return false
    if (['archived', 'sold', 'reserved'].includes(plotLifecycle)) return false
    if (['archived', 'sold', 'reserved'].includes(plotStatus)) return false
    return true
  })
  const sellerIds = Array.from(new Set(filteredRows.map((row) => row.seller_id).filter(Boolean))) as string[]

  const { data: sellers } = sellerIds.length
    ? await admin.from('sellers').select('id,profile_id,company_name').in('id', sellerIds)
    : { data: [] }

  const sellerRows = (sellers ?? []) as SellerRow[]
  const sellerProfileIds = Array.from(new Set(sellerRows.map((row) => row.profile_id)))
  const { data: profiles } = sellerProfileIds.length
    ? await admin.from('profiles').select('id,full_name,phone').in('id', sellerProfileIds)
    : { data: [] }

  const sellerById = new Map(sellerRows.map((row) => [row.id, row]))
  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((row) => [row.id, row]))

  const documentRows: DocumentRow[] = []
  if (propertyIds.length) {
    const { data: docs } = await admin
      .from('property_documents')
      .select('id,property_id,plot_id,bucket,object_path,mime_type,uploaded_by')
      .eq('document_type', 'property_photo')
      .in('property_id', propertyIds)
    if (docs) documentRows.push(...(docs as DocumentRow[]))
  }
  if (plotIds.length) {
    const { data: docs } = await admin
      .from('property_documents')
      .select('id,property_id,plot_id,bucket,object_path,mime_type,uploaded_by')
      .eq('document_type', 'property_photo')
      .in('plot_id', plotIds)
    if (docs) documentRows.push(...(docs as DocumentRow[]))
  }

  const signedUrlMap = new Map<string, string>()
  const toSign = documentRows.filter((doc) => (doc.mime_type ?? '').startsWith('image/'))
  await Promise.all(
    toSign.map(async (doc) => {
      const { data: signed } = await admin.storage.from(doc.bucket).createSignedUrl(doc.object_path, 900)
      if (signed?.signedUrl) {
        signedUrlMap.set(doc.id, signed.signedUrl)
      }
    }),
  )

  const docsByProperty = new Map<string, DocumentRow[]>()
  const docsByPlot = new Map<string, DocumentRow[]>()
  for (const doc of toSign) {
    if (doc.property_id) {
      const list = docsByProperty.get(doc.property_id) ?? []
      list.push(doc)
      docsByProperty.set(doc.property_id, list)
    }
    if (doc.plot_id) {
      const list = docsByPlot.get(doc.plot_id) ?? []
      list.push(doc)
      docsByPlot.set(doc.plot_id, list)
    }
  }

  return filteredRows.map((row) => {
    const seller = row.seller_id ? sellerById.get(row.seller_id) : undefined
    const sellerProfile = seller ? profileById.get(seller.profile_id) : undefined
    const property = row.property_id ? propertyById.get(row.property_id) : undefined
    const sellerProfileId = seller?.profile_id
    const docList = [
      ...(row.property_id ? docsByProperty.get(row.property_id) ?? [] : []),
      ...(row.plot_id ? docsByPlot.get(row.plot_id) ?? [] : []),
    ].filter((doc) => !sellerProfileId || doc.uploaded_by === sellerProfileId)
    const imageUrls = docList.map((doc) => signedUrlMap.get(doc.id)).filter(Boolean) as string[]

    if (row.image_path) {
      imageUrls.unshift(row.image_path)
    }

    return toPublicListing(row, {
      sellerName: sellerProfile?.full_name || seller?.company_name || 'PlotKare Seller',
      sellerPhone: sellerProfile?.phone ?? null,
      corridor: property?.city || property?.address || null,
      imageUrls,
    })
  })
}
