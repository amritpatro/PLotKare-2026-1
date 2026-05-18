import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyRazorpayWebhook } from '@/lib/razorpay'
import { apiError, apiOk } from '@/lib/api/response'
import { captureServerEvent } from '@/lib/analytics/server'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  try {
    if (!verifyRazorpayWebhook(rawBody, signature)) {
      return apiError('Invalid Razorpay webhook signature.', 401, 'INVALID_SIGNATURE')
    }
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Webhook verification failed.', 500, 'WEBHOOK_NOT_CONFIGURED')
  }

  const event = JSON.parse(rawBody)
  const eventType = String(event.event ?? 'unknown')
  const payment = event.payload?.payment?.entity
  const subscription = event.payload?.subscription?.entity
  const ownerId = payment?.notes?.owner_id || subscription?.notes?.owner_id || null

  const supabase = createSupabaseAdminClient()
  const { data: storedSubscription } =
    subscription?.id
      ? await supabase
          .from('subscriptions')
          .update({ status: subscription.status ?? eventType, metadata: subscription })
          .eq('provider_subscription_id', subscription.id)
          .select('id')
          .maybeSingle()
      : { data: null }

  let paymentId: string | null = null
  if (payment?.id && ownerId) {
    const { data } = await supabase
      .from('payments')
      .insert({
        owner_id: ownerId,
        description: `Razorpay ${eventType}`,
        amount: Number(payment.amount ?? 0) / 100,
        status: payment.status === 'captured' ? 'Paid' : payment.status === 'failed' ? 'Failed' : 'Pending',
        paid_at: payment.captured_at ? new Date(payment.captured_at * 1000).toISOString() : null,
      })
      .select('id')
      .maybeSingle()

    paymentId = data?.id ?? null
  }

  await supabase.from('payment_events').upsert({
    provider: 'razorpay',
    event_id: event.payload?.payment?.entity?.id ? `${eventType}:${event.payload.payment.entity.id}` : event.id ?? null,
    event_type: eventType,
    owner_id: ownerId,
    subscription_id: storedSubscription?.id ?? null,
    payment_id: paymentId,
    payload: event,
  })

  if (ownerId) {
    await captureServerEvent({
      distinctId: ownerId,
      event: `razorpay_${eventType.replace(/\./g, '_')}`,
      properties: { provider: 'razorpay' },
    })
  }

  return apiOk({ received: true })
}
