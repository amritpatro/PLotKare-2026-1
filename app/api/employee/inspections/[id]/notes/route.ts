import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordAuditLog } from '@/lib/audit'

const schema = z.object({
  note: z.string().trim().max(3000),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireUserContext()
  if ('response' in context) return context.response
  if (context.profile.role !== 'employee' && context.profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Employee access is required.' } }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_NOTE', message: 'Internal note is too long.' } }, { status: 400 })
  }

  const { id } = await params
  const admin = createSupabaseAdminClient()
  const { data: inspection } = await admin
    .from('inspections')
    .select('id,workflow_step,status')
    .eq('id', id)
    .maybeSingle()

  if (!inspection || !['submitted', 'reviewed', 'approved', 'rejected', 'delivered'].includes(String(inspection.workflow_step || inspection.status))) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_NOT_FOUND', message: 'Submitted inspection was not found.' } }, { status: 404 })
  }

  const { error } = await admin.from('inspections').update({ review_notes: parsed.data.note }).eq('id', id)
  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'NOTE_SAVE_FAILED', message: 'Could not save the inspection note.' } }, { status: 400 })
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'inspection_internal_note_saved',
    entityType: 'inspections',
    entityId: id,
    metadata: { note_length: parsed.data.note.length },
  })

  return NextResponse.json({ ok: true, success: true })
}
