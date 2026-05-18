import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createRazorpaySubscription } from '@/lib/razorpay'
import { razorpaySubscriptionSchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { captureServerEvent } from '@/lib/analytics/server'
import { recordAuditLog } from '@/lib/audit'

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const parsed = razorpaySubscriptionSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  try {
    const razorpaySubscription = await createRazorpaySubscription({
      plan: parsed.data.plan,
      notes: {
        owner_id: context.user.id,
        email: context.user.email ?? '',
        plan: parsed.data.plan,
      },
    })

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('subscriptions')
      .insert({
        owner_id: context.user.id,
        provider_subscription_id: razorpaySubscription.id,
        provider_plan_id: razorpaySubscription.plan_id,
        plan: parsed.data.plan,
        status: razorpaySubscription.status ?? 'created',
        metadata: razorpaySubscription,
      })
      .select('*')
      .single()

    if (error) return apiError(error.message, 400, 'SUBSCRIPTION_STORE_FAILED')

    await captureServerEvent({
      distinctId: context.user.id,
      event: 'payment_subscription_started',
      properties: { plan: parsed.data.plan, provider: 'razorpay' },
    })

    await recordAuditLog({
      actorId: context.user.id,
      action: 'razorpay.subscription.created',
      entityType: 'subscription',
      entityId: data.id,
    })

    return apiOk({ subscription: data, razorpay: razorpaySubscription }, { status: 201 })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Razorpay subscription failed.', 400, 'RAZORPAY_FAILED')
  }
}
