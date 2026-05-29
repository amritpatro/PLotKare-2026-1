import { notFound } from 'next/navigation'
import { AgentInspectionFlow } from '@/components/agent/agent-inspection-flow'
import { requireFieldAgentPage } from '@/lib/supabase/role-guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function AgentInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { employee } = await requireFieldAgentPage()
  const admin = createSupabaseAdminClient()
  const { data: inspection } = await admin
    .from('inspections')
    .select('id,inspection_reference,property_id,plot_id,status,workflow_step,plan_snapshot,scheduled_for,target_latitude,target_longitude,proximity_radius_meters,arrival_latitude,arrival_longitude,arrival_captured_at,arrival_verified,arrival_distance_meters,arrival_accuracy_meters,properties(id,title,address,city,latitude,longitude,owner_profile_id),plots(id,plot_number,location)')
    .eq('id', id)
    .eq('assigned_employee_id', employee.id)
    .in('status', ['scheduled', 'in_progress', 'correction_required'])
    .maybeSingle()
  if (!inspection) notFound()
  const [{ data: photos }, { data: checklist }, { data: flags }, { data: documentChecks }, { data: documents }, { data: amenities }, { data: amenityChecks }] = await Promise.all([
    admin.from('inspection_photos').select('id,direction,subject,active_amenity_id,captured_at').eq('inspection_id', id).eq('upload_status', 'finalized'),
    admin.from('inspection_checklist_answers').select('question_code,answer,note').eq('inspection_id', id),
    admin.from('inspection_flags').select('id,flag_type,severity,description,status').eq('inspection_id', id),
    admin.from('inspection_document_checks').select('id,document_id,label,observed_status,result,note').eq('inspection_id', id),
    admin.from('property_documents').select('id,title,document_type,verification_status,review_reason,created_at').eq('property_id', inspection.property_id).in('document_type', ['enc_certificate', 'tax_receipt', 'ownership_proof', 'survey_document']).order('created_at', { ascending: false }),
    inspection.plot_id ? admin.from('active_amenities').select('id,amenity_id,amenities(id,name,category,image_path)').eq('plot_id', inspection.plot_id) : Promise.resolve({ data: [] }),
    admin.from('inspection_amenity_checks').select('id,active_amenity_id,condition,note,photo_id').eq('inspection_id', id),
  ])
  return <AgentInspectionFlow initialPacket={{ inspection, photos: photos ?? [], checklist: checklist ?? [], flags: flags ?? [], documentChecks: documentChecks ?? [], documentSummaries: documents ?? [], activeAmenities: amenities ?? [], amenityChecks: amenityChecks ?? [] }} />
}
