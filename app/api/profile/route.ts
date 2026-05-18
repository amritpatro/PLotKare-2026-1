import { profileUpdateSchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

export async function GET() {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  return apiOk({ profile: context.profile })
}

export async function PATCH(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const parsed = profileUpdateSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const payload = {
    ...(parsed.data.fullName !== undefined ? { full_name: parsed.data.fullName } : {}),
    ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
    ...(parsed.data.city !== undefined ? { city: parsed.data.city } : {}),
    ...(parsed.data.avatarPath !== undefined ? { avatar_path: parsed.data.avatarPath } : {}),
    ...(parsed.data.notificationPreferences !== undefined
      ? { notification_preferences: parsed.data.notificationPreferences }
      : {}),
  }

  const { data, error } = await context.supabase
    .from('profiles')
    .update(payload)
    .eq('id', context.user.id)
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'PROFILE_UPDATE_FAILED')

  await recordAuditLog({
    actorId: context.user.id,
    action: 'profile.updated',
    entityType: 'profile',
    entityId: context.user.id,
  })

  return apiOk({ profile: data })
}
