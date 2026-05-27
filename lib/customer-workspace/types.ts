export type CustomerRecord = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  account_status: string
  kyc_status: string
  created_at: string
}

export type BuyerDetails = {
  investment_budget_lakhs: number | null
  investment_budget_max_lakhs: number | null
  preferred_locations: string[] | null
  preferred_plot_size_min: number | null
  preferred_plot_size_max: number | null
  preferred_property_types: string[] | null
  loan_interested: boolean | null
  kyc_pan_submitted: boolean | null
  kyc_aadhaar_submitted: boolean | null
  kyc_verified: boolean | null
  kyc_status: string | null
  updated_at: string | null
}

export type CustomerListing = {
  id: string
  property_id: string | null
  seller_id: string | null
  plot_id: string | null
  plot_number: string
  location: string
  size_sq_yards: number
  size_label: string
  facing: string
  corner_plot: boolean
  premium: boolean
  price_lakhs: number
  price_display: string
  status: string
  approval_status: string | null
  is_published: boolean | null
  verified_at: string | null
  verified_by: string | null
  inquiries_count: number
  property_kind: string
  bhk: number | null
  floor_label: string | null
  created_at: string
}

export type SavedListing = {
  id: string
  listing_id: string
  created_at: string
}

export type ListingInquiry = {
  id: string
  listing_id: string
  message: string | null
  status: string
  created_at: string
}

export type SiteVisitRequest = {
  id: string
  listing_id: string
  preferred_date: string | null
  status: string
  notes: string | null
  created_at: string
}

export type LinkedProperty = {
  id: string
  title: string | null
  property_kind: string | null
  address: string | null
  city: string | null
  state: string | null
  lifecycle_status: string | null
  verification_status: string | null
}

export type PropertyLink = {
  id: string
  property_id: string
  relationship_type: string
  status: string
  registration_date: string | null
  created_at: string
  properties: LinkedProperty | LinkedProperty[] | null
}

export type PropertyDocument = {
  id: string
  title: string
  document_type: string
  verification_status: string
  property_id: string | null
  property_request_id?: string | null
  created_at: string
  category?: string | null
  requirement_level?: string | null
  description?: string | null
  review_reason?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  reviewed_at?: string | null
  withdrawal_requested_at?: string | null
}

export type InspectionRow = {
  id: string
  property_id: string
  status: string
  scheduled_for: string | null
  completed_at: string | null
  summary: string | null
  created_at: string
}

export type MaintenanceRequest = {
  id: string
  property_id: string
  title: string
  priority: string
  status: string
  created_at: string
}

export type SupportTicket = {
  id: string
  ticket_reference?: string | null
  subject: string
  description?: string | null
  category?: string | null
  priority: string
  status: string
  created_at: string
  property_id: string | null
}

export type LinkedAmenity = {
  id: string
  plot_id: string
  amenity_id: string
  property_id: string | null
  plot_number: string | null
  name: string
  category: string
  kind: string
  amount: number
  active: boolean
  created_at: string
}

export type MarketplaceSchemaStatus = {
  savedListingsReady: boolean
  inquiriesReady: boolean
  siteVisitsReady: boolean
}

export type CustomerWorkspaceData = {
  customer: CustomerRecord | null
  buyerDetails: BuyerDetails | null
  listings: CustomerListing[]
  savedListings: SavedListing[]
  inquiries: ListingInquiry[]
  siteVisits: SiteVisitRequest[]
  propertyLinks: PropertyLink[]
  documents: PropertyDocument[]
  inspections: InspectionRow[]
  maintenanceRequests: MaintenanceRequest[]
  supportTickets: SupportTicket[]
  amenities: LinkedAmenity[]
  schemaStatus: MarketplaceSchemaStatus
}
