import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureAuthProfile } from '@/lib/auth/profile-bootstrap'
import { slugFromCustomerType } from '@/lib/onboarding/types'
import { recordAuditLog } from '@/lib/audit'

const chooseRoleSchema = z.object({
  customerType: z.enum(['land_owner', 'plot_seller', 'plot_buyer']),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Please sign in before choosing a role.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = chooseRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose a valid PlotKare workspace role.' }, { status: 400 })
  }

  try {
    await ensureAuthProfile({
      userId: user.id,
      email: user.email ?? null,
      fullName:
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.fullName === 'string'
          ? user.user_metadata.fullName
          : null,
      customerType: parsed.data.customerType,
    })
  } catch (error) {
    await recordAuditLog({
      actorId: user.id,
      action: 'auth.choose_role_profile_bootstrap_failed',
      entityType: 'profile',
      entityId: user.id,
      metadata: { reason: error instanceof Error ? error.name : 'unknown' },
    })
    return NextResponse.json(
      { error: 'We could not prepare your workspace profile. Please contact support.' },
      { status: 500 },
    )
  }

  const destination = `/onboarding/${slugFromCustomerType(parsed.data.customerType)}`

  await recordAuditLog({
    actorId: user.id,
    action: 'auth.role_selected',
    entityType: 'profile',
    entityId: user.id,
    metadata: { customer_type: parsed.data.customerType },
  })

  return NextResponse.json({ success: true, destination })
}
