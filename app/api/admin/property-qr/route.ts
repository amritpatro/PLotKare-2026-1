import { z } from 'zod'
import { requireAdminContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'
import { evaluatePropertyReadiness } from '@/lib/property-care/readiness'

const schema = z.object({ propertyId: z.string().uuid(), approve: z.boolean() })

export async function POST(request: Request) {
  const context = await requireAdminContext()
  if ('response' in context) return context.response
  const parsed = schema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data, error } = await context.supabase.from('property_qr_settings').update({
    status: parsed.data.approve ? 'active' : 'draft', reviewed_by: context.user.id, reviewed_at: new Date().toISOString(), owner_enabled: parsed.data.approve,
  }).eq('property_id', parsed.data.propertyId).select('public_token,status').single()
  if (error || !data) return apiError('QR review could not be saved.', 400, 'QR_REVIEW_FAILED')
  await evaluatePropertyReadiness(context.supabase, parsed.data.propertyId, context.user.id)
  await recordAuditLog({ actorId: context.user.id, action: parsed.data.approve ? 'property_qr.approved' : 'property_qr.returned', entityType: 'property', entityId: parsed.data.propertyId })
  return apiOk({ qr: data })
}
