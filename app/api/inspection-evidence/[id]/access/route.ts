import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const paramsSchema = z.object({ id: z.string().uuid() })

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoleContext(['employee', 'admin', 'land_owner'])
  if ('response' in context) return context.response
  const parsed = paramsSchema.safeParse(await params)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid evidence ID.' }, { status: 400 })
  const admin = createSupabaseAdminClient()
  const { data: photo } = await admin
    .from('inspection_photos')
    .select('id,inspection_id,bucket,object_path,owner_id,inspections(assigned_employee_id)')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!photo) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 })

  let allowed = context.isAdmin
  if (!allowed && context.profile.role === 'land_owner') {
    const { data: report } = await admin.from('inspection_reports').select('delivery_status').eq('inspection_id', photo.inspection_id).eq('owner_id', context.user.id).maybeSingle()
    allowed = report?.delivery_status === 'released'
  }
  if (!allowed && context.profile.role === 'employee') {
    const { data: employee } = await admin.from('employees').select('id,employee_role,active').eq('profile_id', context.user.id).maybeSingle()
    const inspection = Array.isArray(photo.inspections) ? photo.inspections[0] : photo.inspections
    allowed = Boolean(employee?.active && employee.employee_role === 'field_inspection_agent' && inspection?.assigned_employee_id === employee.id)
  }
  if (!allowed) return NextResponse.json({ error: 'You do not have access to this evidence.' }, { status: 403 })

  const download = new URL(request.url).searchParams.get('mode') === 'download'
  const result = await admin.storage.from(photo.bucket).createSignedUrl(photo.object_path, 90, {
    download: download ? `plotkare-inspection-${photo.id}.webp` : undefined,
  })
  if (result.error || !result.data?.signedUrl) return NextResponse.json({ error: 'Secure access failed.' }, { status: 500 })
  return NextResponse.redirect(result.data.signedUrl, { status: 302 })
}
