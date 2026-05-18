'use client'

import { useEffect, useState } from 'react'
import { AMENITY_CATALOG } from '@/lib/amenity-catalog'
import {
  loadDisabledAmenityIds,
  saveDisabledAmenityIds,
} from '@/lib/amenity-catalog-availability'

export default function AdminAmenitiesPage() {
  const [disabled, setDisabled] = useState<Set<string>>(new Set())

  useEffect(() => setDisabled(loadDisabledAmenityIds()), [])

  const toggle = (id: string) => {
    const next = new Set(disabled)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    saveDisabledAmenityIds(next)
    setDisabled(next)
  }

  return (
    <div className="px-8 pb-12 pt-24">
      <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Amenities</h1>
      <p className="mt-1 font-sans text-sm text-[#9CA3AF]">
        Inactive amenities are hidden from the user dashboard catalogue.
      </p>

      <div className="mt-8 space-y-2">
        {AMENITY_CATALOG.map((a) => {
          const active = !disabled.has(a.id)
          return (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
              <div>
                <p className="font-medium text-[#1F2937]">{a.name}</p>
                <p className="font-mono text-xs text-[#9CA3AF]">{a.category}</p>
                <p className="mt-1 font-mono text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">
                  Consult for scope
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(a.id)}
                className={`rounded-full px-4 py-2 font-sans text-xs font-semibold ${
                  active
                    ? 'bg-[#16A34A]/15 text-[#16A34A]'
                    : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}
              >
                {active ? 'Active' : 'Inactive'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
