import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminContext } from '@/lib/api/auth'
import { isRateLimited } from '@/lib/api/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordAuditLog } from '@/lib/audit'

const schema = z.object({
  rejectionReason: z.string().trim().min(20),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdminContext()
  if ('response' in context) return context.response
  if (await isRateLimited(request, { identifier: context.user.id })) {
    return NextResponse.json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many rejection requests. Please wait and try again.' } }, { status: 429 })
  }
  const { id } = await params
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'REJECTION_REASON_REQUIRED', message: 'Rejection reason must be at least 20 characters.' } }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { data: inspection } = await admin.from('inspections').select('id,assigned_employee_id,employees(profile_id)').eq('id', id).maybeSingle()
  if (!inspection) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Inspection was not found.' } }, { status: 404 })
  }

  await admin.from('inspections').update({
    workflow_step: 'rejected',
    reviewed_at: new Date().toISOString(),
    review_notes: parsed.data.rejectionReason,
  }).eq('id', id)

  await admin.from('inspection_reports').update({
    status: 'Action Needed',
    delivery_status: 'correction_required',
    review_notes: parsed.data.rejectionReason,
    reviewed_by: context.user.id,
  }).eq('inspection_id', id)

  const employee = Array.isArray(inspection.employees) ? inspection.employees[0] : inspection.employees
  if (employee?.profile_id) {
    await admin.from('notifications').insert({
      recipient_id: employee.profile_id,
      actor_id: context.user.id,
      title: 'Inspection correction requested',
      message: parsed.data.rejectionReason,
      category: 'inspection',
      metadata: { inspection_id: id },
    })
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'inspection_rejected',
    entityType: 'inspections',
    entityId: id,
    metadata: {
      reason_present: true,
      reason_length: parsed.data.rejectionReason.length,
    },
  })
  return NextResponse.json({ ok: true })
}
