export type UserRole = 'user' | 'admin'
export type Facing = 'East' | 'West' | 'North' | 'South'
export type PropertyKind = 'plot' | 'apartment'
export type ListingStatus = 'Active' | 'Sold'
export type PlanTier = 'basic' | 'standard' | 'premium'

export type Profile = {
  id: string
  email: string
  full_name: string
  phone: string | null
  city: string | null
  role: UserRole
  plan: PlanTier
  avatar_path: string | null
  notification_preferences: Record<string, boolean>
  created_at: string
  updated_at: string
}

export type PlotRow = {
  id: string
  owner_id: string
  plot_number: string
  location: string
  location_other: string | null
  sq_yards: number
  facing: Facing
  corner_plot: boolean
  purchase_price_lakhs: number
  current_value_lakhs: number
  purchase_date: string | null
  status: string
  last_inspection: string | null
  created_at: string
  updated_at: string
}

export type ListingRow = {
  id: string
  owner_id: string | null
  plot_id: string | null
  plot_number: string
  location: string
  size_sq_yards: number
  size_label: string
  facing: Facing
  corner_plot: boolean
  premium: boolean
  price_lakhs: number
  price_display: string
  image_path: string | null
  status: ListingStatus
  inquiries_count: number
  property_kind: PropertyKind
  bhk: number | null
  floor_label: string | null
  created_at: string
  updated_at: string
}
