import { toggleAmenityAvailability } from './actions'
import { AMENITY_CATALOG } from '@/lib/amenity-catalog'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AdminAmenitiesPage() {
  await requirePageRole(['admin'])
  const supabase = await createSupabaseServerClient()
  const { data: amenities } = await supabase
    .from('amenities')
    .select('id,active')

  const activeById = new Map((amenities ?? []).map((amenity) => [amenity.id, amenity.active]))

  return (
    <div className="px-8 pb-12 pt-24">
      <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Amenities</h1>
      <p className="mt-1 font-sans text-sm text-[#9CA3AF]">
        Inactive amenities are hidden from the user dashboard catalogue.
      </p>

      <div className="mt-8 space-y-2">
        {AMENITY_CATALOG.map((amenity) => {
          const active = activeById.get(amenity.id) ?? true

          return (
            <div
              key={amenity.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
              <div>
                <p className="font-medium text-[#1F2937]">{amenity.name}</p>
                <p className="font-mono text-xs text-[#9CA3AF]">{amenity.category}</p>
                <p className="mt-1 font-mono text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">
                  Consult for scope
                </p>
              </div>
              <form action={toggleAmenityAvailability}>
                <input type="hidden" name="amenityId" value={amenity.id} />
                <input type="hidden" name="nextActive" value={active ? 'false' : 'true'} />
                <button
                  type="submit"
                  className={`rounded-full px-4 py-2 font-sans text-xs font-semibold ${
                    active
                      ? 'bg-[#16A34A]/15 text-[#16A34A]'
                      : 'bg-[#F3F4F6] text-[#6B7280]'
                  }`}
                >
                  {active ? 'Active' : 'Inactive'}
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
