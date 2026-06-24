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

export const PROPERTY_KIND_OPTIONS = [
  {
    value: 'plot',
    label: 'Plot / vacant land',
    description: 'Open plot, layout plot, or vacant land parcel.',
  },
  {
    value: 'apartment',
    label: 'Apartment / flat',
    description: 'Flat, gated community unit, or society apartment.',
  },
  {
    value: 'house',
    label: 'Independent house / villa',
    description: 'Built house, villa, or independent residential building.',
  },
  {
    value: 'commercial',
    label: 'Commercial property',
    description: 'Shop, office, warehouse, or business unit.',
  },
  {
    value: 'agricultural_land',
    label: 'Agricultural land',
    description: 'Farm land, crop land, or rural land parcel.',
  },
  {
    value: 'mixed_other',
    label: 'Mixed / other',
    description: 'A property that does not fit one clear category yet.',
  },
] as const

export const OWNER_RELATIONSHIP_OPTIONS = [
  { value: 'owner', label: 'I am the owner' },
  { value: 'family_representative', label: 'I manage it for family' },
  { value: 'authorized_manager', label: 'I am authorized to manage it' },
  { value: 'power_of_attorney', label: 'I hold POA / written authority' },
] as const

export const PROPERTY_PURPOSE_OPTIONS = [
  { value: 'monitor_protect', label: 'Monitor and protect' },
  { value: 'sell_list', label: 'Prepare for listing' },
  { value: 'tenant_management', label: 'Tenant / occupancy follow-up' },
  { value: 'inspection_report', label: 'Inspection report only' },
  { value: 'document_vault', label: 'Document vault and reminders' },
] as const

export const BOUNDARY_STATUS_OPTIONS = [
  { value: 'walled', label: 'Boundary wall exists' },
  { value: 'fenced', label: 'Fenced' },
  { value: 'partially_marked', label: 'Partially marked' },
  { value: 'open', label: 'Open / not marked' },
  { value: 'unknown', label: 'Not sure' },
] as const

export const OCCUPANCY_STATUS_OPTIONS = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'self_used', label: 'Self-used' },
  { value: 'family_used', label: 'Used by family' },
  { value: 'rented', label: 'Rented / occupied by tenant' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'unknown', label: 'Not sure' },
] as const

export const OWNER_CONCERN_OPTIONS = [
  { id: 'encroachment', label: 'Encroachment risk' },
  { id: 'boundary', label: 'Boundary clarity' },
  { id: 'access_road', label: 'Access road' },
  { id: 'document_safety', label: 'Document safety' },
  { id: 'tenant_issue', label: 'Tenant / occupancy issue' },
  { id: 'resale_readiness', label: 'Resale readiness' },
  { id: 'regular_monitoring', label: 'Regular monitoring' },
] as const

export const SELLER_TYPE_OPTIONS = [
  { value: 'owner', label: 'Owner seller' },
  { value: 'broker', label: 'Broker / channel partner' },
  { value: 'developer', label: 'Developer / builder' },
  { value: 'authorized_seller', label: 'Authorized seller' },
] as const

export const BUYING_PURPOSE_OPTIONS = [
  { value: 'own_use', label: 'Own use' },
  { value: 'investment', label: 'Investment' },
  { value: 'rental_income', label: 'Rental income' },
  { value: 'business_use', label: 'Business use' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'exploring', label: 'Still exploring' },
] as const

export const PURCHASE_TIMELINE_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'one_to_three_months', label: '1-3 months' },
  { value: 'three_to_six_months', label: '3-6 months' },
  { value: 'exploring', label: 'Exploring only' },
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
  { id: 'plot', label: 'Plot / vacant land' },
  { id: 'apartment', label: 'Apartment / flat' },
  { id: 'house', label: 'House / villa' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'agricultural_land', label: 'Agricultural land' },
] as const

export const BUDGET_PRESETS_LAKHS = [10, 25, 50, 100, 200, 500, 1000] as const

export const LAND_OWNER_STEP_NAMES = ['Type', 'Needs', 'Finish'] as const
export const PLOT_SELLER_STEP_NAMES = ['Seller', 'Property', 'Listing', 'Finish'] as const
export const PLOT_BUYER_STEP_NAMES = ['Search', 'Safety', 'Payment', 'Assistance'] as const

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
