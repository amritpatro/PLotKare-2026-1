import type { Facing } from '@/lib/plotkare-storage'

export type PropertyKind = 'plot' | 'apartment'

export type PublicPlotListing = {
  id: string
  plotNumber: string
  location: string
  corridor?: string | null
  sizeSqYards: number
  sizeLabel: string
  facing: Facing
  cornerPlot: boolean
  premium: boolean
  priceLakhs: number
  priceDisplay: string
  imageUrl: string
  imageUrls: string[]
  status: 'Active' | 'Sold' | 'featured' | 'archived' | 'Featured' | 'Archived'
  verified?: boolean
  inquiriesCount: number
  propertyKind: PropertyKind
  bhk?: number
  floorLabel?: string
  sellerName?: string
  sellerPhone?: string | null
}

export const STORAGE_PUBLIC_LISTINGS = 'plotkare_public_listings'

const LISTING_IMAGES = {
  plot: '/images/listings/plot-coastal.svg',
  premiumPlot: '/images/listings/plot-premium.svg',
  apartment: '/images/listings/apartment-tower.svg',
  town: '/images/listings/plot-town.svg',
} as const

function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src)
}

export function getLocalListingImage(listing: {
  id?: string
  propertyKind?: PropertyKind
  premium?: boolean
  imageUrl?: string
}) {
  if (listing.imageUrl) return listing.imageUrl
  if (listing.propertyKind === 'apartment') return LISTING_IMAGES.apartment
  if (listing.premium) return LISTING_IMAGES.premiumPlot
  if (listing.id?.includes('and') || listing.id?.includes('pnd')) return LISTING_IMAGES.town
  return LISTING_IMAGES.plot
}

export const DEFAULT_PUBLIC_LISTINGS: PublicPlotListing[] = [
  {
    id: 'plt-bhp-021',
    plotNumber: 'PLT-BHP-021',
    location: 'Bheemunipatnam Phase 3',
    sizeSqYards: 200,
    sizeLabel: '200 sq yards',
    facing: 'East',
    cornerPlot: true,
    premium: false,
    priceLakhs: 72,
    priceDisplay: 'Consult after verification',
    imageUrl: LISTING_IMAGES.plot,
    imageUrls: [LISTING_IMAGES.plot],
    status: 'Active',
    verified: true,
    inquiriesCount: 2,
    propertyKind: 'plot',
    sellerName: 'PlotKare Seller',
    sellerPhone: null,
  },
  {
    id: 'plt-kmd-008',
    plotNumber: 'PLT-KMD-008',
    location: 'Kommadi Extension',
    sizeSqYards: 300,
    sizeLabel: '300 sq yards',
    facing: 'North',
    cornerPlot: false,
    premium: true,
    priceLakhs: 95,
    priceDisplay: 'Consult after verification',
    imageUrl: LISTING_IMAGES.premiumPlot,
    imageUrls: [LISTING_IMAGES.premiumPlot],
    status: 'Active',
    verified: true,
    inquiriesCount: 5,
    propertyKind: 'plot',
    sellerName: 'PlotKare Seller',
    sellerPhone: null,
  },
  {
    id: 'apt-rk-204',
    plotNumber: 'APT-RK-204',
    location: 'RK Beach — gated tower',
    sizeSqYards: 0,
    sizeLabel: '1,650 sq ft',
    facing: 'East',
    cornerPlot: false,
    premium: true,
    priceLakhs: 135,
    priceDisplay: 'Consult after verification',
    imageUrl: LISTING_IMAGES.apartment,
    imageUrls: [LISTING_IMAGES.apartment],
    status: 'Active',
    verified: true,
    inquiriesCount: 3,
    propertyKind: 'apartment',
    bhk: 3,
    floorLabel: '12th floor',
    sellerName: 'PlotKare Seller',
    sellerPhone: null,
  },
  {
    id: 'plt-and-034',
    plotNumber: 'PLT-AND-034',
    location: 'Anakapalle New Town',
    sizeSqYards: 150,
    sizeLabel: '150 sq yards',
    facing: 'West',
    cornerPlot: false,
    premium: false,
    priceLakhs: 48,
    priceDisplay: 'Consult after verification',
    imageUrl: LISTING_IMAGES.town,
    imageUrls: [LISTING_IMAGES.town],
    status: 'Active',
    verified: true,
    inquiriesCount: 1,
    propertyKind: 'plot',
    sellerName: 'PlotKare Seller',
    sellerPhone: null,
  },
  {
    id: 'plt-pnd-017',
    plotNumber: 'PLT-PND-017',
    location: 'Pendurthi Layout',
    sizeSqYards: 240,
    sizeLabel: '240 sq yards',
    facing: 'South',
    cornerPlot: false,
    premium: false,
    priceLakhs: 68,
    priceDisplay: 'Consult after verification',
    imageUrl: LISTING_IMAGES.town,
    imageUrls: [LISTING_IMAGES.town],
    status: 'Active',
    verified: true,
    inquiriesCount: 0,
    propertyKind: 'plot',
    sellerName: 'PlotKare Seller',
    sellerPhone: null,
  },
]

function normalizeListing(raw: Record<string, unknown>): PublicPlotListing | null {
  const id = raw.id != null ? String(raw.id) : null
  if (!id) return null
  const base = DEFAULT_PUBLIC_LISTINGS.find((p) => p.id === id)
  const plotNumber = String(raw.plotNumber ?? base?.plotNumber ?? '')
  const location = String(raw.location ?? base?.location ?? '')
  const sizeSqYards = Number(raw.sizeSqYards ?? base?.sizeSqYards ?? 0) || 0
  const facing = (raw.facing as Facing) || base?.facing || 'East'
  const cornerPlot = Boolean(raw.cornerPlot ?? base?.cornerPlot ?? false)
  const premium = Boolean(raw.premium ?? base?.premium ?? false)
  const priceLakhs = Number(raw.priceLakhs ?? base?.priceLakhs ?? 0) || 0
  const rawStatus = raw.status != null ? String(raw.status) : base?.status ?? 'Active'
  const status =
    rawStatus === 'Sold' || rawStatus === 'Active' || rawStatus === 'featured' || rawStatus === 'archived' || rawStatus === 'Featured' || rawStatus === 'Archived'
      ? rawStatus
      : base?.status ?? 'Active'
  const propertyKind =
    raw.propertyKind === 'apartment' || raw.propertyKind === 'plot'
      ? raw.propertyKind
      : base?.propertyKind ?? 'plot'
  const fallbackImageUrl = getLocalListingImage({
    id,
    propertyKind,
    premium,
    imageUrl: String(raw.imageUrl ?? base?.imageUrl ?? ''),
  })
  const rawImageUrls = Array.isArray(raw.imageUrls)
    ? raw.imageUrls.map((value) => String(value)).filter(Boolean)
    : []
  const imageUrls = rawImageUrls.length
    ? rawImageUrls.map((imageUrl) => getLocalListingImage({ id, propertyKind, premium, imageUrl }))
    : [fallbackImageUrl]

  return {
    id,
    plotNumber,
    location,
    corridor: raw.corridor != null ? String(raw.corridor) : base?.corridor ?? null,
    sizeSqYards,
    sizeLabel: String(raw.sizeLabel ?? base?.sizeLabel ?? `${sizeSqYards} sq yards`),
    facing,
    cornerPlot,
    premium,
    priceLakhs,
    priceDisplay: String(raw.priceDisplay ?? base?.priceDisplay ?? 'Consult after verification'),
    imageUrl: imageUrls[0],
    imageUrls,
    status,
    verified: Boolean(raw.verified ?? base?.verified ?? true),
    inquiriesCount: Number(raw.inquiriesCount ?? 0) || 0,
    propertyKind,
    bhk: raw.bhk != null ? Number(raw.bhk) : base?.bhk,
    floorLabel: raw.floorLabel != null ? String(raw.floorLabel) : base?.floorLabel,
    sellerName: raw.sellerName != null ? String(raw.sellerName) : base?.sellerName ?? undefined,
    sellerPhone: raw.sellerPhone != null ? String(raw.sellerPhone) : base?.sellerPhone ?? null,
  }
}

export function loadPublicListings(): PublicPlotListing[] {
  if (typeof window === 'undefined') return DEFAULT_PUBLIC_LISTINGS
  try {
    const raw = localStorage.getItem(STORAGE_PUBLIC_LISTINGS)
    if (!raw) return [...DEFAULT_PUBLIC_LISTINGS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_PUBLIC_LISTINGS]
    const rows = parsed
      .map((p) =>
        typeof p === 'object' && p !== null ? normalizeListing(p as Record<string, unknown>) : null,
      )
      .filter(Boolean) as PublicPlotListing[]
    return rows.length ? rows : [...DEFAULT_PUBLIC_LISTINGS]
  } catch {
    return [...DEFAULT_PUBLIC_LISTINGS]
  }
}

export function savePublicListings(listings: PublicPlotListing[]) {
  localStorage.setItem(
    STORAGE_PUBLIC_LISTINGS,
    JSON.stringify(
      listings.map((listing) => ({
        ...listing,
        imageUrl: getLocalListingImage(listing),
        imageUrls: listing.imageUrls.length
          ? listing.imageUrls.map((imageUrl) => getLocalListingImage({ ...listing, imageUrl }))
          : [getLocalListingImage(listing)],
      })),
    ),
  )
  window.dispatchEvent(new Event('plotkare-listings-changed'))
}

export type ListingFilter =
  | 'All Plots'
  | 'Verified Plots'
  | 'Site Visit Ready'
  | 'Corner Plots'
  | 'Apartments'

export function filterPublicListings(
  listings: PublicPlotListing[],
  filter: ListingFilter,
): PublicPlotListing[] {
  const active = listings.filter((p) => ['active', 'featured'].includes(p.status.toLowerCase()))
  if (filter === 'Verified Plots') return active.filter((p) => p.propertyKind === 'plot' && p.verified !== false)
  if (filter === 'Site Visit Ready') return active
  if (filter === 'Corner Plots') return active.filter((p) => p.cornerPlot)
  if (filter === 'Apartments') return active.filter((p) => p.propertyKind === 'apartment')
  return active
}

/** First three active listings for the landing page row */
export function getLandingShowcaseListings(listings: PublicPlotListing[]): PublicPlotListing[] {
  return listings.filter((p) => ['active', 'featured'].includes(p.status.toLowerCase()) && p.verified !== false).slice(0, 3)
}
