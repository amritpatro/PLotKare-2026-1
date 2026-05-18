/** Amenity catalog IDs disabled by admin — hidden from user “Add Amenities” grid. */

const STORAGE_KEY = 'plotkare_amenity_disabled_ids'

export function loadDisabledAmenityIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function saveDisabledAmenityIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('plotkare-amenity-visibility-changed'))
  }
}

export function toggleDisabledAmenityId(id: string, disabled: boolean) {
  const next = loadDisabledAmenityIds()
  if (disabled) next.add(id)
  else next.delete(id)
  saveDisabledAmenityIds([...next])
}
