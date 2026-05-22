import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_BYTES,
  MAX_KYC_FILE_BYTES,
} from '@/lib/onboarding/config'
import { maskBankAccountNumber } from '@/lib/onboarding/mask'
import { getStepSchema } from '@/lib/onboarding/schemas'
import type {
  CustomerType,
  OnboardingProgressResponse,
  OnboardingResumeResponse,
  OnboardingSubmitResponse,
} from '@/lib/onboarding/types'
import {
  CUSTOMER_TYPES,
  getMaxSteps,
  resolveCustomerType,
} from '@/lib/onboarding/types'

const DETAIL_TABLE: Record<CustomerType, string> = {
  land_owner: 'land_owner_details',
  plot_seller: 'plot_seller_details',
  plot_buyer: 'plot_buyer_details',
}

const FILE_FIELDS: Record<CustomerType, Record<number, string[]>> = {
  land_owner: {
    3: ['property_papers', 'ec_certificate'],
  },
  plot_seller: {
    2: ['gst_certificate', 'pan_card', 'address_proof'],
  },
  plot_buyer: {
    2: ['kyc_pan_file'],
  },
}

const KYC_FILE_FIELDS = new Set(['kyc_pan_file'])

export { maskBankAccountNumber }

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

function validateFile(file: File, isKyc = false) {
  const maxBytes = isKyc ? MAX_KYC_FILE_BYTES : MAX_FILE_BYTES
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `Invalid file type for ${file.name}. Use PDF, JPG, or PNG.`
  }
  if (file.size > maxBytes) {
    const limitMb = isKyc ? 5 : 10
    return `${file.name} exceeds ${limitMb}MB limit.`
  }
  return null
}

export async function uploadOnboardingFile(
  userId: string,
  fieldName: string,
  file: File,
): Promise<{ path: string; mime_type: string; size: number } | { error: string }> {
  const isKyc = KYC_FILE_FIELDS.has(fieldName)
  const validationError = validateFile(file, isKyc)
  if (validationError) return { error: validationError }

  const admin = createSupabaseAdminClient()
  const objectPath = `${userId}/onboarding/${fieldName}/${Date.now()}-${safeFileName(file.name)}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage.from('user-documents').upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  })

  if (error) return { error: error.message }

  return { path: objectPath, mime_type: file.type, size: file.size }
}

export async function recordOnboardingAuditLog(
  supabase: SupabaseClient,
  input: {
    userId: string
    customerType: CustomerType
    currentStep: number
    lastCompletedStep: number
    action: string
    dataSnapshot: Record<string, unknown>
    ipAddress?: string | null
    userAgent?: string | null
  },
) {
  await supabase.from('onboarding_audit_log').insert({
    user_id: input.userId,
    customer_type: input.customerType,
    current_step: input.currentStep,
    last_completed_step: input.lastCompletedStep,
    action: input.action,
    data_snapshot: input.dataSnapshot,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  })
}

async function ensureDetailRow(
  supabase: SupabaseClient,
  customerType: CustomerType,
  userId: string,
) {
  const table = DETAIL_TABLE[customerType]
  const { data: existing } = await supabase.from(table).select('id').eq('user_id', userId).maybeSingle()
  if (existing) return

  await supabase.from(table).insert({ user_id: userId })
}

export async function ensureCustomerTypeOnProfile(
  supabase: SupabaseClient,
  userId: string,
  customerType: CustomerType,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('customer_type, customer_category, onboarding_status, onboarding_completed')
    .eq('id', userId)
    .single()

  if (!profile) return

  const resolved = resolveCustomerType(profile)
  const updates: Record<string, unknown> = {}

  if (!profile.customer_type) {
    updates.customer_type = customerType
  } else if (resolved && resolved !== customerType) {
    // User explicitly chose flow; align profile to active onboarding slug
    updates.customer_type = customerType
  }

  if (profile.onboarding_status === 'pending') {
    updates.onboarding_status = 'in_progress'
  }

  if (profile.onboarding_completed === true && profile.onboarding_status !== 'completed') {
    updates.onboarding_completed = false
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('profiles').update(updates).eq('id', userId)
  }
}

function mapStepPayload(customerType: CustomerType, step: number, data: Record<string, unknown>) {
  if (customerType === 'land_owner') {
    if (step === 1) {
      return {
        property_location: data.property_location,
        property_size_sqyards: data.property_size_sqyards,
        property_facing: data.property_facing,
        is_corner_plot: data.is_corner_plot ?? false,
      }
    }
    if (step === 2) {
      return {
        property_type: data.property_type,
        interested_in: data.interested_in,
      }
    }
    if (step === 3) {
      return {
        documents_submitted: data.documents_submitted,
      }
    }
  }

  if (customerType === 'plot_seller') {
    if (step === 1) {
      return {
        company_name: data.company_name,
        gst_number: String(data.gst_number ?? '').toUpperCase(),
        pan_number: String(data.pan_number ?? '').toUpperCase(),
        address: data.address,
      }
    }
    if (step === 2) {
      return {}
    }
    if (step === 3) {
      return {
        commission_model: data.commission_model,
        commission_rate: data.commission_model === 'commission_percent' ? data.commission_rate : null,
        listing_fee_amount: data.commission_model === 'listing_fee' ? data.listing_fee_amount : null,
      }
    }
    if (step === 4) {
      return {
        bank_account_holder: data.bank_account_holder,
        bank_account_number: data.bank_account_number,
        bank_ifsc: String(data.bank_ifsc ?? '').toUpperCase(),
        bank_account_type: data.account_type,
      }
    }
  }

  if (customerType === 'plot_buyer') {
    if (step === 1) {
      return {
        investment_budget_lakhs: data.investment_budget_lakhs,
        investment_budget_max_lakhs: data.investment_budget_max_lakhs,
        preferred_locations: data.preferred_locations,
        preferred_plot_size_min: data.preferred_plot_size_min ?? null,
        preferred_plot_size_max: data.preferred_plot_size_max ?? null,
        preferred_property_types: data.preferred_property_types ?? [],
      }
    }
    if (step === 2) {
      return {
        kyc_aadhaar_last4: data.kyc_aadhaar_last_4,
        kyc_pan_submitted: data.kyc_pan_submitted ?? false,
        kyc_aadhaar_submitted: true,
      }
    }
    if (step === 3) {
      return {
        bank_account_holder: data.bank_account_holder,
        bank_account_number: data.bank_account_number,
        bank_ifsc: String(data.bank_ifsc ?? '').toUpperCase(),
        bank_account_type: data.account_type,
      }
    }
    if (step === 4) {
      return {
        loan_interested: data.loan_interested ?? false,
        loan_amount_needed: data.loan_interested ? data.loan_amount_needed : null,
        employer_name: data.loan_interested ? data.employer_name : null,
        monthly_income: data.loan_interested ? data.monthly_income : null,
        employment_type: data.loan_interested ? data.employment_type : null,
      }
    }
  }

  return {}
}

function facingFromShortCode(value: unknown) {
  const facing = String(value ?? '').toUpperCase()
  if (facing === 'N') return 'North'
  if (facing === 'S') return 'South'
  if (facing === 'W') return 'West'
  return 'East'
}

function operationalReviewStatus(value: unknown) {
  const status = String(value ?? '').toLowerCase()
  if (status === 'verified') return 'approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'under_review') return 'under_review'
  if (status === 'needs_clarification') return 'needs_clarification'
  return 'submitted'
}

function throwDbError(error: { message?: string } | null | undefined) {
  if (error) throw new Error(error.message ?? 'Database operation failed.')
}

async function syncOperationalRecordsFromOnboarding(userId: string, customerType: CustomerType) {
  const admin = createSupabaseAdminClient()
  const row = await fetchDetailRow(admin, customerType, userId)
  if (!row) return

  if (customerType === 'land_owner') {
    const { error: ownerError } = await admin
      .from('owners')
      .upsert({ profile_id: userId, verification_status: 'submitted' }, { onConflict: 'profile_id' })
    throwDbError(ownerError)

    const location = String(row.property_location ?? '').trim()
    const sqYards = Number(row.property_size_sqyards ?? 0)
    if (!location || !Number.isFinite(sqYards) || sqYards < 1) return

    const plotNumber = `ONB-${userId.slice(0, 8).toUpperCase()}`
    const title = `Onboarding plot - ${location}`

    const { data: existingPlot, error: existingPlotError } = await admin
      .from('plots')
      .select('id,property_id')
      .eq('owner_id', userId)
      .eq('plot_number', plotNumber)
      .limit(1)
      .maybeSingle()
    throwDbError(existingPlotError)

    let propertyId = existingPlot?.property_id as string | null | undefined

    if (propertyId) {
      const { error: propertyUpdateError } = await admin
        .from('properties')
        .update({
          title,
          address: location,
          city: location,
          property_kind: 'plot',
          lifecycle_status: 'registered',
          verification_status: 'submitted',
        })
        .eq('id', propertyId)
      throwDbError(propertyUpdateError)
    } else {
      const { data: property, error: propertyError } = await admin
        .from('properties')
        .insert({
          owner_profile_id: userId,
          property_kind: 'plot',
          title,
          address: location,
          city: location,
          lifecycle_status: 'registered',
          verification_status: 'submitted',
          created_by: userId,
        })
        .select('id')
        .single()

      throwDbError(propertyError)
      if (!property) throw new Error('Property record was not returned after creation.')
      propertyId = property.id
    }

    const plotPayload = {
      owner_id: userId,
      property_id: propertyId,
      plot_number: plotNumber,
      location,
      sq_yards: sqYards,
      facing: facingFromShortCode(row.property_facing),
      corner_plot: Boolean(row.is_corner_plot),
      purchase_price_lakhs: 0,
      current_value_lakhs: 0,
      status: 'registered',
      lifecycle_status: 'registered',
      verification_status: 'submitted',
      last_inspection: new Date().toISOString().slice(0, 10),
    }

    if (existingPlot) {
      const { error: plotUpdateError } = await admin.from('plots').update(plotPayload).eq('id', existingPlot.id)
      throwDbError(plotUpdateError)
    } else {
      const { error: plotInsertError } = await admin.from('plots').insert(plotPayload)
      throwDbError(plotInsertError)
    }
  }

  if (customerType === 'plot_seller') {
    const { error: sellerError } = await admin
      .from('sellers')
      .upsert(
        {
          profile_id: userId,
          company_name: row.company_name ?? 'PlotKare Seller',
          gst_number: row.gst_number || null,
          pan_number: row.pan_number || null,
          verification_status: operationalReviewStatus(row.verification_status),
        },
        { onConflict: 'profile_id' },
      )
    throwDbError(sellerError)
  }

  if (customerType === 'plot_buyer') {
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('full_name,email,phone')
      .eq('id', userId)
      .maybeSingle()
    throwDbError(profileError)

    const { error: customerError } = await admin
      .from('customers')
      .upsert(
        {
          profile_id: userId,
          full_name: profile?.full_name || profile?.email || 'PlotKare Customer',
          email: profile?.email ?? null,
          phone: profile?.phone ?? null,
          account_status: 'active',
          kyc_status: operationalReviewStatus(row.kyc_status),
        },
        { onConflict: 'profile_id' },
      )
    throwDbError(customerError)
  }
}

async function fetchDetailRow(supabase: SupabaseClient, customerType: CustomerType, userId: string) {
  const { data } = await supabase.from(DETAIL_TABLE[customerType]).select('*').eq('user_id', userId).maybeSingle()
  return data as Record<string, unknown> | null
}

function buildSavedData(customerType: CustomerType, row: Record<string, unknown> | null): Record<string, unknown> {
  if (!row) return {}

  if (customerType === 'land_owner') {
    return {
      property_location: row.property_location,
      property_size_sqyards: row.property_size_sqyards,
      property_facing: row.property_facing,
      is_corner_plot: row.is_corner_plot,
      property_type: row.property_type,
      interested_in: row.interested_in,
      documents_submitted: row.documents_submitted,
    }
  }

  if (customerType === 'plot_seller') {
    return {
      company_name: row.company_name,
      gst_number: row.gst_number,
      pan_number: row.pan_number,
      address: row.address,
      business_documents: row.business_documents,
      commission_model: row.commission_model,
      commission_rate: row.commission_rate,
      listing_fee_amount: row.listing_fee_amount,
      bank_account_holder: row.bank_account_holder,
      bank_account_number: row.bank_account_number
        ? maskBankAccountNumber(String(row.bank_account_number))
        : undefined,
      bank_ifsc: row.bank_ifsc,
      account_type: row.bank_account_type,
    }
  }

  return {
    investment_budget_lakhs: row.investment_budget_lakhs,
    investment_budget_max_lakhs: row.investment_budget_max_lakhs,
    preferred_locations: row.preferred_locations,
    preferred_plot_size_min: row.preferred_plot_size_min,
    preferred_plot_size_max: row.preferred_plot_size_max,
    preferred_property_types: row.preferred_property_types,
    kyc_aadhaar_last_4: row.kyc_aadhaar_last4,
    kyc_pan_submitted: row.kyc_pan_submitted,
    bank_account_holder: row.bank_account_holder,
    bank_account_number: row.bank_account_number
      ? maskBankAccountNumber(String(row.bank_account_number))
      : undefined,
    bank_ifsc: row.bank_ifsc,
    account_type: row.bank_account_type,
    loan_interested: row.loan_interested,
    loan_amount_needed: row.loan_amount_needed,
    employer_name: row.employer_name,
    monthly_income: row.monthly_income,
    employment_type: row.employment_type,
  }
}

function inferCompletedSteps(customerType: CustomerType, row: Record<string, unknown> | null): number[] {
  if (!row) return []
  const completed: number[] = []

  if (customerType === 'land_owner') {
    if (row.property_location && row.property_size_sqyards) completed.push(1)
    if (row.property_type && Array.isArray(row.interested_in) && row.interested_in.length > 0) completed.push(2)
    const docs = row.documents_submitted as Record<string, unknown> | undefined
    if (docs && Object.keys(docs).length > 0) completed.push(3)
  }

  if (customerType === 'plot_seller') {
    if (row.company_name && row.gst_number) completed.push(1)
    const docs = row.business_documents as Record<string, unknown> | undefined
    if (docs?.gst_cert && docs?.pan && docs?.address_proof) completed.push(2)
    if (row.commission_model) completed.push(3)
    if (row.bank_account_number) completed.push(4)
  }

  if (customerType === 'plot_buyer') {
    if (row.investment_budget_lakhs) completed.push(1)
    if (row.kyc_aadhaar_last4) completed.push(2)
    if (row.bank_account_number) completed.push(3)
  }

  return completed
}

async function getLastCompletedFromAudit(
  supabase: SupabaseClient,
  userId: string,
  customerType: CustomerType,
) {
  const { data } = await supabase
    .from('onboarding_audit_log')
    .select('last_completed_step')
    .eq('user_id', userId)
    .eq('customer_type', customerType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.last_completed_step ?? 0
}

export async function getOnboardingProgressForUser(
  supabase: SupabaseClient,
  userId: string,
  customerType: CustomerType,
): Promise<OnboardingProgressResponse> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, onboarding_status, customer_type')
    .eq('id', userId)
    .single()

  const row = await fetchDetailRow(supabase, customerType, userId)
  const inferredSteps = inferCompletedSteps(customerType, row)
  const auditLast = await getLastCompletedFromAudit(supabase, userId, customerType)
  const lastCompleted = Math.max(auditLast, inferredSteps.length ? Math.max(...inferredSteps) : 0)
  const completedSteps = Array.from(new Set([...inferredSteps, ...Array.from({ length: lastCompleted }, (_, i) => i + 1)]))
  const maxSteps = getMaxSteps(customerType)
  const completed = profile?.onboarding_completed === true || profile?.onboarding_status === 'completed'
  const currentStep = completed ? maxSteps + 1 : Math.min(lastCompleted + 1, maxSteps)

  return {
    current_step: currentStep,
    last_completed_step: lastCompleted,
    completed_steps: completedSteps,
    saved_data: buildSavedData(customerType, row),
    onboarding_status: completed ? 'completed' : profile?.onboarding_status ?? 'pending',
    next_action: completed ? 'view_status' : 'continue',
  }
}

export async function resumeOnboardingForUser(
  supabase: SupabaseClient,
  userId: string,
  customerType: CustomerType,
): Promise<OnboardingResumeResponse> {
  const progress = await getOnboardingProgressForUser(supabase, userId, customerType)
  const welcomeBack = progress.last_completed_step > 0 && progress.onboarding_status !== 'completed'

  return {
    step_number: progress.current_step,
    saved_data: progress.saved_data,
    skip_to_step: progress.current_step,
    welcome_back: welcomeBack,
  }
}

async function mergeFileUploads(
  userId: string,
  customerType: CustomerType,
  step: number,
  formData: FormData,
  bodyData: Record<string, unknown>,
): Promise<{ data: Record<string, unknown>; error?: string }> {
  const fields = FILE_FIELDS[customerType]?.[step] ?? []
  const merged = { ...bodyData }

  const docUpdates: Record<string, unknown> = {}

  for (const field of fields) {
    const file = formData.get(field)
    if (!(file instanceof File) || file.size === 0) continue

    const uploaded = await uploadOnboardingFile(userId, field, file)
    if ('error' in uploaded) return { data: merged, error: uploaded.error }

    if (customerType === 'land_owner' && step === 3) {
      docUpdates[field] = { uploaded: true, path: uploaded.path, mime_type: uploaded.mime_type }
    } else if (customerType === 'plot_seller' && step === 2) {
      const key =
        field === 'gst_certificate' ? 'gst_cert' : field === 'pan_card' ? 'pan' : 'address_proof'
      docUpdates[key] = { uploaded: true, path: uploaded.path, mime_type: uploaded.mime_type }
    } else if (customerType === 'plot_buyer' && step === 2) {
      merged.kyc_pan_submitted = true
      docUpdates.kyc_pan = { uploaded: true, path: uploaded.path, mime_type: uploaded.mime_type }
    }
  }

  if (customerType === 'land_owner' && step === 3) {
    const existing = (merged.documents_submitted as Record<string, unknown>) ?? {}
    merged.documents_submitted = { ...existing, ...docUpdates, skipped: bodyData.documents_skipped === true }
  }

  if (customerType === 'plot_seller' && step === 2) {
    const existing = (merged.business_documents as Record<string, unknown>) ?? {}
    merged.business_documents = { ...existing, ...docUpdates }
  }

  if (customerType === 'plot_buyer' && step === 2 && Object.keys(docUpdates).length) {
    merged.kyc_documents = docUpdates
  }

  return { data: merged }
}

export async function submitOnboardingStepForUser(
  supabase: SupabaseClient,
  userId: string,
  customerType: CustomerType,
  step: number,
  formData: FormData,
  meta: { ipAddress?: string | null; userAgent?: string | null },
): Promise<OnboardingSubmitResponse | { error: string; status: number; details?: unknown }> {
  if (!CUSTOMER_TYPES.includes(customerType)) {
    return { error: 'Invalid customer type.', status: 400 }
  }

  const maxSteps = getMaxSteps(customerType)
  if (step < 1 || step > maxSteps) {
    return { error: 'Invalid step number.', status: 400 }
  }

  await ensureCustomerTypeOnProfile(supabase, userId, customerType)
  await ensureDetailRow(supabase, customerType, userId)

  let bodyData: Record<string, unknown> = {}
  const rawData = formData.get('data')
  if (typeof rawData === 'string' && rawData) {
    try {
      bodyData = JSON.parse(rawData) as Record<string, unknown>
    } catch {
      return { error: 'Invalid form data payload.', status: 400 }
    }
  }

  const fileMerge = await mergeFileUploads(userId, customerType, step, formData, bodyData)
  if (fileMerge.error) return { error: fileMerge.error, status: 400 }
  bodyData = fileMerge.data

  const schema = getStepSchema(customerType, step)
  if (schema) {
    const parsed = schema.safeParse(bodyData)
    if (!parsed.success) {
      return { error: 'Validation failed.', status: 422, details: parsed.error.flatten() }
    }
    bodyData = parsed.data as Record<string, unknown>
  }

  const payload = mapStepPayload(customerType, step, bodyData)
  const table = DETAIL_TABLE[customerType]

  const { error: updateError } = await supabase.from(table).update(payload).eq('user_id', userId)
  if (updateError) return { error: updateError.message, status: 400 }

  const isFinal = step === maxSteps
  if (isFinal) {
    if (customerType === 'plot_buyer') {
      const { error: detailStatusError } = await supabase.from(table).update({ kyc_status: 'pending' }).eq('user_id', userId)
      if (detailStatusError) return { error: detailStatusError.message, status: 400 }
    } else {
      const { error: detailStatusError } = await supabase.from(table).update({ verification_status: 'pending' }).eq('user_id', userId)
      if (detailStatusError) return { error: detailStatusError.message, status: 400 }
    }

    try {
      await syncOperationalRecordsFromOnboarding(userId, customerType)
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Onboarding saved, but dashboard sync failed.',
        status: 500,
      }
    }

    const { error: profileCompleteError } = await supabase
      .from('profiles')
      .update({ onboarding_status: 'completed', onboarding_completed: true })
      .eq('id', userId)
    if (profileCompleteError) return { error: profileCompleteError.message, status: 400 }
  } else {
    await supabase
      .from('profiles')
      .update({ onboarding_status: 'in_progress', onboarding_completed: false })
      .eq('id', userId)
  }

  await recordOnboardingAuditLog(supabase, {
    userId,
    customerType,
    currentStep: isFinal ? maxSteps : step + 1,
    lastCompletedStep: step,
    action: isFinal ? 'onboarding_completed' : 'step_submitted',
    dataSnapshot: bodyData,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  })

  return {
    success: true,
    current_step: step,
    next_step: isFinal ? null : step + 1,
    completed: isFinal,
    message: isFinal
      ? 'Onboarding complete. Verification is pending.'
      : `Step ${step} saved successfully.`,
  }
}
