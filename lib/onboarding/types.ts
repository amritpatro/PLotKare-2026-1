export const CUSTOMER_TYPES = ['land_owner', 'plot_seller', 'plot_buyer'] as const
export type CustomerType = (typeof CUSTOMER_TYPES)[number]

export const CUSTOMER_TYPE_SLUGS: Record<CustomerType, string> = {
  land_owner: 'land-owner',
  plot_seller: 'plot-seller',
  plot_buyer: 'plot-buyer',
}

export const SLUG_TO_CUSTOMER_TYPE: Record<string, CustomerType> = {
  'land-owner': 'land_owner',
  'plot-seller': 'plot_seller',
  'plot-buyer': 'plot_buyer',
}

export function customerTypeFromSlug(slug: string): CustomerType | null {
  return SLUG_TO_CUSTOMER_TYPE[slug] ?? null
}

export function slugFromCustomerType(type: CustomerType): string {
  return CUSTOMER_TYPE_SLUGS[type]
}

export function getMaxSteps(customerType: CustomerType): number {
  const steps: Record<CustomerType, number> = {
    land_owner: 3,
    plot_seller: 4,
    plot_buyer: 4,
  }
  return steps[customerType]
}

export type OnboardingProgressResponse = {
  current_step: number
  last_completed_step: number
  completed_steps: number[]
  saved_data: Record<string, unknown>
  onboarding_status: string
  welcome_back?: boolean
  next_action?: string
}

export type OnboardingSubmitResponse = {
  success: boolean
  current_step: number
  next_step: number | null
  completed: boolean
  message: string
}

export type OnboardingResumeResponse = {
  step_number: number
  saved_data: Record<string, unknown>
  skip_to_step: number
  welcome_back: boolean
}

/** Maps signup `customer_category` metadata to onboarding customer_type */
export const CUSTOMER_CATEGORY_TO_TYPE: Record<string, CustomerType> = {
  owner_monitoring: 'land_owner',
  family_office: 'land_owner',
  buyer_research: 'plot_buyer',
  verified_resale: 'plot_seller',
}

export function resolveCustomerType(
  profile: { customer_type?: string | null; customer_category?: string | null },
): CustomerType | null {
  if (profile.customer_type && CUSTOMER_TYPES.includes(profile.customer_type as CustomerType)) {
    return profile.customer_type as CustomerType
  }
  if (profile.customer_category) {
    return CUSTOMER_CATEGORY_TO_TYPE[profile.customer_category] ?? null
  }
  return null
}

/** Onboarding URL from signup “Primary property goal” (works even if DB migration is pending). */
export function onboardingPathFromCategory(customerCategory?: string | null): string {
  const customerType = customerCategory ? CUSTOMER_CATEGORY_TO_TYPE[customerCategory] : null
  return customerType ? `/onboarding/${slugFromCustomerType(customerType)}` : '/onboarding/land-owner'
}

export const PENDING_ONBOARDING_STORAGE_KEY = 'plotkare_pending_onboarding_path'
