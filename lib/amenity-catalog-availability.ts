import { AMENITY_CATALOG } from '@/lib/amenity-catalog'

const STORAGE_DISABLED = 'plotkare_amenity_disabled_ids'

export function loadDisabledAmenityIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_DISABLED)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function saveDisabledAmenityIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_DISABLED, JSON.stringify([...ids]))
  window.dispatchEvent(new Event('plotkare-amenity-catalog-changed'))
}

export function isAmenityGloballyActive(id: string): boolean {
  return !loadDisabledAmenityIds().has(id)
}

export function getCatalogItemsForUserGrid() {
  const disabled = loadDisabledAmenityIds()
  return AMENITY_CATALOG.filter((a) => !disabled.has(a.id))
}
