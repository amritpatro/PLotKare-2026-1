import { revalidatePath } from 'next/cache'
import { requireRoleContext } from '@/lib/api/auth'
import { apiError, apiOk } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

const closedWorkflowSteps = new Set(['submitted', 'approved', 'rejected', 'delivered'])
const closedStatuses = new Set(['completed', 'cancelled', 'rejected', 'approved'])

function isActiveInspection(row: { workflow_step: string | null; status: string | null }) {
  const step = (row.workflow_step ?? '').toLowerCase()
  const status = (row.status ?? '').toLowerCase()
  if (closedWorkflowSteps.has(step)) return false
  if (!step && closedStatuses.has(status)) return false
  return true
}

export async function POST(_: Request, contextParams: RouteContext) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response

  const { id } = await contextParams.params
  const supabase = createSupabaseAdminClient()

  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .select('id,owner_id,property_id,plot_number,lifecycle_status,status')
    .eq('id', id)
    .eq('owner_id', context.user.id)
    .maybeSingle()

  if (plotError) return apiError(plotError.message, 400, 'PLOT_LOOKUP_FAILED')
  if (!plot) return apiError('Only the plot owner can archive this plot.', 404, 'PLOT_NOT_FOUND')

  if (plot.lifecycle_status === 'archived' || plot.status === 'archived') {
    return apiOk({ plot, archived: true })
  }

  let inspectionQuery = supabase
    .from('inspections')
    .select('id,workflow_step,status')
    .eq('plot_id', id)
    .limit(25)

  if (plot.property_id) {
    inspectionQuery = supabase
      .from('inspections')
      .select('id,workflow_step,status')
      .or(`plot_id.eq.${id},property_id.eq.${plot.property_id}`)
      .limit(25)
  }

  const { data: inspections, error: inspectionError } = await inspectionQuery
  if (inspectionError) return apiError(inspectionError.message, 400, 'INSPECTION_LOOKUP_FAILED')

  const activeInspection = (inspections ?? []).find(isActiveInspection)
  if (activeInspection) {
    return apiError('This plot has an active inspection. Complete, approve, or reject it before archiving.', 409, 'ACTIVE_INSPECTION_BLOCK')
  }

  const now = new Date().toISOString()
  const { data: archivedPlot, error: updateError } = await supabase
    .from('plots')
    .update({
      status: 'archived',
      lifecycle_status: 'archived',
      archived_at: now,
      archived_by: context.user.id,
    })
    .eq('id', id)
    .eq('owner_id', context.user.id)
    .select('id,plot_number,status,lifecycle_status')
    .single()

  if (updateError) return apiError(updateError.message, 400, 'PLOT_ARCHIVE_FAILED')

  const { error: listingError } = await supabase
    .from('listings')
    .update({ is_published: false, archived_at: now, archived_by: context.user.id })
    .eq('plot_id', id)

  if (listingError) return apiError(listingError.message, 400, 'LISTING_UNPUBLISH_FAILED')

  if (plot.property_id) {
    await supabase
      .from('properties')
      .update({ lifecycle_status: 'archived', archived_at: now, archived_by: context.user.id })
      .eq('id', plot.property_id)
      .eq('owner_profile_id', context.user.id)
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'owner.plot_archived',
    entityType: 'plot',
    entityId: id,
    metadata: {
      propertyId: plot.property_id,
      plotNumber: plot.plot_number,
    },
  })

  revalidatePath('/owner')
  revalidatePath('/owner/properties')
  revalidatePath('/owner/verification')
  revalidatePath('/listings')
  revalidatePath('/')

  return apiOk({ plot: archivedPlot, archived: true })
}
