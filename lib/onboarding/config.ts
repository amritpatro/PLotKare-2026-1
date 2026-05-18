export const VISAKHAPATNAM_CORRIDORS = [
  'Bheemunipatnam',
  'Kommadi',
  'Pendurthi',
  'Anakapalle',
  'MVP Colony',
  'Madhurawada',
  'Rushikonda',
  'Gopalapatnam',
  'Seethammadhara',
] as const

export const SIZE_PRESETS_SQ_YARDS = [100, 250, 500, 1000, 2000, 5000] as const

export const PROPERTY_TYPES = [
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'food_crops', label: 'Food Crops' },
  { value: 'cash_crops', label: 'Cash Crops' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
] as const

export const AMENITY_OPTIONS: Record<string, { id: string; label: string }[]> = {
  agriculture: [
    { id: 'container_farming', label: 'Container Farming' },
    { id: 'mushroom_kit', label: 'Mushroom Kit' },
    { id: 'herbal_garden', label: 'Herbal Garden' },
    { id: 'compost', label: 'Compost' },
  ],
  food_crops: [
    { id: 'drip_irrigation', label: 'Drip Irrigation' },
    { id: 'rainwater_harvesting', label: 'Rainwater Harvesting' },
    { id: 'vermi_composting', label: 'Vermi Composting' },
  ],
  cash_crops: [
    { id: 'container_farming', label: 'Container Farming' },
    { id: 'flower_bed', label: 'Flower Bed' },
    { id: 'solar_hosting', label: 'Solar Hosting' },
  ],
  maintenance: [
    { id: 'boundary_fencing', label: 'Boundary Fencing' },
    { id: 'security_light', label: 'Security Light' },
    { id: 'cctv', label: 'CCTV' },
  ],
  other: [],
}

export const UNIVERSAL_AMENITIES = [
  { id: 'value_tracking', label: 'Value Tracking' },
  { id: 'legal_vault', label: 'Legal Vault' },
  { id: 'monthly_inspection', label: 'Monthly Inspection' },
] as const

export const BUYER_LOCATIONS = [
  { id: 'visakhapatnam', label: 'Visakhapatnam (all corridors)' },
  { id: 'hyderabad', label: 'Hyderabad' },
  { id: 'bangalore', label: 'Bangalore' },
  { id: 'pune', label: 'Pune' },
  { id: 'mumbai', label: 'Mumbai' },
  { id: 'chennai', label: 'Chennai' },
] as const

export const BUYER_PROPERTY_TYPES = [
  { id: 'residential', label: 'Residential' },
  { id: 'agricultural', label: 'Agricultural' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'industrial', label: 'Industrial' },
] as const

export const BUDGET_PRESETS_LAKHS = [10, 25, 50, 100, 200, 500, 1000] as const

export const LAND_OWNER_STEP_NAMES = ['Property', 'Interests', 'Finish'] as const
export const PLOT_SELLER_STEP_NAMES = ['Business', 'Needs', 'Listing', 'Payout'] as const
export const PLOT_BUYER_STEP_NAMES = ['Profile', 'Identity', 'Payout', 'Assistance'] as const

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
