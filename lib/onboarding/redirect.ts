import type { SupabaseClient } from '@supabase/supabase-js'
import {
  customerTypeFromSlug,
  onboardingPathFromCategory,
  PENDING_ONBOARDING_STORAGE_KEY,
  resolveCustomerType,
  slugFromCustomerType,
  type CustomerType,
} from '@/lib/onboarding/types'

export { onboardingPathFromCategory } from '@/lib/onboarding/types'

const DETAIL_TABLE: Record<CustomerType, string> = {
  land_owner: 'land_owner_details',
  plot_seller: 'plot_seller_details',
  plot_buyer: 'plot_buyer_details',
}

type ProfileRedirectState = {
  onboarding_completed?: boolean | null
  onboarding_status?: string | null
  customer_type?: string | null
  customer_category?: string | null
  role?: string | null
  full_name?: string | null
  phone?: string | null
  address_line?: string | null
  city?: string | null
  postal_code?: string | null
  referral_source?: string | null
}

function hasExistingCustomerProfileData(profile: ProfileRedirectState) {
  return Boolean(
    profile.full_name ||
      profile.phone ||
      profile.address_line ||
      profile.city ||
      profile.postal_code ||
      profile.referral_source,
  )
}

async function hasSavedOnboardingDetails(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileRedirectState,
): Promise<boolean> {
  const customerType = resolveCustomerType(profile)
  if (!customerType) return false

  const { data, error } = await supabase
    .from(DETAIL_TABLE[customerType])
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  return !error && !!data
}

export function onboardingPathForType(customerType: CustomerType): string {
  return `/onboarding/${slugFromCustomerType(customerType)}`
}

function isComplete(profile: ProfileRedirectState | null) {
  return profile?.onboarding_completed === true || profile?.onboarding_status === 'completed'
}

function safeFallback(path: string) {
  return path.startsWith('/') ? path : '/dashboard'
}

function readPendingOnboardingPath(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const path = sessionStorage.getItem(PENDING_ONBOARDING_STORAGE_KEY)
    return path?.startsWith('/onboarding/') ? path : null
  } catch {
    return null
  }
}

export function rememberPendingOnboardingPath(path: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PENDING_ONBOARDING_STORAGE_KEY, path)
  } catch {
    /* ignore */
  }
}

export function clearPendingOnboardingPath() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PENDING_ONBOARDING_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: ProfileRedirectState | null; migrationReady: boolean }> {
  const full = await supabase
    .from('profiles')
    .select(
      'onboarding_completed, onboarding_status, customer_type, customer_category, role, full_name, phone, address_line, city, postal_code, referral_source',
    )
    .eq('id', userId)
    .maybeSingle()

  if (!full.error && full.data) {
    return { profile: full.data as ProfileRedirectState, migrationReady: true }
  }

  const fallback = await supabase
    .from('profiles')
    .select('onboarding_status, customer_type, customer_category, role, full_name, phone, address_line, city, postal_code, referral_source')
    .eq('id', userId)
    .maybeSingle()

  if (fallback.data) {
    return { profile: fallback.data as ProfileRedirectState, migrationReady: false }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.user_metadata) {
    const metadata = user.user_metadata as Record<string, unknown>
    const profileFromMetadata: ProfileRedirectState = {
      full_name: metadata.full_name ? String(metadata.full_name) : metadata.fullName ? String(metadata.fullName) : null,
      phone: metadata.phone ? String(metadata.phone) : null,
      address_line: metadata.address_line
        ? String(metadata.address_line)
        : metadata.addressLine
        ? String(metadata.addressLine)
        : null,
      city: metadata.city ? String(metadata.city) : null,
      postal_code: metadata.postal_code ? String(metadata.postal_code) : null,
      referral_source: metadata.referral_source
        ? String(metadata.referral_source)
        : metadata.referralSource
        ? String(metadata.referralSource)
        : null,
      customer_type: metadata.customer_type ? String(metadata.customer_type) : metadata.customerType ? String(metadata.customerType) : null,
      customer_category: metadata.customer_category
        ? String(metadata.customer_category)
        : metadata.customerCategory
        ? String(metadata.customerCategory)
        : null,
    }

    if (Object.values(profileFromMetadata).some((value) => value !== null && value !== undefined && value !== '')) {
      return { profile: profileFromMetadata, migrationReady: false }
    }
  }

  return { profile: null, migrationReady: false }
}

export async function resolvePostLoginRedirect(
  supabase: SupabaseClient,
  userId: string,
  fallbackNext = '/dashboard',
  authUserMetadata?: Record<string, unknown>,
): Promise<string> {
  const { profile } = await loadProfile(supabase, userId, authUserMetadata)

  if (profile?.role === 'admin') return '/admin'

  if (!profile) {
    clearPendingOnboardingPath()
    return '/auth/choose-role'
  }

  if (isComplete(profile)) {
    clearPendingOnboardingPath()
    return safeFallback(fallbackNext)
  }

  if (hasExistingCustomerProfileData(profile)) {
    clearPendingOnboardingPath()
    return safeFallback(fallbackNext)
  }

  const customerType = resolveCustomerType(profile)
  if (customerType) {
    const hasDetails = await hasSavedOnboardingDetails(supabase, userId, profile)
    if (hasDetails) {
      clearPendingOnboardingPath()
      return safeFallback(fallbackNext)
    }

    return onboardingPathForType(customerType)
  }

  clearPendingOnboardingPath()
  return '/auth/choose-role'
}

export async function resolveOnboardingRedirect(
  supabase: SupabaseClient,
  userId: string,
  fallbackNext = '/dashboard',
): Promise<string> {
  return resolvePostLoginRedirect(supabase, userId, fallbackNext)
}

export async function resolveSignupRedirect(
  supabase: SupabaseClient,
  userId: string,
  customerType: CustomerType,
): Promise<string> {
  const pendingPath = readPendingOnboardingPath()
  const { profile, migrationReady } = await loadProfile(supabase, userId)

  if (migrationReady && profile && !isComplete(profile)) {
    await supabase
      .from('profiles')
      .update({
        customer_type: customerType,
        onboarding_status: 'in_progress',
        onboarding_completed: false,
      })
      .eq('id', userId)
  }

  if (pendingPath) {
    const slug = pendingPath.replace(/^\/onboarding\//, '')
    const pendingCustomerType = customerTypeFromSlug(slug)
    if (pendingCustomerType === customerType) return pendingPath
  }

  return onboardingPathForType(customerType)
}
