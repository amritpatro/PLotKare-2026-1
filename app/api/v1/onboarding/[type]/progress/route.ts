import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk } from '@/lib/api/response'
import { ensureCustomerTypeOnProfile, getOnboardingProgressForUser } from '@/lib/onboarding/server'
import { customerTypeFromSlug } from '@/lib/onboarding/types'

type RouteContext = { params: Promise<{ type: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUserContext()
  if ('response' in auth) return auth.response

  const { type } = await context.params
  const customerType = customerTypeFromSlug(type)
  if (!customerType) {
    return apiError('Invalid onboarding type.', 404, 'NOT_FOUND')
  }

  await ensureCustomerTypeOnProfile(auth.supabase, auth.user.id, customerType)
  const progress = await getOnboardingProgressForUser(auth.supabase, auth.user.id, customerType)

  return apiOk(progress)
}
