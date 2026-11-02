import { z } from 'zod'
import { requireRoleContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

const schema = z.object({
  propertyId: z.string().uuid(),
  requestType: z.enum(['offer', 'site_visit']),
  message: z.string().trim().min(5).max(1200),
  offerMinLakhs: z.coerce.number().positive().optional(),
  offerMaxLakhs: z.coerce.number().positive().optional(),
}).superRefine((value, ctx) => {
  if (value.requestType === 'offer' && (!value.offerMinLakhs || !value.offerMaxLakhs || value.offerMaxLakhs < value.offerMinLakhs)) ctx.addIssue({ code: 'custom', message: 'Provide a valid offer range.', path: ['offerMaxLakhs'] })
})

export async function POST(request: Request) {
  const context = await requireRoleContext(['customer'])
  if ('response' in context) return context.response
  if (context.profile.onboarding_completed !== true) return apiError('Complete your buyer profile before requesting a visit or sharing an offer.', 403, 'FORBIDDEN')
  const parsed = schema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data: qr } = await context.supabase.from('property_qr_settings').select('property_id').eq('property_id', parsed.data.propertyId).eq('status', 'active').eq('owner_enabled', true).maybeSingle()
  if (!qr) return apiError('This property is not accepting private interest right now.', 409, 'FORBIDDEN')
  const { data, error } = await context.supabase.from('property_interest_requests').insert({
    property_id: parsed.data.propertyId, request_type: parsed.data.requestType, buyer_profile_id: context.user.id,
    message: parsed.data.message, offer_min_lakhs: parsed.data.requestType === 'offer' ? parsed.data.offerMinLakhs : null,
    offer_max_lakhs: parsed.data.requestType === 'offer' ? parsed.data.offerMaxLakhs : null,
    status: parsed.data.requestType === 'site_visit' ? 'visit_requested' : 'new',
  }).select('id').single()
  if (error || !data) return apiError('We could not save your request.', 400, 'INTEREST_CREATE_FAILED')
  await recordAuditLog({ actorId: context.user.id, action: `property_interest.${parsed.data.requestType}_created`, entityType: 'property_interest', entityId: data.id, metadata: { propertyId: parsed.data.propertyId } })
  return apiOk({ id: data.id }, { status: 201 })
}

const ownerResponseSchema = z.object({ requestId: z.string().uuid(), action: z.enum(['decline', 'request_advisor']), response: z.string().trim().max(500).optional() })

export async function PATCH(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin', 'employee'])
  if ('response' in context) return context.response
  const parsed = ownerResponseSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data: interest } = await context.supabase.from('property_interest_requests').select('id,property_id,properties(owner_profile_id)').eq('id', parsed.data.requestId).maybeSingle()
  const property = Array.isArray((interest as any)?.properties) ? (interest as any).properties[0] : (interest as any)?.properties
  if (!interest || (!context.isAdmin && !context.isEmployee && property?.owner_profile_id !== context.user.id)) return apiError('You cannot manage this interest record.', 403, 'FORBIDDEN')
  const status = parsed.data.action === 'decline' ? 'declined' : 'reviewing'
  const { error } = await context.supabase.from('property_interest_requests').update({ status, owner_response: parsed.data.response || (parsed.data.action === 'decline' ? 'Thank you for your interest. This opportunity is not proceeding at this time.' : 'Please have a verified PlotKare advisor coordinate the next step.'), responded_at: new Date().toISOString() }).eq('id', interest.id)
  if (error) return apiError('Could not update this interest record.', 400, 'INTEREST_UPDATE_FAILED')
  await recordAuditLog({ actorId: context.user.id, action: `property_interest.${parsed.data.action}`, entityType: 'property_interest', entityId: interest.id })
  return apiOk({ updated: true })
}
