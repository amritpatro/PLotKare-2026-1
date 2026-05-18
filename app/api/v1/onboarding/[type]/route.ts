import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk } from '@/lib/api/response'
import { submitOnboardingStepForUser } from '@/lib/onboarding/server'
import { customerTypeFromSlug } from '@/lib/onboarding/types'

type RouteContext = { params: Promise<{ type: string }> }

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUserContext()
  if ('response' in auth) return auth.response

  const { type } = await context.params
  const customerType = customerTypeFromSlug(type)
  if (!customerType) {
    return apiError('Invalid onboarding type.', 404, 'NOT_FOUND')
  }

  const formData = await request.formData()
  const stepRaw = formData.get('step')
  const step = Number(stepRaw)
  if (!Number.isInteger(step) || step < 1) {
    return apiError('Step number is required.', 400, 'INVALID_STEP')
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent')

  const result = await submitOnboardingStepForUser(
    auth.supabase,
    auth.user.id,
    customerType,
    step,
    formData,
    { ipAddress, userAgent },
  )

  if ('error' in result) {
    if (result.status === 422 && result.details) {
      return apiError(result.error, 422, 'VALIDATION_ERROR', result.details)
    }
    return apiError(result.error, result.status)
  }

  return apiOk(result)
}
