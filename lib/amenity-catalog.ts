export type AmenityCost =
  | { kind: 'monthly'; amount: number }
  | { kind: 'one-time'; amount: number }

export type AmenityCatalogItem = {
  id: string
  name: string
  category: string
  image: string
  isLocalImage?: boolean
} & AmenityCost

const AMENITY_IMAGES = {
  income: '/images/amenities/income.svg',
  protection: '/images/amenities/protection.svg',
  growth: '/images/amenities/growth.svg',
  security: '/images/amenities/security.svg',
  utility: '/images/amenities/utility.svg',
  lifestyle: '/images/amenities/lifestyle.svg',
} as const

export const AMENITY_CATALOG: AmenityCatalogItem[] = [
  { id: 'container-farming', name: 'Container Farming Lease', category: 'Income Generation', image: AMENITY_IMAGES.income, isLocalImage: true, kind: 'monthly', amount: 800 },
  {
    id: 'mushroom-kit',
    name: 'Mushroom Kit Cultivation',
    category: 'Income Generation',
    image: AMENITY_IMAGES.income,
    isLocalImage: true,
    kind: 'monthly',
    amount: 1200,
  },
  { id: 'solar-panel', name: 'Solar Panel Hosting', category: 'Income Generation', image: AMENITY_IMAGES.income, isLocalImage: true, kind: 'monthly', amount: 1500 },
  { id: 'flower-bed', name: 'Flower Bed Maintenance', category: 'Aesthetic', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 300 },
  { id: 'swing-set', name: 'Swing Set Installation', category: 'Lifestyle', image: AMENITY_IMAGES.lifestyle, isLocalImage: true, kind: 'monthly', amount: 400 },
  { id: 'boundary-fencing', name: 'Boundary Fencing', category: 'Protection', image: AMENITY_IMAGES.protection, isLocalImage: true, kind: 'one-time', amount: 15000 },
  { id: 'security-light', name: 'Security Light Installation', category: 'Security', image: AMENITY_IMAGES.security, isLocalImage: true, kind: 'one-time', amount: 3500 },
  { id: 'cctv', name: 'CCTV Camera Setup', category: 'Security', image: AMENITY_IMAGES.security, isLocalImage: true, kind: 'one-time', amount: 8000 },
  { id: 'rainwater', name: 'Rainwater Harvesting Pit', category: 'Utility', image: AMENITY_IMAGES.utility, isLocalImage: true, kind: 'one-time', amount: 12000 },
  { id: 'compost', name: 'Compost Unit', category: 'Farming', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 200 },
  { id: 'herbal-garden', name: 'Herbal Garden', category: 'Farming', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 500 },
  { id: 'butterfly-garden', name: 'Butterfly Garden', category: 'Aesthetic', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 150 },
  { id: 'outdoor-gym', name: 'Outdoor Gym Equipment', category: 'Lifestyle', image: AMENITY_IMAGES.lifestyle, isLocalImage: true, kind: 'one-time', amount: 25000 },
  { id: 'drip-irrigation', name: 'Drip Irrigation Setup', category: 'Utility', image: AMENITY_IMAGES.utility, isLocalImage: true, kind: 'one-time', amount: 8000 },
  { id: 'portable-storage', name: 'Portable Storage Unit', category: 'Utility', image: AMENITY_IMAGES.utility, isLocalImage: true, kind: 'monthly', amount: 600 },
  { id: 'bamboo-grove', name: 'Bamboo Grove', category: 'Aesthetic', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 400 },
  { id: 'vermi', name: 'Vermi Composting Bed', category: 'Farming', image: AMENITY_IMAGES.growth, isLocalImage: true, kind: 'monthly', amount: 350 },
  { id: 'aquaponics', name: 'Aquaponics Tank', category: 'Income Generation', image: AMENITY_IMAGES.income, isLocalImage: true, kind: 'monthly', amount: 2000 },
  { id: 'event-space', name: 'Event Space Rental Setup', category: 'Income Generation', image: AMENITY_IMAGES.income, isLocalImage: true, kind: 'monthly', amount: 3000 },
  { id: 'legal-signboard', name: 'Legal Signboard Installation', category: 'Protection', image: AMENITY_IMAGES.protection, isLocalImage: true, kind: 'one-time', amount: 2000 },
]

export function getAmenityById(id: string) {
  return AMENITY_CATALOG.find((a) => a.id === id)
}

export function getAmenityByName(name: string) {
  return AMENITY_CATALOG.find((a) => a.name === name)
}
