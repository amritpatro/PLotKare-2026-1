export type AmenityCost =
  | { kind: 'monthly'; amount: number }
  | { kind: 'one-time'; amount: number }

export type AmenityCatalogItem = {
  id: string
  name: string
  category: string
  image: string
  isLocalImage?: boolean
  description?: string
  suitableFor?: string
  areaRange?: string
} & AmenityCost

const AMENITY_IMAGES = {
  income: '/images/amenities/income.svg',
  protection: '/images/amenities/protection.svg',
  growth: '/images/amenities/growth.svg',
  security: '/images/amenities/security.svg',
  utility: '/images/amenities/utility.svg',
  lifestyle: '/images/amenities/lifestyle.svg',
  boundaryFencing: '/images/amenities/real/boundary-fencing.jpg',
  cctv: '/images/amenities/real/cctv-installation.jpg',
  containerFarming: '/images/amenities/real/container-farming.jpg',
  dripIrrigation: '/images/amenities/real/drip-irrigation.jpg',
  herbalGarden: '/images/amenities/real/herbal-garden.jpg',
  legalSignboard: '/images/amenities/real/legal-sign-boards.jpg',
  mushroomKit: '/images/amenities/real/mushroom-kit.jpg',
  rainwater: '/images/amenities/real/rainwater-harvesting.jpg',
  solarPanel: '/images/amenities/real/solar-panel.jpg',
  storageSpace: '/images/amenities/real/storage-space.jpg',
} as const

export const AMENITY_CATALOG: AmenityCatalogItem[] = [
  { id: 'container-farming', name: 'Container Farming Lease', category: 'Income Generation', image: AMENITY_IMAGES.containerFarming, isLocalImage: true, kind: 'monthly', amount: 800 },
  {
    id: 'mushroom-kit',
    name: 'Mushroom Kit Cultivation',
    category: 'Income Generation',
    image: AMENITY_IMAGES.mushroomKit,
    isLocalImage: true,
    kind: 'monthly',
    amount: 1200,
  },
  { id: 'solar-panel', name: 'Solar Panel Hosting', category: 'Income Generation', image: AMENITY_IMAGES.solarPanel, isLocalImage: true, kind: 'monthly', amount: 1500 },
  { id: 'flower-bed', name: 'Flower Bed Maintenance', category: 'Aesthetic', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 300 },
  { id: 'swing-set', name: 'Swing Set Installation', category: 'Lifestyle', image: AMENITY_IMAGES.lifestyle, isLocalImage: true, kind: 'monthly', amount: 400 },
  { id: 'boundary-fencing', name: 'Boundary Fencing', category: 'Protection', image: AMENITY_IMAGES.boundaryFencing, isLocalImage: true, kind: 'one-time', amount: 15000 },
  { id: 'security-light', name: 'Security Light Installation', category: 'Security', image: AMENITY_IMAGES.security, isLocalImage: true, kind: 'one-time', amount: 3500 },
  { id: 'cctv', name: 'CCTV Camera Setup', category: 'Security', image: AMENITY_IMAGES.cctv, isLocalImage: true, kind: 'one-time', amount: 8000 },
  { id: 'rainwater', name: 'Rainwater Harvesting Pit', category: 'Utility', image: AMENITY_IMAGES.rainwater, isLocalImage: true, kind: 'one-time', amount: 12000 },
  { id: 'compost', name: 'Compost Unit', category: 'Farming', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 200 },
  { id: 'herbal-garden', name: 'Herbal Garden', category: 'Farming', image: AMENITY_IMAGES.herbalGarden, isLocalImage: true, kind: 'monthly', amount: 500 },
  { id: 'butterfly-garden', name: 'Butterfly Garden', category: 'Aesthetic', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 150 },
  { id: 'outdoor-gym', name: 'Outdoor Gym Equipment', category: 'Lifestyle', image: AMENITY_IMAGES.lifestyle, isLocalImage: true, kind: 'one-time', amount: 25000 },
  { id: 'drip-irrigation', name: 'Drip Irrigation Setup', category: 'Utility', image: AMENITY_IMAGES.dripIrrigation, isLocalImage: true, kind: 'one-time', amount: 8000 },
  { id: 'portable-storage', name: 'Portable Storage Unit', category: 'Utility', image: AMENITY_IMAGES.storageSpace, isLocalImage: true, kind: 'monthly', amount: 600 },
  { id: 'bamboo-grove', name: 'Bamboo Grove', category: 'Aesthetic', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 400 },
  { id: 'vermi', name: 'Vermi Composting Bed', category: 'Farming', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 350 },
  { id: 'aquaponics', name: 'Aquaponics Tank', category: 'Income Generation', image: AMENITY_IMAGES.income, isLocalImage: true, kind: 'monthly', amount: 2000 },
  { id: 'event-space', name: 'Event Space Rental Setup', category: 'Income Generation', image: AMENITY_IMAGES.income, isLocalImage: true, kind: 'monthly', amount: 3000 },
  { id: 'legal-signboard', name: 'Legal Signboard Installation', category: 'Protection', image: AMENITY_IMAGES.legalSignboard, isLocalImage: true, kind: 'one-time', amount: 2000 },
]

export function getAmenityById(id: string) {
  return AMENITY_CATALOG.find((a) => a.id === id)
}

export function getAmenityByName(name: string) {
  return AMENITY_CATALOG.find((a) => a.name === name)
}

const amenityDetails: Record<string, Pick<AmenityCatalogItem, 'description' | 'suitableFor' | 'areaRange'>> = {
  'container-farming': {
    description: 'A managed container-based cultivation setup for unused plot corners where access, water, and basic supervision are available.',
    suitableFor: 'Vacant plots near road access, peri-urban land, income-focused owners',
    areaRange: 'Approx. 250-600 sq. yards clear usable patch',
  },
  'mushroom-kit': {
    description: 'Small-format shaded cultivation support with setup guidance, monitoring, and harvest coordination through PlotKare partners.',
    suitableFor: 'Covered/shaded spaces, farm-side plots, owners testing low-footprint income options',
    areaRange: 'Approx. 80-200 sq. yards or covered utility area',
  },
  'solar-panel': {
    description: 'Solar hosting feasibility review and partner coordination for open plots with strong sunlight and safe access.',
    suitableFor: 'Open plots, commercial edges, long-hold land assets',
    areaRange: 'Approx. 500+ sq. yards depending on shadow and access',
  },
  'boundary-fencing': {
    description: 'Perimeter fencing consultation for physical protection, encroachment deterrence, and clearer site boundaries.',
    suitableFor: 'Vacant plots, disputed edges, remote owner properties',
    areaRange: 'Any plot size after boundary measurement',
  },
  cctv: {
    description: 'Camera placement, site power/network feasibility, and monitoring setup for higher-risk plots and assets.',
    suitableFor: 'Road-facing plots, construction sites, high-value properties',
    areaRange: 'Approx. 120+ sq. yards with mounting and power access',
  },
  rainwater: {
    description: 'Rainwater harvesting pit consultation based on soil, slope, access, and property usage pattern.',
    suitableFor: 'Owners planning agriculture, gardens, or long-term land care',
    areaRange: 'Approx. 150+ sq. yards with safe pit location',
  },
  'drip-irrigation': {
    description: 'Water-efficient irrigation layout for garden, herbal, or small cultivation areas.',
    suitableFor: 'Managed gardens, farming patches, semi-urban plots',
    areaRange: 'Approx. 100-1000 sq. yards cultivated area',
  },
  'herbal-garden': {
    description: 'Managed herbal planting plan with basic maintenance coordination and periodic site checks.',
    suitableFor: 'Residential plots, farm plots, owners wanting low-maintenance green use',
    areaRange: 'Approx. 100-400 sq. yards',
  },
  'legal-signboard': {
    description: 'Ownership and warning signboard placement to communicate verified ownership and discourage misuse.',
    suitableFor: 'Vacant land, newly purchased plots, properties under monitoring',
    areaRange: 'Any plot size with visible frontage',
  },
  'portable-storage': {
    description: 'Temporary storage feasibility for construction materials, maintenance tools, or site operations.',
    suitableFor: 'Construction-ready plots, service teams, owners preparing development',
    areaRange: 'Approx. 100+ sq. yards with vehicle access',
  },
}

export function getAmenityDisplayDetails(id: string) {
  return (
    amenityDetails[id] ?? {
      description: 'PlotKare reviews the site, access, safety, and owner goals before recommending this managed amenity.',
      suitableFor: 'Owner-approved plots after verification and feasibility review',
      areaRange: 'Depends on property layout, access, and usable open area',
    }
  )
}
