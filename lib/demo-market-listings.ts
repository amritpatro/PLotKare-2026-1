export type MarketListing = {
  id: string
  plotNumber: string
  location: string
  sizeSqYards: number
  facing: 'East' | 'West' | 'North' | 'South'
  cornerPlot?: boolean
  priceLakhs: number
  imageUrl: string
  premiumBadge?: boolean
}

const STORAGE_KEY = 'plotkare_market_listings'

const MARKET_IMAGES = {
  plot: '/images/listings/plot-coastal.svg',
  premium: '/images/listings/plot-premium.svg',
  town: '/images/listings/plot-town.svg',
} as const

function localMarketImage(listing: Pick<MarketListing, 'id' | 'premiumBadge' | 'imageUrl'>) {
  if (listing.imageUrl && !/^https?:\/\//i.test(listing.imageUrl)) return listing.imageUrl
  if (listing.premiumBadge) return MARKET_IMAGES.premium
  if (listing.id.includes('and') || listing.id.includes('pnd')) return MARKET_IMAGES.town
  return MARKET_IMAGES.plot
}

export const DEFAULT_MARKET_LISTINGS: MarketListing[] = [
  {
    id: 'demo-bhp-021',
    plotNumber: 'PLT-BHP-021',
    location: 'Bheemunipatnam Phase 3',
    sizeSqYards: 200,
    facing: 'East',
    cornerPlot: true,
    priceLakhs: 72,
    imageUrl: MARKET_IMAGES.plot,
  },
  {
    id: 'demo-kmd-008',
    plotNumber: 'PLT-KMD-008',
    location: 'Kommadi Extension',
    sizeSqYards: 300,
    facing: 'North',
    priceLakhs: 95,
    premiumBadge: true,
    imageUrl: MARKET_IMAGES.premium,
  },
  {
    id: 'demo-and-034',
    plotNumber: 'PLT-AND-034',
    location: 'Anakapalle New Town',
    sizeSqYards: 150,
    facing: 'West',
    priceLakhs: 48,
    imageUrl: MARKET_IMAGES.town,
  },
  {
    id: 'demo-pnd-017',
    plotNumber: 'PLT-PND-017',
    location: 'Pendurthi Layout',
    sizeSqYards: 240,
    facing: 'South',
    priceLakhs: 68,
    imageUrl: MARKET_IMAGES.town,
  },
]

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('plotkare-market-listings-changed'))
  }
}

export function loadMarketListings(): MarketListing[] {
  if (typeof window === 'undefined') return DEFAULT_MARKET_LISTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_MARKET_LISTINGS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_MARKET_LISTINGS]
    }
    return (parsed as MarketListing[]).map((listing) => ({
      ...listing,
      imageUrl: localMarketImage(listing),
    }))
  } catch {
    return [...DEFAULT_MARKET_LISTINGS]
  }
}

export function saveMarketListings(list: MarketListing[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(list.map((listing) => ({ ...listing, imageUrl: localMarketImage(listing) }))),
  )
  emit()
}

export function formatConsultationPrice(_value: number): string {
  return 'Consult after verification'
}

export type ListingFilter = 'All Plots' | 'Verified Plots' | 'Site Visit Ready' | 'Corner Plots'

export function filterMarketListings(
  list: MarketListing[],
  filter: ListingFilter,
): MarketListing[] {
  if (filter === 'Verified Plots') return list
  if (filter === 'Site Visit Ready') return list
  if (filter === 'Corner Plots') return list.filter((p) => p.cornerPlot)
  return list
}
