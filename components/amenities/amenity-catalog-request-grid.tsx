import { getAmenityById, getAmenityDisplayDetails } from '@/lib/amenity-catalog'

type AmenityOption = {
  id: string
  name: string
  category: string | null
  kind: string | null
  amount: number | null
}

type TargetOption = {
  id: string
  label: string
}

function priceLabel(amenity: AmenityOption) {
  if (!amenity.amount) return 'Consultation led'
  const suffix = amenity.kind === 'monthly' ? '/ month' : ' one-time'
  return `Approx. Rs. ${Number(amenity.amount).toLocaleString('en-IN')}${suffix}`
}

export function AmenityCatalogRequestGrid({
  amenities,
  targets,
  targetName,
  targetLabel,
  action,
  disabledText,
}: {
  amenities: AmenityOption[]
  targets: TargetOption[]
  targetName: 'plotId' | 'propertyId'
  targetLabel: string
  action: (formData: FormData) => void | Promise<void>
  disabledText: string
}) {
  const hasTargets = targets.length > 0

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-2 border-b border-[#F3F4F6] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#C9A962]">Amenity catalogue</p>
          <h3 className="mt-2 font-serif text-2xl font-bold text-[#1F2937]">Choose a managed property amenity</h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#6B7280]">
          Each request opens a PlotKare consultation. The team checks access, useful area, ownership readiness, safety, and operating fit before approval.
        </p>
      </div>
      {!hasTargets ? (
        <div className="mt-5 rounded-lg border border-[#F3D6D2] bg-[#FFF7F5] p-4 text-sm text-[#8A1F13]">{disabledText}</div>
      ) : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {amenities.map((amenity) => {
          const catalog = getAmenityById(amenity.id)
          const details = getAmenityDisplayDetails(amenity.id)
          return (
            <form key={amenity.id} action={action} className="flex min-h-full flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#FCFCFB]">
              <div className="relative aspect-[16/9] overflow-hidden bg-[#F3F4F6]">
                {catalog?.image ? (
                  <img src={catalog.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-[#F9FAFB]" />
                )}
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9F1239]">
                  {amenity.category || 'Amenity'}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4">
                <div>
                  <h4 className="font-serif text-xl font-bold text-[#1F2937]">{amenity.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6B7280]">{details.description}</p>
                </div>
                <div className="grid gap-2 text-xs leading-5 text-[#6B7280]">
                  <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
                    <span className="font-mono uppercase tracking-[0.14em] text-[#9CA3AF]">Where it fits</span>
                    <p className="mt-1">{details.suitableFor}</p>
                  </div>
                  <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
                    <span className="font-mono uppercase tracking-[0.14em] text-[#9CA3AF]">Area guide</span>
                    <p className="mt-1">{details.areaRange}</p>
                  </div>
                </div>
                <div className="mt-auto grid gap-3">
                  <input type="hidden" name="amenityId" value={amenity.id} />
                  <select name={targetName} required disabled={!hasTargets} className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" defaultValue="">
                    <option value="" disabled>{targetLabel}</option>
                    {targets.map((target) => (
                      <option key={target.id} value={target.id}>{target.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#6B7280]">{priceLabel(amenity)}</span>
                    <button type="submit" disabled={!hasTargets} className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]">
                      Consult PlotKare
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )
        })}
      </div>
    </div>
  )
}
