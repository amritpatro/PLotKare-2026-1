import { submitOwnerPlotLocation } from '@/app/owner/actions'
import { OwnerLocationCard } from '@/components/owner/owner-location-card'

export type OwnerCoordinatePlot = {
  id: string
  plot_number: string | null
  location: string | null
  target_latitude: number | null
  target_longitude: number | null
  submitted_latitude?: number | null
  submitted_longitude?: number | null
  submitted_accuracy_meters?: number | null
  location_source?: string | null
  location_status?: 'not_set' | 'pending_verification' | 'verified' | 'rejected' | string | null
  location_note?: string | null
  location_submitted_at?: string | null
  address_landmark?: string | null
  google_maps_link?: string | null
  location_verified_at?: string | null
  location_adjusted_by_admin?: boolean | null
  property_id: string | null
}

type OwnerCoordinatePanelProps = {
  plots: OwnerCoordinatePlot[]
}

export function OwnerCoordinatePanel({ plots }: OwnerCoordinatePanelProps) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C9A962]">Verified plot location</p>
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Submit GPS pin for admin review</h2>
        <p className="text-sm leading-6 text-[#6B7280]">
          Owners submit the pin. Admin verifies it before agents can use it for navigation, arrival proof, or inspection routing.
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        {plots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#6B7280]">
            Register a plot before confirming coordinates.
          </div>
        ) : null}
        {plots.map((plot) => (
          <OwnerLocationCard key={plot.id} plot={plot} action={submitOwnerPlotLocation} />
        ))}
      </div>
    </div>
  )
}
