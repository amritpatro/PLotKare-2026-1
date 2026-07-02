import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AgentShell } from '@/components/agent/agent-shell'
import { AgentInspectionFlow } from '@/components/agent/agent-inspection-flow'
import { getAssignedInspectionForAgent, requireFieldAgentPage } from '@/lib/agent/server'
import { inspectionTypeFromProperty } from '@/lib/agent/inspection-templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type PageProps = {
  params: Promise<{ id: string }>
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function nullableNumber(value: unknown) {
  if (value == null) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export default async function AgentInspectionPage({ params }: PageProps) {
  const agent = await requireFieldAgentPage()
  const { id } = await params
  const inspection = await getAssignedInspectionForAgent(id, agent.employeeId)
  if (!inspection) notFound()

  const property = first(inspection.properties)
  const plot = first(inspection.plots)
  const admin = createSupabaseAdminClient()

  const [{ data: documents }, { data: amenities }] = await Promise.all([
    inspection.property_id
      ? admin
          .from('property_documents')
          .select('id,title,verification_status')
          .eq('property_id', inspection.property_id)
          .order('created_at', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    inspection.plot_id
      ? admin
          .from('active_amenities')
          .select('id,amenity_id,amenities(name)')
          .eq('plot_id', inspection.plot_id)
          .limit(12)
      : Promise.resolve({ data: [] }),
  ])

  const title = property?.title || plot?.location || 'Assigned inspection'
  const location = [property?.address, property?.city, property?.state].filter(Boolean).join(', ') || plot?.location || 'Location pending'
  const propertyType = inspectionTypeFromProperty({
    inspectionPropertyType: inspection.inspection_property_type,
    assetType: property?.asset_type,
    propertyKind: property?.property_kind,
    hasPlot: Boolean(inspection.plot_id),
  })
  const plotLocationVerified = plot?.location_status === 'verified'
  const inspectionTargetLatitude = nullableNumber(inspection.target_latitude)
  const inspectionTargetLongitude = nullableNumber(inspection.target_longitude)
  const plotTargetLatitude = nullableNumber(plot?.target_latitude)
  const plotTargetLongitude = nullableNumber(plot?.target_longitude)
  const targetLatitude = plotLocationVerified
    ? inspectionTargetLatitude != null
      ? inspectionTargetLatitude
      : plotTargetLatitude != null
        ? plotTargetLatitude
        : null
    : null
  const targetLongitude = plotLocationVerified
    ? inspectionTargetLongitude != null
      ? inspectionTargetLongitude
      : plotTargetLongitude != null
        ? plotTargetLongitude
        : null
    : null
  const arrivalLatitude = nullableNumber(inspection.arrival_latitude)
  const arrivalLongitude = nullableNumber(inspection.arrival_longitude)
  const arrivalAccuracy = nullableNumber(inspection.arrival_accuracy_meters)
  const hasArrivalProof = arrivalLatitude != null && arrivalLongitude != null

  return (
    <AgentShell title="Inspection workflow" subtitle="One screen at a time: verify arrival, capture evidence, complete checks, and sync safely.">
      <Link href="/agent" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#1F2937]">
        <ArrowLeft className="h-4 w-4" />
        Back to assignments
      </Link>
      <AgentInspectionFlow
        inspectionId={inspection.id}
        title={title}
        location={location}
        plotLabel={plot?.plot_number || inspection.id.slice(0, 8)}
        propertyType={propertyType}
        target={{
          latitude: Number.isFinite(targetLatitude) ? targetLatitude : null,
          longitude: Number.isFinite(targetLongitude) ? targetLongitude : null,
        }}
        targetLabel={inspection.target_place_label || plot?.target_place_label || null}
        locationStatus={plot?.location_status || 'not_set'}
        landmark={plot?.address_landmark || null}
        googleMapsLink={plot?.google_maps_link || null}
        initialArrival={hasArrivalProof ? {
          latitude: arrivalLatitude,
          longitude: arrivalLongitude,
          accuracy: arrivalAccuracy ?? 0,
          capturedAt: inspection.arrival_captured_at || new Date().toISOString(),
          verified: inspection.arrival_verified === true,
          outsideRadius: inspection.arrival_outside_radius === true,
        } : null}
        documents={(documents ?? []).map((doc) => ({
          id: doc.id,
          label: doc.title,
          status: doc.verification_status,
        }))}
        amenities={(amenities ?? []).map((row) => {
          const amenity = first(row.amenities)
          return {
            id: row.id,
            name: amenity?.name || row.amenity_id,
            status: 'active',
          }
        })}
      />
    </AgentShell>
  )
}
