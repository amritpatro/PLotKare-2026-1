import { plotUpdateSchema } from '@/lib/validation/app'
import { requireRoleContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, contextParams: RouteContext) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response

  const { id } = await contextParams.params
  const query = context.supabase.from('plots').select('*').eq('id', id)
  const scopedQuery = context.isAdmin ? query : query.eq('owner_id', context.user.id)
  const { data, error } = await scopedQuery.single()
  if (error) return apiError(error.message, 404, 'PLOT_NOT_FOUND')

  return apiOk({ plot: data })
}

export async function PATCH(request: Request, contextParams: RouteContext) {
  const context = await requireRoleContext(['land_owner', 'admin'])
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

  const query = context.supabase.from('plots').update(payload).eq('id', id)
  const scopedQuery = context.isAdmin ? query : query.eq('owner_id', context.user.id)
  const { data, error } = await scopedQuery.select('*').single()
  if (error) return apiError(error.message, 400, 'PLOT_UPDATE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'plot.updated', entityType: 'plot', entityId: id })
  return apiOk({ plot: data })
}

export async function DELETE(_: Request, contextParams: RouteContext) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response

  const { id } = await contextParams.params
  const query = context.supabase.from('plots').delete().eq('id', id)
  const scopedQuery = context.isAdmin ? query : query.eq('owner_id', context.user.id)
  const { error } = await scopedQuery
  if (error) return apiError(error.message, 400, 'PLOT_DELETE_FAILED')

  await recordAuditLog({ actorId: context.user.id, action: 'plot.deleted', entityType: 'plot', entityId: id })
  return apiOk({ deleted: true })
}
