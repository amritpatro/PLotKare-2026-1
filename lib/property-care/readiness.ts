import type { SupabaseClient } from '@supabase/supabase-js'

export type ReadinessTier = 'needs_attention' | 'building_record' | 'care_current' | 'opportunity_ready'

export type PropertyReadiness = {
  tier: ReadinessTier
  blockers: string[]
  evidence: string[]
  nextAction: string
  evaluatedAt: string
}

export const readinessLabels: Record<ReadinessTier, string> = {
  needs_attention: 'Needs attention',
  building_record: 'Building record',
  care_current: 'Care current',
  opportunity_ready: 'Opportunity ready',
}

const STALE_INSPECTION_MS = 1000 * 60 * 60 * 24 * 180

/** Computes an explainable status from existing evidence; it never estimates a value or return. */
export async function evaluatePropertyReadiness(supabase: SupabaseClient, propertyId: string, actorId?: string): Promise<PropertyReadiness> {
  const [propertyResult, documentsResult, inspectionsResult, plotsResult, careResult, qrResult] = await Promise.all([
    supabase.from('properties').select('verification_status,latitude,longitude').eq('id', propertyId).maybeSingle(),
    supabase.from('property_documents').select('id,verification_status,document_type,created_at').eq('property_id', propertyId),
    supabase.from('inspections').select('status,completed_at,created_at').eq('property_id', propertyId).order('completed_at', { ascending: false }).limit(1),
    supabase.from('plots').select('location_status,location_verified_at').eq('property_id', propertyId).limit(1),
    supabase.from('property_care_items').select('title,status,priority').eq('property_id', propertyId).in('status', ['open', 'in_progress', 'awaiting_owner']),
    supabase.from('property_qr_settings').select('status,owner_enabled').eq('property_id', propertyId).maybeSingle(),
  ])

  const blockers: string[] = []
  const evidence: string[] = []
  const property = propertyResult.data
  const docs = documentsResult.data ?? []
  const plot = plotsResult.data?.[0]
  const latestInspection = inspectionsResult.data?.[0]
  const openCare = careResult.data ?? []
  const hasApprovedDocument = docs.some((document) => document.verification_status === 'approved')
  const locationVerified = plot?.location_status === 'verified' || Boolean(property?.latitude && property?.longitude && property?.verification_status === 'approved')
  const inspectedAt = latestInspection?.completed_at ?? null
  const inspectionCurrent = Boolean(inspectedAt && Date.now() - new Date(inspectedAt).getTime() <= STALE_INSPECTION_MS)

  if (property?.verification_status !== 'approved') blockers.push('Property verification is awaiting review.')
  else evidence.push('Property record has been reviewed.')
  if (!locationVerified) blockers.push('Verified location or boundary evidence is still needed.')
  else evidence.push('Location evidence is verified.')
  if (!hasApprovedDocument) blockers.push('Add at least one approved ownership or supporting document.')
  else evidence.push('Approved document evidence is on file.')
  if (!inspectionCurrent) blockers.push('A current field inspection is needed.')
  else evidence.push(`Inspection is current as of ${new Date(inspectedAt as string).toLocaleDateString('en-IN')}.`)
  for (const item of openCare.filter((item) => item.priority === 'urgent' || item.status === 'awaiting_owner')) {
    blockers.push(item.title)
  }

  const coreCurrent = blockers.length === 0
  const opportunityEnabled = qrResult.data?.status === 'active' && qrResult.data.owner_enabled
  const tier: ReadinessTier = coreCurrent ? (opportunityEnabled ? 'opportunity_ready' : 'care_current') : blockers.some((item) => item.includes('awaiting') || item.includes('needed') || item.includes('verification')) ? 'needs_attention' : 'building_record'
  const nextAction = blockers[0] ?? (opportunityEnabled ? 'Review qualified interest as it arrives.' : 'Request QR opportunity review when you are ready to share the property.')
  const readiness: PropertyReadiness = { tier, blockers, evidence, nextAction, evaluatedAt: new Date().toISOString() }

  await supabase.from('property_readiness_snapshots').upsert({
    property_id: propertyId,
    tier,
    blockers,
    evidence,
    next_action: nextAction,
    evaluated_at: readiness.evaluatedAt,
    evaluated_by: actorId ?? null,
  })
  return readiness
}
