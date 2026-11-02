import { z } from 'zod'
import { requireRoleContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'
import { evaluatePropertyReadiness } from '@/lib/property-care/readiness'

const createCareItemSchema = z.object({
  propertyId: z.string().uuid(),
  category: z.enum(['documents', 'location', 'boundary', 'inspection', 'photos', 'tax_reminder', 'utility_reminder', 'local_issue', 'fence_signboard', 'development_readiness', 'other']),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueAt: z.string().datetime().optional(),
})

export async function GET(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin', 'employee', 'customer'])
  if ('response' in context) return context.response
  const propertyId = new URL(request.url).searchParams.get('propertyId')
  if (!propertyId || !z.string().uuid().safeParse(propertyId).success) return apiError('A valid property is required.', 422, 'VALIDATION_ERROR')

  const [property, careItems, events, readiness, qr, interests] = await Promise.all([
    context.supabase.from('properties').select('id,title,property_kind,city,verification_status').eq('id', propertyId).maybeSingle(),
    context.supabase.from('property_care_items').select('id,category,title,description,priority,status,due_at,resolved_at,created_at,updated_at').eq('property_id', propertyId).order('created_at', { ascending: false }),
    context.supabase.from('property_care_events').select('id,event_type,summary,visibility,created_at').eq('property_id', propertyId).neq('visibility', 'internal').order('created_at', { ascending: false }).limit(40),
    context.supabase.from('property_readiness_snapshots').select('tier,blockers,evidence,next_action,evaluated_at').eq('property_id', propertyId).maybeSingle(),
    context.supabase.from('property_qr_settings').select('public_token,status,owner_enabled,reviewed_at,approximate_location_label,public_summary').eq('property_id', propertyId).maybeSingle(),
    context.supabase.from('property_interest_requests').select('id,request_type,status,message,offer_min_lakhs,offer_max_lakhs,created_at,owner_response').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(30),
  ])
  if (!property.data) return apiError('Property not found or unavailable.', 404, 'NOT_FOUND')
  return apiOk({ property: property.data, careItems: careItems.data ?? [], events: events.data ?? [], readiness: readiness.data, qr: qr.data, interests: interests.data ?? [] })
}

export async function POST(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response
  const parsed = createCareItemSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data: property } = await context.supabase.from('properties').select('id,owner_profile_id').eq('id', parsed.data.propertyId).maybeSingle()
  if (!property || (!context.isAdmin && property.owner_profile_id !== context.user.id)) return apiError('You cannot update this property.', 403, 'FORBIDDEN')
  const { data: item, error } = await context.supabase.from('property_care_items').insert({
    property_id: parsed.data.propertyId, created_by: context.user.id, category: parsed.data.category, title: parsed.data.title,
    description: parsed.data.description || null, priority: parsed.data.priority, due_at: parsed.data.dueAt ?? null,
  }).select('id').single()
  if (error || !item) return apiError('Could not create the care item.', 400, 'CARE_ITEM_CREATE_FAILED')
  await context.supabase.from('property_care_events').insert({ property_id: parsed.data.propertyId, care_item_id: item.id, actor_id: context.user.id, event_type: 'care_item_created', summary: parsed.data.title, visibility: 'family' })
  await evaluatePropertyReadiness(context.supabase, parsed.data.propertyId, context.user.id)
  await recordAuditLog({ actorId: context.user.id, action: 'property_care.item_created', entityType: 'property_care_item', entityId: item.id, metadata: { propertyId: parsed.data.propertyId, category: parsed.data.category } })
  return apiOk({ id: item.id }, { status: 201 })
}

export async function PUT(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin', 'employee'])
  if ('response' in context) return context.response
  const parsed = z.object({ propertyId: z.string().uuid() }).safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data: property } = await context.supabase.from('properties').select('owner_profile_id').eq('id', parsed.data.propertyId).maybeSingle()
  if (!property || (!context.isAdmin && !context.isEmployee && property.owner_profile_id !== context.user.id)) return apiError('You cannot refresh this property record.', 403, 'FORBIDDEN')
  const readiness = await evaluatePropertyReadiness(context.supabase, parsed.data.propertyId, context.user.id)
  return apiOk({ readiness })
}
