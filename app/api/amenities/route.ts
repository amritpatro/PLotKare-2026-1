import { createSupabaseServerClient } from '@/lib/supabase/server'
import { amenitySchema } from '@/lib/validation/pilot'
import { requireAdminContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('amenities').select('*').eq('active', true).order('name')
  if (error) return apiError(error.message, 400, 'AMENITIES_FETCH_FAILED')

  const amenities = (data ?? []).map(({ amount, ...amenity }) => ({
    ...amenity,
    consultation_label: 'Consult for pricing',
  }))

  return apiOk({ amenities })
}

export async function POST(request: Request) {
  const context = await requireAdminContext()
  if ('response' in context) return context.response

  const parsed = amenitySchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await context.supabase
    .from('amenities')
    .upsert({
      id: parsed.data.id,
      name: parsed.data.name,
      category: parsed.data.category,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      image_path: parsed.data.imagePath ?? null,
      active: parsed.data.active,
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'AMENITY_UPSERT_FAILED')
  return apiOk({ amenity: data })
}
