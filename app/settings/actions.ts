'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { computeProfileCompletion } from '@/lib/profile-completion'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { dashboardPathForRole, isUserRole, type UserRole } from '@/lib/supabase/types'

const PROFILE_ASSETS_BUCKET = 'profile-assets'

const optionalText = z.string().trim().max(240).optional().nullable()
const panNumber = z
  .string()
  .trim()
  .max(10)
  .transform((value) => value.toUpperCase())
  .optional()
  .nullable()
const aadhaarLast4 = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'Use only the last 4 Aadhaar digits.')
  .optional()
  .or(z.literal(''))
  .nullable()

const commonSettingsSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: optionalText,
  city: optionalText,
  addressLine: optionalText,
  postalCode: optionalText,
  avatarPath: z.string().trim().min(1).max(500).optional().nullable(),
})

const notificationSchema = z.record(z.boolean())

const sellerSettingsSchema = z.object({
  companyName: optionalText,
  gstNumber: optionalText.transform((value) => (value ? value.toUpperCase() : value)),
  panNumber,
  address: optionalText,
  commissionModel: z.enum(['commission_percent', 'listing_fee']).optional().nullable(),
  commissionRate: z.coerce.number().min(1).max(10).optional().nullable(),
  listingFeeAmount: z.coerce.number().min(100).optional().nullable(),
})

const ownerSettingsSchema = z.object({
  propertyLocation: optionalText,
  propertySizeSqyards: z.coerce.number().int().min(100).optional().nullable(),
  propertyFacing: z.enum(['N', 'S', 'E', 'W']).optional().nullable(),
  isCornerPlot: z.boolean().optional(),
  propertyType: z
    .enum(['agriculture', 'food_crops', 'cash_crops', 'maintenance', 'other'])
    .optional()
    .nullable(),
  interestedIn: z.array(z.string().trim().min(1).max(80)).default([]),
})

const customerSettingsSchema = z.object({
  investmentBudgetLakhs: z.coerce.number().min(0).optional().nullable(),
  investmentBudgetMaxLakhs: z.coerce.number().min(0).optional().nullable(),
  preferredLocations: z.array(z.string().trim().min(1).max(80)).default([]),
  preferredPropertyTypes: z.array(z.string().trim().min(1).max(80)).default([]),
  preferredPlotSizeMin: z.coerce.number().int().min(0).optional().nullable(),
  preferredPlotSizeMax: z.coerce.number().int().min(0).optional().nullable(),
  panNumber,
  aadhaarLast4,
  loanInterested: z.boolean().optional(),
})

function cleanText(value: string | null | undefined) {
  const text = value?.trim()
  return text ? text : null
}

function cleanNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function requireSettingsContext() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error('Please log in to continue.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !isUserRole(profile.role)) {
    throw new Error('Your profile is not ready yet. Please sign in again.')
  }

  return {
    supabase,
    user,
    profile: { ...(profile as Record<string, unknown>), role: profile.role as UserRole },
  }
}

async function loadRoleRecords(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, role: UserRole) {
  if (role === 'plot_seller') {
    const [{ data: roleDetails }, { data: operationalRecord }] = await Promise.all([
      supabase.from('plot_seller_details').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('sellers').select('*').eq('profile_id', userId).maybeSingle(),
    ])
    return { roleDetails, operationalRecord }
  }

  if (role === 'land_owner') {
    const [{ data: roleDetails }, { data: operationalRecord }] = await Promise.all([
      supabase.from('land_owner_details').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('owners').select('*').eq('profile_id', userId).maybeSingle(),
    ])
    return { roleDetails, operationalRecord }
  }

  if (role === 'customer') {
    const [{ data: roleDetails }, { data: operationalRecord }] = await Promise.all([
      supabase.from('plot_buyer_details').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('customers').select('*').eq('profile_id', userId).maybeSingle(),
    ])
    return { roleDetails, operationalRecord }
  }

  if (role === 'employee') {
    const { data: operationalRecord } = await supabase
      .from('employees')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle()
    return { roleDetails: operationalRecord, operationalRecord }
  }

  return { roleDetails: null, operationalRecord: null }
}

async function readOptionalMaybeSingle<T>(
  query: PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
) {
  const { data, error } = await query
  const missingRelation =
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.toLowerCase().includes('could not find the table') ||
    error?.message?.toLowerCase().includes('does not exist')

  if (missingRelation) return null
  if (error) throw error
  return data ?? null
}

export async function loadSettingsData() {
  const { supabase, user, profile } = await requireSettingsContext()
  const role = profile.role as UserRole
  const [{ roleDetails, operationalRecord }, { data: subscription }, consultation] = await Promise.all([
    loadRoleRecords(supabase, user.id, role),
    supabase
      .from('subscriptions')
      .select('plan,status,current_period_end')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    readOptionalMaybeSingle<{ status: string; created_at: string }>(
      supabase
        .from('consultation_requests')
        .select('status,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  ])

  const completion = computeProfileCompletion({
    role,
    profile: profile as Record<string, unknown>,
    roleDetails: roleDetails as Record<string, unknown> | null,
    operationalRecord: operationalRecord as Record<string, unknown> | null,
  })

  return {
    profile,
    roleDetails: roleDetails ?? null,
    operationalRecord: operationalRecord ?? null,
    completion,
    dashboardPath: dashboardPathForRole(role),
    storageBucket: PROFILE_ASSETS_BUCKET,
    subscription: subscription ?? null,
    consultation: consultation ?? null,
  }
}

function refreshSettingsPaths(role: UserRole) {
  revalidatePath('/settings')
  revalidatePath('/dashboard/settings')
  revalidatePath('/admin/dashboard/settings')
  revalidatePath(dashboardPathForRole(role))
}

export async function updateCommonSettings(input: unknown) {
  const parsed = commonSettingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid profile details.' }

  const { supabase, user, profile } = await requireSettingsContext()
  const payload = {
    full_name: parsed.data.fullName,
    phone: cleanText(parsed.data.phone),
    city: cleanText(parsed.data.city),
    address_line: cleanText(parsed.data.addressLine),
    postal_code: cleanText(parsed.data.postalCode),
    ...(parsed.data.avatarPath !== undefined ? { avatar_path: parsed.data.avatarPath } : {}),
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
  if (error) return { ok: false, message: error.message }

  await recordAuditLog({
    actorId: user.id,
    action: 'settings.profile.updated',
    entityType: 'profile',
    entityId: user.id,
  })

  refreshSettingsPaths(profile.role as UserRole)
  return { ok: true, message: 'Profile settings saved.' }
}

export async function updateNotificationSettings(input: unknown) {
  const parsed = notificationSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Invalid notification settings.' }

  const { supabase, user, profile } = await requireSettingsContext()
  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: parsed.data })
    .eq('id', user.id)

  if (error) return { ok: false, message: error.message }

  await recordAuditLog({
    actorId: user.id,
    action: 'settings.notifications.updated',
    entityType: 'profile',
    entityId: user.id,
  })

  refreshSettingsPaths(profile.role as UserRole)
  return { ok: true, message: 'Notification settings saved.' }
}

export async function updateRoleSettings(input: unknown) {
  const { supabase, user, profile } = await requireSettingsContext()
  const role = profile.role as UserRole

  if (role === 'plot_seller') {
    const parsed = sellerSettingsSchema.safeParse(input)
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid seller details.' }

    const payload = {
      user_id: user.id,
      company_name: cleanText(parsed.data.companyName),
      gst_number: cleanText(parsed.data.gstNumber),
      pan_number: cleanText(parsed.data.panNumber),
      address: cleanText(parsed.data.address),
      commission_model: parsed.data.commissionModel ?? null,
      commission_rate: cleanNumber(parsed.data.commissionRate),
      listing_fee_amount: cleanNumber(parsed.data.listingFeeAmount),
    }

    const { error } = await supabase.from('plot_seller_details').upsert(payload, { onConflict: 'user_id' })
    if (error) return { ok: false, message: error.message }

    await supabase.from('sellers').upsert(
      {
        profile_id: user.id,
        company_name: payload.company_name,
        gst_number: payload.gst_number,
        pan_number: payload.pan_number,
      },
      { onConflict: 'profile_id' },
    )
  } else if (role === 'land_owner') {
    const parsed = ownerSettingsSchema.safeParse(input)
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid owner details.' }

    const { error } = await supabase.from('land_owner_details').upsert(
      {
        user_id: user.id,
        property_location: cleanText(parsed.data.propertyLocation),
        property_size_sqyards: cleanNumber(parsed.data.propertySizeSqyards),
        property_facing: parsed.data.propertyFacing ?? null,
        is_corner_plot: Boolean(parsed.data.isCornerPlot),
        property_type: parsed.data.propertyType ?? null,
        interested_in: parsed.data.interestedIn,
      },
      { onConflict: 'user_id' },
    )
    if (error) return { ok: false, message: error.message }

    await supabase.from('owners').upsert({ profile_id: user.id }, { onConflict: 'profile_id' })
  } else if (role === 'customer') {
    const parsed = customerSettingsSchema.safeParse(input)
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid customer details.' }

    const aadhaar = cleanText(parsed.data.aadhaarLast4)
    const { error } = await supabase.from('plot_buyer_details').upsert(
      {
        user_id: user.id,
        investment_budget_lakhs: cleanNumber(parsed.data.investmentBudgetLakhs),
        investment_budget_max_lakhs: cleanNumber(parsed.data.investmentBudgetMaxLakhs),
        preferred_locations: parsed.data.preferredLocations,
        preferred_property_types: parsed.data.preferredPropertyTypes,
        preferred_plot_size_min: cleanNumber(parsed.data.preferredPlotSizeMin),
        preferred_plot_size_max: cleanNumber(parsed.data.preferredPlotSizeMax),
        kyc_pan_number: cleanText(parsed.data.panNumber),
        kyc_aadhaar_last4: aadhaar,
        kyc_aadhaar_submitted: Boolean(aadhaar),
        loan_interested: Boolean(parsed.data.loanInterested),
      },
      { onConflict: 'user_id' },
    )
    if (error) return { ok: false, message: error.message }

    await supabase
      .from('customers')
      .update({
        pan_number: cleanText(parsed.data.panNumber),
        aadhaar_last4: aadhaar,
      })
      .eq('profile_id', user.id)
  } else if (role !== 'employee' && role !== 'admin' && role !== 'user') {
    return { ok: false, message: 'This role is not supported for settings updates.' }
  }

  await recordAuditLog({
    actorId: user.id,
    action: 'settings.role_profile.updated',
    entityType: 'profile',
    entityId: user.id,
    metadata: { role },
  })

  refreshSettingsPaths(role)
  return { ok: true, message: 'Role settings saved.' }
}
