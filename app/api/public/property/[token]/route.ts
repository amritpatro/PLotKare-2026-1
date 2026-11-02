import { z } from 'zod'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { isRateLimited } from '@/lib/api/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(32).optional(),
  message: z.string().trim().min(5).max(1200),
  consent: z.literal(true),
})

async function publicProperty(token: string) {
  const admin = createSupabaseAdminClient()
  const { data: qr } = await admin.from('property_qr_settings')
    .select('property_id,public_token,status,owner_enabled,approximate_location_label,public_summary')
    .eq('public_token', token).eq('status', 'active').eq('owner_enabled', true).maybeSingle()
  if (!qr) return null
  const [{ data: property }, { data: snapshot }, { data: plot }] = await Promise.all([
    admin.from('properties').select('id,title,property_kind,city,state,verification_status').eq('id', qr.property_id).eq('verification_status', 'approved').maybeSingle(),
    admin.from('property_readiness_snapshots').select('tier,evidence,evaluated_at').eq('property_id', qr.property_id).maybeSingle(),
    admin.from('plots').select('plot_number,sq_yards,facing,location_status').eq('property_id', qr.property_id).maybeSingle(),
  ])
  if (!property) return null
  return { qr, property, snapshot, plot }
}

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!/^[a-zA-Z0-9-]{24,64}$/.test(token)) return apiError('Property page not found.', 404, 'NOT_FOUND')
  const result = await publicProperty(token)
  if (!result) return apiError('Property page not found.', 404, 'NOT_FOUND')
  const { property, qr, snapshot, plot } = result
  return apiOk({
    property: {
      title: property.title || 'Verified property', propertyKind: property.property_kind, city: property.city, state: property.state,
      locationLabel: qr.approximate_location_label || [property.city, property.state].filter(Boolean).join(', '),
      summary: qr.public_summary || 'This property is shared through PlotKare’s reviewed opportunity channel.',
      plot: plot ? { sizeSqYards: plot.sq_yards, facing: plot.facing, locationVerified: plot.location_status === 'verified' } : null,
      readiness: snapshot ? { tier: snapshot.tier, evidence: (snapshot.evidence ?? []).slice(0, 4), evaluatedAt: snapshot.evaluated_at } : null,
    },
  })
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (await isRateLimited(request)) return apiError('Too many requests. Please wait and try again.', 429, 'RATE_LIMITED')
  const { token } = await context.params
  const parsed = enquirySchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const result = await publicProperty(token)
  if (!result) return apiError('Property page not found.', 404, 'NOT_FOUND')
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.from('property_interest_requests').insert({
    property_id: result.property.id, source: 'qr', request_type: 'enquiry', guest_name: parsed.data.name,
    guest_email: parsed.data.email.toLowerCase(), guest_phone: parsed.data.phone || null, message: parsed.data.message,
  }).select('id').single()
  if (error || !data) return apiError('We could not send your enquiry. Please try again.', 400, 'INTEREST_CREATE_FAILED')
  await admin.from('property_care_events').insert({ property_id: result.property.id, event_type: 'qr_enquiry_received', summary: 'A new private enquiry was received through the QR property page.', visibility: 'owner' })
  return apiOk({ enquiryId: data.id, message: 'Your enquiry has been sent privately to PlotKare.' }, { status: 201 })
}
