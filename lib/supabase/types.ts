export type UserRole = 'user' | 'plot_seller' | 'land_owner' | 'customer' | 'employee' | 'admin'
export type EmployeeRole = 'verification_agent' | 'field_inspection_agent' | 'support_staff'
export type CustomerType = 'land_owner' | 'plot_seller' | 'plot_buyer'
export type Facing = 'East' | 'West' | 'North' | 'South'
export type PropertyKind = 'plot' | 'apartment'
export type ListingStatus = 'Active' | 'Sold' | 'featured' | 'archived'
export type PlanTier = 'basic' | 'standard' | 'premium'

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  user: '/auth/choose-role',
  plot_seller: '/seller',
  land_owner: '/owner',
  customer: '/customer',
  employee: '/employee',
  admin: '/admin/dashboard',
}

export function isUserRole(value: unknown): value is UserRole {
  return (
    value === 'user' ||
    value === 'plot_seller' ||
    value === 'land_owner' ||
    value === 'customer' ||
    value === 'employee' ||
    value === 'admin'
  )
}

export function dashboardPathForRole(role: string | null | undefined) {
  return isUserRole(role) ? ROLE_DASHBOARD_PATHS[role] : ROLE_DASHBOARD_PATHS.user
}

export function roleFromCustomerType(customerType: string | null | undefined): UserRole | null {
  if (customerType === 'land_owner') return 'land_owner'
  if (customerType === 'plot_seller') return 'plot_seller'
  if (customerType === 'plot_buyer') return 'customer'
  return null
}

export function effectiveRoleForProfile(profile: {
  role?: string | null
  customer_type?: string | null
} | null | undefined): UserRole | null {
  if (!profile) return null
  if (profile.role === 'admin' || profile.role === 'employee') return profile.role
  if (profile.role === 'plot_seller' || profile.role === 'land_owner' || profile.role === 'customer') return profile.role
  return roleFromCustomerType(profile.customer_type) ?? (profile.role === 'user' ? 'user' : null)
}

export type Profile = {
  id: string
  email: string
  full_name: string
  phone: string | null
  alternate_phone?: string | null
  city: string | null
  address_line?: string | null
  postal_code?: string | null
  role: UserRole
  employee_role?: EmployeeRole | null
  plan: PlanTier
  avatar_path: string | null
  notification_preferences: Record<string, boolean>
  profile_completion_status?: Record<string, unknown>
  security_preferences?: Record<string, unknown>
  customer_type?: CustomerType | null
  onboarding_status?: 'pending' | 'in_progress' | 'completed' | null
  onboarding_completed?: boolean | null
  verified?: boolean | null
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
