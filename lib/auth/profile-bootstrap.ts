import type { User } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { slugFromCustomerType, type CustomerType } from '@/lib/onboarding/types'
import { isUserRole, type UserRole } from '@/lib/supabase/types'

const customerRoleByType: Record<CustomerType, UserRole> = {
  land_owner: 'land_owner',
  plot_seller: 'plot_seller',
  plot_buyer: 'customer',
}

type ProfileBootstrapInput = {
  userId: string
  email?: string | null
  fullName?: string | null
  customerType?: CustomerType | null
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function customerTypeFromMetadata(metadata: User['user_metadata'] | undefined): CustomerType | null {
  const value = asText(metadata?.customer_type || metadata?.customerType)
  if (value === 'land_owner' || value === 'plot_seller' || value === 'plot_buyer') return value
  return null
}

function fullNameFromMetadata(metadata: User['user_metadata'] | undefined) {
  return asText(metadata?.full_name || metadata?.fullName)
}

function safeCustomerRole(customerType?: CustomerType | null): UserRole {
  return customerType ? customerRoleByType[customerType] : 'user'
}

async function inferLegacyCustomerType(userId: string): Promise<CustomerType | null> {
  const admin = createSupabaseAdminClient()
  const [{ data: owner }, { data: seller }, { data: customer }] = await Promise.all([
    admin.from('owners').select('id').eq('profile_id', userId).limit(1).maybeSingle(),
    admin.from('sellers').select('id').eq('profile_id', userId).limit(1).maybeSingle(),
    admin.from('customers').select('id').eq('profile_id', userId).limit(1).maybeSingle(),
  ])

  const matches = [
    owner ? 'land_owner' : null,
    seller ? 'plot_seller' : null,
    customer ? 'plot_buyer' : null,
  ].filter(Boolean) as CustomerType[]

  return matches.length === 1 ? matches[0] : null
}

async function ensureRoleDetailRecord(input: Required<Pick<ProfileBootstrapInput, 'userId'>> & ProfileBootstrapInput) {
  if (!input.customerType) return

  const admin = createSupabaseAdminClient()

  const assertUpsert = (error: { message?: string } | null, table: string) => {
    if (error) throw new Error(`Could not bootstrap ${table}: ${error.message ?? 'unknown database error'}`)
  }

  if (input.customerType === 'land_owner') {
    const { error: ownerError } = await admin
      .from('owners')
      .upsert({ profile_id: input.userId, verification_status: 'submitted' }, { onConflict: 'profile_id' })
    assertUpsert(ownerError, 'owner profile')
    const { error: detailsError } = await admin.from('land_owner_details').upsert({ user_id: input.userId }, { onConflict: 'user_id' })
    assertUpsert(detailsError, 'land owner details')
    return
  }

  if (input.customerType === 'plot_seller') {
    const { error: sellerError } = await admin
      .from('sellers')
      .upsert(
        {
          profile_id: input.userId,
          company_name: input.fullName || input.email || 'PlotKare Seller',
          verification_status: 'submitted',
        },
        { onConflict: 'profile_id' },
      )
    assertUpsert(sellerError, 'seller profile')
    const { error: detailsError } = await admin.from('plot_seller_details').upsert({ user_id: input.userId }, { onConflict: 'user_id' })
    assertUpsert(detailsError, 'plot seller details')
    return
  }

  const { error: customerError } = await admin
    .from('customers')
    .upsert(
      {
        profile_id: input.userId,
        full_name: input.fullName || input.email || 'PlotKare Customer',
        email: input.email ?? null,
        account_status: 'active',
        kyc_status: 'submitted',
      },
      { onConflict: 'profile_id' },
    )
  assertUpsert(customerError, 'customer profile')
  const { error: detailsError } = await admin.from('plot_buyer_details').upsert({ user_id: input.userId }, { onConflict: 'user_id' })
  assertUpsert(detailsError, 'plot buyer details')
}

export function authUserBootstrapInput(user: User, customerType?: CustomerType | null): ProfileBootstrapInput {
  const metadataCustomerType = customerTypeFromMetadata(user.user_metadata)
  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: fullNameFromMetadata(user.user_metadata),
    customerType: customerType ?? metadataCustomerType,
  }
}

export async function ensureAuthProfile(input: ProfileBootstrapInput) {
  const admin = createSupabaseAdminClient()
  const customerType = input.customerType ?? null
  const selectedRole = safeCustomerRole(customerType)

  const { data: existing, error: existingError } = await admin
    .from('profiles')
    .select('id,role,customer_type,onboarding_status,onboarding_completed')
    .eq('id', input.userId)
    .maybeSingle()

  if (existingError) throw existingError

  if (!existing) {
    const { error } = await admin.from('profiles').insert({
      id: input.userId,
      email: input.email ?? '',
      full_name: input.fullName ?? '',
      customer_type: customerType,
      role: selectedRole,
      onboarding_status: customerType ? 'in_progress' : 'pending',
      onboarding_completed: false,
      onboarding_notes: {
        profile_bootstrapped_at: new Date().toISOString(),
        profile_bootstrapped_by: 'auth_route',
      },
    })
    if (error) throw error

    await ensureRoleDetailRecord({ ...input, userId: input.userId, customerType })
    return {
      created: true,
      role: selectedRole,
      customerType,
      destination: customerType ? `/onboarding/${slugFromCustomerType(customerType)}` : '/auth/choose-role',
    }
  }

  const updates: Record<string, unknown> = {}
  const currentRole = isUserRole(existing.role) ? existing.role : 'user'
  const inferredCustomerType =
    !customerType && !existing.customer_type && currentRole !== 'admin' && currentRole !== 'employee'
      ? await inferLegacyCustomerType(input.userId)
      : null
  const resolvedCustomerType = customerType ?? existing.customer_type ?? inferredCustomerType
  const nextRole =
    currentRole === 'admin' || currentRole === 'employee'
      ? currentRole
      : resolvedCustomerType
      ? safeCustomerRole(resolvedCustomerType)
      : currentRole

  if (!existing.customer_type && resolvedCustomerType) updates.customer_type = resolvedCustomerType
  if (currentRole !== nextRole) updates.role = nextRole
  if (resolvedCustomerType && existing.onboarding_status !== 'completed') {
    updates.onboarding_status = 'in_progress'
    updates.onboarding_completed = false
  }
  if (input.email) updates.email = input.email
  if (input.fullName) updates.full_name = input.fullName

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', input.userId)
    if (error) throw error
  }

  await ensureRoleDetailRecord({ ...input, userId: input.userId, customerType: resolvedCustomerType })

  return {
    created: false,
    role: nextRole,
    customerType: resolvedCustomerType,
    destination: resolvedCustomerType ? `/onboarding/${slugFromCustomerType(resolvedCustomerType)}` : '/auth/choose-role',
  }
}
