import { plotCreateSchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

export async function GET() {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const { data, error } = await context.supabase.from('plots').select('*').order('created_at', { ascending: false })
  if (error) return apiError(error.message, 400, 'PLOTS_FETCH_FAILED')

  return apiOk({ plots: data ?? [] })
}

export async function POST(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const parsed = plotCreateSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const ownerId = context.isAdmin && parsed.data.ownerId ? parsed.data.ownerId : context.user.id
  const { data, error } = await context.supabase
    .from('plots')
    .insert({
      owner_id: ownerId,
      plot_number: parsed.data.plotNumber,
      location: parsed.data.location,
      location_other: parsed.data.locationOther ?? null,
      sq_yards: parsed.data.sqYards,
      facing: parsed.data.facing,
      corner_plot: parsed.data.cornerPlot,
      purchase_price_lakhs: parsed.data.purchasePriceLakhs,
      current_value_lakhs: parsed.data.currentValueLakhs,
      purchase_date: parsed.data.purchaseDate || null,
      last_inspection: new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'PLOT_CREATE_FAILED')

  await recordAuditLog({
    actorId: context.user.id,
    action: 'plot.created',
    entityType: 'plot',
    entityId: data.id,
    metadata: { ownerId },
  })

  return apiOk({ plot: data }, { status: 201 })
}
