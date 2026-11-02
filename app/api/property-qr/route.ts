import { z } from 'zod'
import { requireRoleContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'
import { evaluatePropertyReadiness } from '@/lib/property-care/readiness'

const schema = z.object({
  propertyId: z.string().uuid(),
  action: z.enum(['request_review', 'pause', 'rotate', 'disable']),
  approximateLocationLabel: z.string().trim().max(160).optional(),
  publicSummary: z.string().trim().max(900).optional(),
})

export async function POST(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response
  const parsed = schema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data: property } = await context.supabase.from('properties').select('id,owner_profile_id').eq('id', parsed.data.propertyId).maybeSingle()
  if (!property || (!context.isAdmin && property.owner_profile_id !== context.user.id)) return apiError('You cannot change this QR setting.', 403, 'FORBIDDEN')

  const token = parsed.data.action === 'rotate' ? crypto.randomUUID().replaceAll('-', '') : undefined
  const patch: Record<string, unknown> = {
    approximate_location_label: parsed.data.approximateLocationLabel || null,
    public_summary: parsed.data.publicSummary || null,
  }
  if (parsed.data.action === 'request_review') Object.assign(patch, { status: 'pending_review', owner_enabled: true })
  if (parsed.data.action === 'pause') Object.assign(patch, { status: 'paused', owner_enabled: false })
  if (parsed.data.action === 'disable') Object.assign(patch, { status: 'revoked', owner_enabled: false })
  if (token) Object.assign(patch, { public_token: token, status: 'draft', owner_enabled: false, reviewed_at: null, reviewed_by: null })

  const { data, error } = await context.supabase.from('property_qr_settings').upsert({ property_id: parsed.data.propertyId, ...patch }, { onConflict: 'property_id' }).select('public_token,status,owner_enabled').single()
  if (error || !data) return apiError('Could not update the QR setting.', 400, 'QR_UPDATE_FAILED')
  await evaluatePropertyReadiness(context.supabase, parsed.data.propertyId, context.user.id)
  await recordAuditLog({ actorId: context.user.id, action: `property_qr.${parsed.data.action}`, entityType: 'property', entityId: parsed.data.propertyId })
  return apiOk({ qr: data, publicPath: `/p/${data.public_token}` })
}
