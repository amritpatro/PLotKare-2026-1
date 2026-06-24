import { z } from 'zod'

const facingEnum = z.enum(['N', 'S', 'E', 'W'])
const propertyKindEnum = z.enum(['plot', 'apartment', 'house', 'commercial', 'agricultural_land', 'mixed_other'])
const propertyTypeEnum = z.enum(['agriculture', 'food_crops', 'cash_crops', 'maintenance', 'other'])
const commissionModelEnum = z.enum(['commission_percent', 'listing_fee'])
const accountTypeEnum = z.enum(['savings', 'current'])
const ownerRelationshipEnum = z.enum(['owner', 'family_representative', 'authorized_manager', 'power_of_attorney'])
const propertyPurposeEnum = z.enum(['monitor_protect', 'sell_list', 'tenant_management', 'inspection_report', 'document_vault'])
const boundaryStatusEnum = z.enum(['walled', 'fenced', 'open', 'partially_marked', 'unknown'])
const occupancyStatusEnum = z.enum(['vacant', 'self_used', 'family_used', 'rented', 'under_construction', 'unknown'])
const sellerTypeEnum = z.enum(['owner', 'broker', 'developer', 'authorized_seller'])
const buyingPurposeEnum = z.enum(['own_use', 'investment', 'rental_income', 'business_use', 'agriculture', 'exploring'])
const purchaseTimelineEnum = z.enum(['urgent', 'one_to_three_months', 'three_to_six_months', 'exploring'])

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone or WhatsApp number')
  .optional()
  .or(z.literal(''))

export const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/
export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
export const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const accountNumberRegex = /^\d{9,18}$/

// Land owner
export const landOwnerStep1Schema = z
  .object({
    contact_phone: phoneSchema,
    contact_address: z.string().trim().max(240).optional().or(z.literal('')),
    property_kind: propertyKindEnum.default('plot'),
    owner_relationship: ownerRelationshipEnum,
    property_purpose: propertyPurposeEnum,
    property_location: z.string().trim().min(2, 'Location or address required'),
    property_size_sqyards: z.coerce.number().min(100, 'Minimum equivalent size is 100 sq yards'),
    property_facing: facingEnum.optional().or(z.literal('')),
    is_corner_plot: z.boolean().optional().default(false),
    boundary_status: boundaryStatusEnum.optional(),
    occupancy_status: occupancyStatusEnum.optional(),
    inspection_contact_name: z.string().trim().max(120).optional().or(z.literal('')),
    inspection_contact_phone: phoneSchema,
    property_details: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .superRefine((data, ctx) => {
    if (!data.contact_phone) {
      ctx.addIssue({ code: 'custom', message: 'Phone or WhatsApp number is required', path: ['contact_phone'] })
    }
    if ((data.property_kind === 'plot' || data.property_kind === 'agricultural_land') && !data.property_facing) {
      ctx.addIssue({ code: 'custom', message: 'Facing is required for plots and land', path: ['property_facing'] })
    }
  })

export const landOwnerStep2Schema = z.object({
  property_type: propertyTypeEnum,
  interested_in: z.array(z.string()).min(1, 'Select at least one interest'),
  concern_types: z.array(z.string()).min(1, 'Select at least one concern'),
})

export const landOwnerStep3Schema = z.object({
  agree_to_terms: z.boolean().refine((v) => v === true, 'You must agree to continue'),
  documents_skipped: z.boolean().optional(),
})

// Plot seller
export const plotSellerStep1Schema = z.object({
  company_name: z.string().min(3, 'Company name required'),
  contact_phone: phoneSchema,
  seller_type: sellerTypeEnum,
  gst_number: z.string().regex(gstRegex, 'Invalid GST format (e.g. 22ABCDE1234F1Z5)').optional().or(z.literal('')),
  pan_number: z.string().regex(panRegex, 'Invalid PAN format (e.g. ABCDE1234F)').optional().or(z.literal('')),
  address: z.string().min(10, 'Address required'),
}).superRefine((data, ctx) => {
  if (!data.contact_phone) {
    ctx.addIssue({ code: 'custom', message: 'Phone or WhatsApp number is required', path: ['contact_phone'] })
  }
})

export const plotSellerStep2Schema = z.object({
  listing_property_kind: propertyKindEnum,
  listing_location: z.string().trim().min(2, 'Listing location required'),
  expected_price_lakhs: z.coerce.number().min(0).optional(),
  listing_notes: z.string().trim().max(600).optional().or(z.literal('')),
})

export const plotSellerStep3Schema = z
  .object({
    commission_model: commissionModelEnum.optional().default('commission_percent'),
    commission_rate: z.coerce.number().min(1).max(10).optional(),
    listing_fee_amount: z.coerce.number().min(100).optional(),
  })
  .passthrough()

export const plotSellerStep4Schema = z.object({
  bank_account_holder: z.string().min(3, 'Account holder name required').optional().or(z.literal('')),
  bank_account_number: z.string().regex(accountNumberRegex, 'Invalid account number').optional().or(z.literal('')),
  bank_ifsc: z.string().regex(ifscRegex, 'Invalid IFSC code').optional().or(z.literal('')),
  account_type: accountTypeEnum.optional().default('savings'),
})

// Plot buyer
export const plotBuyerStep1Schema = z
  .object({
    contact_phone: phoneSchema,
    investment_budget_lakhs: z.coerce.number().min(10, 'Min 10 Lakhs'),
    investment_budget_max_lakhs: z.coerce.number().min(10),
    preferred_locations: z.array(z.string()).min(1, 'Select at least one location'),
    preferred_plot_size_min: z.coerce.number().min(100).optional(),
    preferred_plot_size_max: z.coerce.number().min(100).optional(),
    preferred_property_types: z.array(z.string()).min(1, 'Select at least one property type'),
    buying_purpose: buyingPurposeEnum,
    purchase_timeline: purchaseTimelineEnum,
  })
  .refine((data) => data.investment_budget_max_lakhs >= data.investment_budget_lakhs, {
    message: 'Max budget must be >= min budget',
    path: ['investment_budget_max_lakhs'],
  })
  .superRefine((data, ctx) => {
    if (!data.contact_phone) {
      ctx.addIssue({ code: 'custom', message: 'Phone or WhatsApp number is required', path: ['contact_phone'] })
    }
  })

export const plotBuyerStep2Schema = z.object({
  kyc_aadhaar_last_4: z.string().regex(/^\d{4}$/, 'Enter last 4 digits of Aadhaar').optional().or(z.literal('')),
  agree_kyc_rules: z.boolean().optional().default(false),
})

export const plotBuyerStep3Schema = z.object({
  bank_account_holder: z.string().min(3).optional().or(z.literal('')),
  bank_account_number: z.string().regex(accountNumberRegex, 'Invalid account number').optional().or(z.literal('')),
  bank_ifsc: z.string().regex(ifscRegex, 'Invalid IFSC').optional().or(z.literal('')),
  account_type: accountTypeEnum.optional().default('savings'),
  kyc_verify_consent: z.boolean().optional().default(false),
})

export const plotBuyerStep4Schema = z
  .object({
    loan_interested: z.boolean(),
    loan_amount_needed: z.coerce.number().optional(),
    employer_name: z.string().optional(),
    monthly_income: z.coerce.number().optional(),
    employment_type: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.loan_interested) return
    if (!data.loan_amount_needed || data.loan_amount_needed < 1) {
      ctx.addIssue({ code: 'custom', message: 'Loan amount required', path: ['loan_amount_needed'] })
    }
    if (!data.employer_name?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Employer name required', path: ['employer_name'] })
    }
    if (!data.monthly_income || data.monthly_income < 1) {
      ctx.addIssue({ code: 'custom', message: 'Monthly income required', path: ['monthly_income'] })
    }
  })

export type LandOwnerStep1 = z.infer<typeof landOwnerStep1Schema>
export type LandOwnerStep2 = z.infer<typeof landOwnerStep2Schema>
export type PlotSellerStep1 = z.infer<typeof plotSellerStep1Schema>
export type PlotBuyerStep1 = z.infer<typeof plotBuyerStep1Schema>

export type LandOwnerOnboarding = LandOwnerStep1 &
  z.infer<typeof landOwnerStep2Schema> &
  z.infer<typeof landOwnerStep3Schema>
export type PlotSellerOnboarding = PlotSellerStep1 &
  z.infer<typeof plotSellerStep3Schema> &
  z.infer<typeof plotSellerStep4Schema>
export type PlotBuyerOnboarding = PlotBuyerStep1 &
  z.infer<typeof plotBuyerStep2Schema> &
  z.infer<typeof plotBuyerStep3Schema> &
  z.infer<typeof plotBuyerStep4Schema>

export type OnboardingData = LandOwnerOnboarding | PlotSellerOnboarding | PlotBuyerOnboarding

export function getStepSchema(customerType: string, step: number) {
  if (customerType === 'land_owner') {
    if (step === 1) return landOwnerStep1Schema
    if (step === 2) return landOwnerStep2Schema
    if (step === 3) return landOwnerStep3Schema
  }
  if (customerType === 'plot_seller') {
    if (step === 1) return plotSellerStep1Schema
    if (step === 2) return plotSellerStep2Schema
    if (step === 3) return plotSellerStep3Schema
    if (step === 4) return plotSellerStep4Schema
  }
  if (customerType === 'plot_buyer') {
    if (step === 1) return plotBuyerStep1Schema
    if (step === 2) return plotBuyerStep2Schema
    if (step === 3) return plotBuyerStep3Schema
    if (step === 4) return plotBuyerStep4Schema
  }
  return null
}
