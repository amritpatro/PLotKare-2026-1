import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const paramsSchema = z.object({ id: z.string().uuid() })

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response
  const parsed = paramsSchema.safeParse(await params)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid report ID.' }, { status: 400 })
  const admin = createSupabaseAdminClient()
  const { data: report } = await admin.from('inspection_reports').select('id,owner_id,delivery_status,report_file_path').eq('id', parsed.data.id).maybeSingle()
  if (!report || !report.report_file_path) return NextResponse.json({ error: 'Report is not available.' }, { status: 404 })
  if (!context.isAdmin && (report.owner_id !== context.user.id || report.delivery_status !== 'released')) {
    return NextResponse.json({ error: 'This report has not been released to you.' }, { status: 403 })
  }
  const signed = await admin.storage.from('inspection-reports').createSignedUrl(report.report_file_path, 90, { download: `plotkare-inspection-report-${report.id}.pdf` })
  if (signed.error || !signed.data?.signedUrl) return NextResponse.json({ error: 'Secure report access failed.' }, { status: 500 })
  return NextResponse.redirect(signed.data.signedUrl, { status: 302 })
}
