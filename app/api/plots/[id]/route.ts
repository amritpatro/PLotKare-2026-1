import { plotUpdateSchema } from '@/lib/validation/pilot'
import { requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, contextParams: RouteContext) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const { id } = await contextParams.params
  const { data, error } = await context.supabase.from('plots').select('*').eq('id', id).single()
  if (error) return apiError(error.message, 404, 'PLOT_NOT_FOUND')

  return apiOk({ plot: data })
}

export async function PATCH(request: Request, contextParams: RouteContext) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const { id } = await contextParams.params
  const parsed = plotUpdateSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const payload = {
    ...(parsed.data.plotNumber !== undefined ? { plot_number: parsed.data.plotNumber } : {}),
    ...(parsed.data.location !== undefined ? { location: parsed.data.location } : {}),
    ...(parsed.data.locationOther !== undefined ? { location_other: parsed.data.locationOther ?? null } : {}),
    ...(parsed.data.sqYards !== undefined ? { sq_yards: parsed.data.sqYards } : {}),
    ...(parsed.data.facing !== undefined ? { facing: parsed.data.facing } : {}),
    ...(parsed.data.cornerPlot !== undefined ? { corner_plot: parsed.data.cornerPlot } : {}),
    ...(parsed.data.purchasePriceLakhs !== undefined ? { purchase_price_lakhs: parsed.data.purchasePriceLakhs } : {}),
    ...(parsed.data.currentValueLakhs !== undefined ? { current_value_lakhs: parsed.data.currentValueLakhs } : {}),
    ...(parsed.data.purchaseDate !== undefined ? { purchase_date: parsed.data.purchaseDate || null } : {}),
  }

  const { data, error } = await context.supabase.from('plots').update(payload).eq('id', id).select('*').single()
  if (error) return apiError(error.message, 400, 'PLOT_UPDATE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'plot.updated', entityType: 'plot', entityId: id })
  return apiOk({ plot: data })
}

export async function DELETE(_: Request, contextParams: RouteContext) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const { id } = await contextParams.params
  const { error } = await context.supabase.from('plots').delete().eq('id', id)
  if (error) return apiError(error.message, 400, 'PLOT_DELETE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'plot.deleted', entityType: 'plot', entityId: id })
  return apiOk({ deleted: true })
}
