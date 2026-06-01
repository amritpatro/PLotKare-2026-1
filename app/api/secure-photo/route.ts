import { NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordAuditLog } from '@/lib/audit'

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export async function GET(request: Request) {
  const context = await requireUserContext()
  if ('response' in context) return context.response

  const url = new URL(request.url)
  const filePath = url.searchParams.get('filePath')
  const inspectionId = url.searchParams.get('inspectionId')
  if (!filePath || !inspectionId) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_PARAMS_REQUIRED', message: 'filePath and inspectionId are required.' } }, { status: 400 })
  }
  if (filePath.includes('..') || filePath.startsWith('/') || filePath.startsWith('\\')) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_PATH_INVALID', message: 'Photo path is invalid.' } }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { data: inspection, error } = await admin
    .from('inspections')
    .select('id,assigned_employee_id,plot_id,workflow_step,status,properties(owner_profile_id),plots(owner_id),inspection_reports(delivery_status,released_at)')
    .eq('id', inspectionId)
    .maybeSingle()

  if (error || !inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Inspection was not found.' } }, { status: 404 })
  }

  const role = String(context.profile.role)
  let allowed = role === 'admin'

  if (!allowed && role === 'employee') {
    const { data: employee } = await admin
      .from('employees')
      .select('id,employee_role,active')
      .eq('profile_id', context.user.id)
      .maybeSingle()

    const isOwnAgentInspection = employee?.employee_role === 'field_inspection_agent' && employee?.id === inspection.assigned_employee_id
    const isSubmittedForOps = ['submitted', 'reviewed', 'approved', 'delivered', 'rejected'].includes(String(inspection.workflow_step || inspection.status))
    allowed = Boolean(employee?.active && (isOwnAgentInspection || (employee?.employee_role !== 'field_inspection_agent' && isSubmittedForOps)))
  }

  const plot = first(inspection.plots)
  const property = first(inspection.properties)
  const report = first(inspection.inspection_reports)
  if (!allowed && (plot?.owner_id === context.user.id || property?.owner_profile_id === context.user.id)) {
    allowed = Boolean(report?.released_at || report?.delivery_status === 'dashboard_ready')
  }

  if (!allowed) {
    return NextResponse.json({ ok: false, error: { code: 'PHOTO_FORBIDDEN', message: 'You do not have access to this inspection photo.' } }, { status: 403 })
  }

  const { data, error: signedError } = await admin.storage.from('inspection-photos').createSignedUrl(filePath, 3600)
  if (signedError || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: { code: 'SIGNED_URL_FAILED', message: signedError?.message || 'Could not prepare photo access.' } }, { status: 400 })
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'file_accessed',
    entityType: 'inspection_photos',
    entityId: inspectionId,
    metadata: { inspection_id: inspectionId, file_path: filePath },
  })

  return NextResponse.json({
    ok: true,
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  })
}
