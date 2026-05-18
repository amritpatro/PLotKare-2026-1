import { activeAmenitySchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'

export async function GET() {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const { data, error } = await context.supabase
    .from('active_amenities')
    .select('*, amenities(*)')
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 400, 'ACTIVE_AMENITIES_FETCH_FAILED')
  return apiOk({ activeAmenities: data ?? [] })
}

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const parsed = activeAmenitySchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const ownerId = context.isAdmin && parsed.data.ownerId ? parsed.data.ownerId : context.user.id
  const { data, error } = await context.supabase
    .from('active_amenities')
    .insert({
      owner_id: ownerId,
      plot_id: parsed.data.plotId ?? null,
      amenity_id: parsed.data.amenityId,
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'ACTIVE_AMENITY_CREATE_FAILED')
  return apiOk({ activeAmenity: data }, { status: 201 })
}
