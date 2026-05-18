import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { inspectionReportSchema } from '@/lib/validation/pilot'
import { requireAdminContext, requireUserContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { recordAuditLog } from '@/lib/audit'

export async function GET() {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const { data, error } = await context.supabase
    .from('inspection_reports')
    .select('*, inspection_photos(*)')
    .eq('owner_id', context.user.id)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 400, 'INSPECTIONS_FETCH_FAILED')
  return apiOk({ inspections: data ?? [] })
}

export async function POST(request: Request) {
  const context = await requireAdminContext()
  if ('response' in context) return context.response

  const parsed = inspectionReportSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('inspection_reports')
    .insert({
      owner_id: parsed.data.ownerId,
      plot_id: parsed.data.plotId ?? null,
      month: parsed.data.month,
      agent_name: parsed.data.agentName ?? null,
      finding: parsed.data.finding,
      status: parsed.data.status,
      report_file_path: parsed.data.reportFilePath ?? null,
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'INSPECTION_CREATE_FAILED')

  await recordAuditLog({
    actorId: context.user.id,
    action: 'inspection.created',
    entityType: 'inspection_report',
    entityId: data.id,
    metadata: { ownerId: parsed.data.ownerId },
  })

  return apiOk({ inspection: data }, { status: 201 })
}
