import crypto from 'node:crypto'

type PlanTier = 'basic' | 'standard' | 'premium'

const planEnvByTier: Record<PlanTier, string> = {
  basic: 'RAZORPAY_PLAN_BASIC_ID',
  standard: 'RAZORPAY_PLAN_STANDARD_ID',
  premium: 'RAZORPAY_PLAN_PREMIUM_ID',
}

function requireRazorpayEnv() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay test keys are not configured.')
  }

  return { keyId, keySecret }
}

export function getRazorpayPlanId(plan: PlanTier) {
  return process.env[planEnvByTier[plan]]
}

export async function createRazorpaySubscription(input: {
  plan: PlanTier
  customerNotify?: boolean
  totalCount?: number
  notes?: Record<string, string>
}) {
  const { keyId, keySecret } = requireRazorpayEnv()
  const planId = getRazorpayPlanId(input.plan)

  if (!planId) throw new Error(`Razorpay plan id is missing for ${input.plan}.`)

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: input.totalCount ?? 12,
      customer_notify: input.customerNotify ?? 1,
      notes: input.notes ?? {},
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.description || 'Razorpay subscription creation failed.')
  }

  return body
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured.')
  if (!signature) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
}
