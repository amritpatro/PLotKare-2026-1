import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireFieldAgentApiContext, readAssignedInspection } from '@/lib/agent/inspection'

const paramsSchema = z.object({ id: z.string().uuid() })

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireFieldAgentApiContext()
  if ('response' in context) return context.response
  const parsed = paramsSchema.safeParse(await params)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid inspection ID.' }, { status: 400 })

  const inspection = await readAssignedInspection(context, parsed.data.id)
  if (!inspection) return NextResponse.json({ error: 'Assigned inspection not found.' }, { status: 404 })

  const [photoResult, checklistResult, flagsResult, documentChecksResult, amenityChecksResult] = await Promise.all([
    context.admin.from('inspection_photos').select('id,direction,subject,note,captured_at,latitude,longitude,accuracy_meters,compressed_size_bytes,active_amenity_id').eq('inspection_id', inspection.id).eq('upload_status', 'finalized').order('created_at'),
    context.admin.from('inspection_checklist_answers').select('question_code,answer,note').eq('inspection_id', inspection.id),
    context.admin.from('inspection_flags').select('id,flag_type,severity,description,status,photo_id').eq('inspection_id', inspection.id),
    context.admin.from('inspection_document_checks').select('id,document_id,label,observed_status,result,note').eq('inspection_id', inspection.id),
    context.admin.from('inspection_amenity_checks').select('id,active_amenity_id,condition,note,photo_id').eq('inspection_id', inspection.id),
  ])

  const propertyId = inspection.property_id
  const plotId = inspection.plot_id
  const [documentsResult, amenitiesResult] = await Promise.all([
    context.admin
      .from('property_documents')
      .select('id,title,document_type,verification_status,review_reason,created_at')
      .eq('property_id', propertyId)
      .in('document_type', ['enc_certificate', 'tax_receipt', 'ownership_proof', 'survey_document'])
      .order('created_at', { ascending: false }),
    plotId
      ? context.admin.from('active_amenities').select('id,amenity_id,amenities(id,name,category,image_path)').eq('plot_id', plotId)
      : Promise.resolve({ data: [], error: null }),
  ])

  return NextResponse.json({
    inspection,
    photos: photoResult.data ?? [],
    checklist: checklistResult.data ?? [],
    flags: flagsResult.data ?? [],
    documentChecks: documentChecksResult.data ?? [],
    amenityChecks: amenityChecksResult.data ?? [],
    documentSummaries: documentsResult.data ?? [],
    activeAmenities: amenitiesResult.data ?? [],
  })
}
