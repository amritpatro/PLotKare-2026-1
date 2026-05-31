import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AgentShell } from '@/components/agent/agent-shell'
import { AgentInspectionFlow } from '@/components/agent/agent-inspection-flow'
import { getAssignedInspectionForAgent, requireFieldAgentPage } from '@/lib/agent/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type PageProps = {
  params: Promise<{ id: string }>
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
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
  const targetLatitude =
    inspection.target_latitude == null ? (property?.latitude == null ? null : Number(property.latitude)) : Number(inspection.target_latitude)
  const targetLongitude =
    inspection.target_longitude == null ? (property?.longitude == null ? null : Number(property.longitude)) : Number(inspection.target_longitude)

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
        target={{
          latitude: Number.isFinite(targetLatitude) ? targetLatitude : null,
          longitude: Number.isFinite(targetLongitude) ? targetLongitude : null,
        }}
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
