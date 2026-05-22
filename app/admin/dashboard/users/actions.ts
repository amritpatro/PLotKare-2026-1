'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  ADMIN_ACCOUNT_STATUSES,
  ADMIN_EMPLOYEE_ROLES,
  ADMIN_USER_ROLES,
  type AdminEmployeeRole,
  type AdminUserRole,
} from '@/lib/admin/status'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const roleAssignmentSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(ADMIN_USER_ROLES),
  employeeRole: z.enum(ADMIN_EMPLOYEE_ROLES).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
})

const accountStatusSchema = z.object({
  profileId: z.string().uuid(),
  note: z.string().trim().max(500).optional().or(z.literal('')),
})

const accountStatusUpdateSchema = z.object({
  profileId: z.string().uuid(),
  accountStatus: z.enum(ADMIN_ACCOUNT_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal('')),
})

function usersRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/users?${kind}=${code}`)
}

async function writeInternalNote(input: {
  actorId: string
  entityId: string
  note?: string | null
  action: string
  metadata?: Record<string, unknown>
}) {
  if (!input.note) return true

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('admin_internal_notes').insert({
    entity_type: 'profile',
    entity_id: input.entityId,
    author_id: input.actorId,
    note: input.note,
    metadata: {
      action: input.action,
      ...(input.metadata ?? {}),
    },
  })

  if (error) {
    console.error('Admin internal note write failed:', error)
    return false
  }

  return true
}

export async function assignUserRole(formData: FormData) {
  const parsed = roleAssignmentSchema.safeParse({
    profileId: formData.get('profileId'),
    role: formData.get('role'),
    employeeRole: formData.get('employeeRole') ?? '',
    note: formData.get('note') ?? '',
  })

  if (!parsed.success) usersRedirect('error', 'invalid_role_assignment')

  const { user } = await requirePageRole(['admin'])
  const { profileId, role, employeeRole, note } = parsed.data

  if (profileId === user.id && role !== 'admin') {
    usersRedirect('error', 'cannot_demote_self')
  }

  const supabase = createSupabaseAdminClient()
  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,employee_role')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError || !currentProfile) {
    console.error('Admin role assignment lookup failed:', profileError)
    usersRedirect('error', 'profile_not_found')
  }

  const nextEmployeeRole: AdminEmployeeRole | null =
    role === 'employee' ? ((employeeRole || 'verification_agent') as AdminEmployeeRole) : null

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      role: role as AdminUserRole,
      employee_role: nextEmployeeRole,
      role_assigned_at: new Date().toISOString(),
      role_assigned_by: user.id,
    })
    .eq('id', profileId)

  if (updateError) {
    console.error('Admin role assignment failed:', updateError)
    usersRedirect('error', 'role_assignment_failed')
  }

  if (role === 'employee' && nextEmployeeRole) {
    const { error: employeeError } = await supabase.from('employees').upsert(
      {
        profile_id: profileId,
        employee_role: nextEmployeeRole,
        active: true,
      },
      { onConflict: 'profile_id' },
    )

    if (employeeError) {
      console.error('Admin employee activation failed:', employeeError)
      usersRedirect('error', 'employee_activation_failed')
    }
  } else {
    const { error: employeeError } = await supabase
      .from('employees')
      .update({ active: false })
      .eq('profile_id', profileId)

    if (employeeError) {
      console.error('Admin employee deactivation failed:', employeeError)
      usersRedirect('error', 'employee_deactivation_failed')
    }
  }

  const noteWritten = await writeInternalNote({
    actorId: user.id,
    entityId: profileId,
    note,
    action: 'admin.user.role_assigned',
    metadata: {
      previous_role: currentProfile.role,
      previous_employee_role: currentProfile.employee_role,
      role,
      employee_role: nextEmployeeRole,
    },
  })

  if (!noteWritten) usersRedirect('error', 'internal_note_failed')

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.user.role_assigned',
    entityType: 'profile',
    entityId: profileId,
    metadata: {
      previous_role: currentProfile.role,
      previous_employee_role: currentProfile.employee_role,
      role,
      employee_role: nextEmployeeRole,
      note: note || null,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/users')
  revalidatePath('/admin/dashboard/audit')
  usersRedirect('success', 'role_assigned')
}

export async function updateAccountStatus(formData: FormData) {
  const parsed = accountStatusUpdateSchema.safeParse({
    profileId: formData.get('profileId'),
    accountStatus: formData.get('accountStatus'),
    note: formData.get('note') ?? '',
  })

  if (!parsed.success) usersRedirect('error', 'invalid_account_status')

  const { profileId, accountStatus, note } = parsed.data
  if (accountStatus === 'suspended') {
    return setAccountSuspension(profileId, note, true)
  }

  return setAccountStatus(profileId, accountStatus, note)
}

export async function suspendUser(formData: FormData) {
  const parsed = accountStatusSchema.safeParse({
    profileId: formData.get('profileId'),
    note: formData.get('note') ?? '',
  })

  if (!parsed.success) usersRedirect('error', 'invalid_account_status')
  return setAccountSuspension(parsed.data.profileId, parsed.data.note, true)
}

export async function unsuspendUser(formData: FormData) {
  const parsed = accountStatusSchema.safeParse({
    profileId: formData.get('profileId'),
    note: formData.get('note') ?? '',
  })

  if (!parsed.success) usersRedirect('error', 'invalid_account_status')
  return setAccountSuspension(parsed.data.profileId, parsed.data.note, false)
}

async function setAccountStatus(profileId: string, accountStatus: string, note?: string | null): Promise<never> {
  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()
  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id,account_status')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError || !currentProfile) {
    console.error('Admin account status lookup failed:', profileError)
    usersRedirect('error', 'profile_not_found')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      account_status: accountStatus,
      suspended_at: accountStatus === 'suspended' ? new Date().toISOString() : null,
      suspended_by: accountStatus === 'suspended' ? user.id : null,
    })
    .eq('id', profileId)

  if (error) {
    console.error('Admin account status update failed:', error)
    usersRedirect('error', 'account_status_failed')
  }

  await supabase.from('customers').update({ account_status: accountStatus }).eq('profile_id', profileId)

  const noteWritten = await writeInternalNote({
    actorId: user.id,
    entityId: profileId,
    note,
    action: 'admin.user.account_status_updated',
    metadata: {
      previous_account_status: currentProfile.account_status,
      account_status: accountStatus,
    },
  })

  if (!noteWritten) usersRedirect('error', 'internal_note_failed')

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.user.account_status_updated',
    entityType: 'profile',
    entityId: profileId,
    metadata: {
      previous_account_status: currentProfile.account_status,
      account_status: accountStatus,
      note: note || null,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/users')
  revalidatePath('/admin/dashboard/audit')
  usersRedirect('success', 'account_status_updated')
}

async function setAccountSuspension(profileId: string, note: string | null | undefined, suspended: boolean): Promise<never> {
  const { user } = await requirePageRole(['admin'])
  if (profileId === user.id && suspended) usersRedirect('error', 'cannot_suspend_self')

  return setAccountStatus(profileId, suspended ? 'suspended' : 'active', note)
}
