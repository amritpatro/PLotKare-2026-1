import { updateOwnerPlotCoordinates } from '@/app/owner/actions'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { CoordinatePicker } from '@/components/maps/coordinate-picker'

export type OwnerCoordinatePlot = {
  id: string
  plot_number: string | null
  location: string | null
  target_latitude: number | null
  target_longitude: number | null
  property_id: string | null
}

type OwnerCoordinatePanelProps = {
  plots: OwnerCoordinatePlot[]
}

export function OwnerCoordinatePanel({ plots }: OwnerCoordinatePanelProps) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C9A962]">Real map coordinates</p>
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Confirm plot GPS pin</h2>
        <p className="text-sm leading-6 text-[#6B7280]">
          Search on the real map, click the exact plot pin, or use GPS before saving coordinates for field inspection routing.
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        {plots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#6B7280]">
            Register a plot before confirming coordinates.
          </div>
        ) : null}
        {plots.map((plot) => (
          <form key={plot.id} action={updateOwnerPlotCoordinates} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <input type="hidden" name="plotId" value={plot.id} />
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#1F2937]">{plot.plot_number || 'Plot reference pending'}</p>
                <p className="text-sm text-[#6B7280]">{plot.location || 'Location pending'}</p>
              </div>
              <span className="font-mono text-xs text-[#9CA3AF]">
                {plot.target_latitude != null && plot.target_longitude != null
                  ? `${Number(plot.target_latitude).toFixed(5)}, ${Number(plot.target_longitude).toFixed(5)}`
                  : 'Pin pending'}
              </span>
            </div>
            <CoordinatePicker
              initialLatitude={plot.target_latitude}
              initialLongitude={plot.target_longitude}
              defaultQuery={plot.location}
              compact
            />
            <PendingActionButton
              pendingText="Saving..."
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#C0392B] px-4 text-sm font-semibold text-white transition hover:bg-[#A93225]"
            >
              Save coordinates
            </PendingActionButton>
          </form>
        ))}
      </div>
    </div>
  )
}
