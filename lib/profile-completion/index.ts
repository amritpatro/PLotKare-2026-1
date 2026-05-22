import type { ProfileCompletionInput, ProfileCompletionItem, ProfileCompletionResult } from './types'

export type { ProfileCompletionInput, ProfileCompletionItem, ProfileCompletionResult } from './types'

function hasValue(value: unknown) {
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return false
}

function item(
  key: string,
  label: string,
  section: ProfileCompletionItem['section'],
  source: Record<string, unknown> | null | undefined,
  field: string,
) {
  return {
    key,
    label,
    section,
    complete: hasValue(source?.[field]),
  }
}

function commonItems(input: ProfileCompletionInput): ProfileCompletionItem[] {
  return [
    item('full_name', 'Full name', 'profile', input.profile, 'full_name'),
    item('email', 'Email address', 'profile', input.profile, 'email'),
    item('phone', 'Phone number', 'profile', input.profile, 'phone'),
    item('city', 'City', 'profile', input.profile, 'city'),
  ]
}

function roleItems(input: ProfileCompletionInput): ProfileCompletionItem[] {
  const details = input.roleDetails
  const operational = input.operationalRecord

  if (input.role === 'plot_seller') {
    return [
      item('company_name', 'Business or company name', 'business', details, 'company_name'),
      item('gst_number', 'GST number', 'business', details, 'gst_number'),
      item('pan_number', 'PAN number', 'identity', details, 'pan_number'),
      item('business_address', 'Business address', 'business', details, 'address'),
      item('commission_model', 'Commercial model', 'preferences', details, 'commission_model'),
      item('seller_record', 'Seller operations record', 'operations', operational, 'id'),
    ]
  }

  if (input.role === 'land_owner') {
    return [
      item('property_location', 'Primary property location', 'property', details, 'property_location'),
      item('property_size_sqyards', 'Primary plot size', 'property', details, 'property_size_sqyards'),
      item('property_type', 'Land use preference', 'preferences', details, 'property_type'),
      item('interested_in', 'Interested services', 'preferences', details, 'interested_in'),
      item('owner_record', 'Owner operations record', 'operations', operational, 'id'),
    ]
  }

  if (input.role === 'customer') {
    return [
      item('investment_budget_lakhs', 'Minimum buying budget', 'preferences', details, 'investment_budget_lakhs'),
      item('investment_budget_max_lakhs', 'Maximum buying budget', 'preferences', details, 'investment_budget_max_lakhs'),
      item('preferred_locations', 'Preferred locations', 'preferences', details, 'preferred_locations'),
      item('pan_or_file', 'PAN detail or submitted PAN file', 'identity', {
        pan_or_file: details?.kyc_pan_number || details?.kyc_pan_submitted || operational?.pan_number,
      }, 'pan_or_file'),
      item('aadhaar_last4', 'Aadhaar last 4 digits', 'identity', {
        aadhaar_last4: details?.kyc_aadhaar_last4 || operational?.aadhaar_last4,
      }, 'aadhaar_last4'),
      item('customer_record', 'Customer operations record', 'operations', operational, 'id'),
    ]
  }

  if (input.role === 'employee') {
    return [
      item('employee_role', 'Employee role', 'operations', operational, 'employee_role'),
      item('employee_record', 'Employee operations record', 'operations', operational, 'id'),
    ]
  }

  if (input.role === 'admin') {
    return [
      item('admin_verified', 'Admin profile verified', 'operations', input.profile, 'verified'),
      item('admin_role', 'Admin role assigned', 'operations', input.profile, 'role'),
    ]
  }

  return []
}

export function computeProfileCompletion(input: ProfileCompletionInput): ProfileCompletionResult {
  const items = [...commonItems(input), ...roleItems(input)]
  const completed = items.filter((entry) => entry.complete).length
  const total = items.length
  const score = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    score,
    completed,
    total,
    items,
    missing: items.filter((entry) => !entry.complete),
  }
}
