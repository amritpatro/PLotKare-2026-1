import { AMENITY_CATALOG } from '@/lib/amenity-catalog'

export const STORAGE_PLOTS = 'plotkare_plots'
export const STORAGE_ACTIVE_AMENITIES = 'plotkare_active_amenities'
export const STORAGE_PLAN = 'plotkare_plan'

export type Facing = 'East' | 'West' | 'North' | 'South'

export type StoredPlot = {
  id: string
  plotNumber: string
  location: string
  locationOther?: string
  sqYards: number
  facing: Facing
  cornerPlot: boolean
  purchasePriceLakhs: number
  /** Estimated / tracked current value kept internal for future valuation workflows */
  currentValueLakhs: number
  purchaseDate: string
  status: 'active'
  /** Display string e.g. "02 May 2026" */
  lastInspection: string
  registeredAt: string
}

export type PlanTier = 'basic' | 'standard' | 'premium'

/** Normalize legacy rows from localStorage */
function normalizePlot(raw: Record<string, unknown>): StoredPlot | null {
  const id = raw.id != null ? String(raw.id) : null
  const plotNumber =
    raw.plotNumber != null
      ? String(raw.plotNumber)
      : raw.plot_number != null
        ? String(raw.plot_number)
        : null
  if (!id || !plotNumber) return null

  const sq =
    raw.sqYards != null
      ? Number(raw.sqYards)
      : raw.sq_yards != null
        ? Number(raw.sq_yards)
        : 0

  const purchasePriceLakhs =
    Number(raw.purchasePriceLakhs ?? raw.purchase_price_lakhs ?? 0) || 0
  const currentValueLakhs =
    Number(raw.currentValueLakhs ?? raw.current_value_lakhs ?? purchasePriceLakhs) || 0

  const facing = (raw.facing as Facing) || 'East'
  const cornerPlot = Boolean(raw.cornerPlot ?? raw.corner_plot ?? false)
  const location =
    raw.location != null
      ? String(raw.location)
      : ''
  const purchaseDate =
    raw.purchaseDate != null
      ? String(raw.purchaseDate)
      : raw.purchase_date != null
        ? String(raw.purchase_date)
        : ''

  const registeredAt =
    raw.registeredAt != null
      ? String(raw.registeredAt)
      : raw.registered_at != null
        ? String(raw.registered_at)
        : new Date().toISOString()

  const lastInspection =
    raw.lastInspection != null
      ? String(raw.lastInspection)
      : raw.last_inspection != null
        ? String(raw.last_inspection)
        : ''

  return {
    id,
    plotNumber,
    location,
    locationOther:
      raw.locationOther != null
        ? String(raw.locationOther)
        : raw.location_other != null
          ? String(raw.location_other)
          : undefined,
    sqYards: sq || 200,
    facing,
    cornerPlot,
    purchasePriceLakhs,
    currentValueLakhs,
    purchaseDate,
    status: 'active',
    lastInspection:
      lastInspection ||
      new Date(registeredAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    registeredAt,
  }
}

export function loadPlots(): StoredPlot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_PLOTS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((p) =>
        typeof p === 'object' && p !== null
          ? normalizePlot(p as Record<string, unknown>)
          : null,
      )
      .filter(Boolean) as StoredPlot[]
  } catch {
    return []
  }
}

export function savePlots(plots: StoredPlot[]) {
  localStorage.setItem(STORAGE_PLOTS, JSON.stringify(plots))
  window.dispatchEvent(new Event('plotkare-plots-changed'))
}

/**
 * Active amenities stored as an array of amenity display names (matches catalog `name`).
 * Migrates legacy `{ id, addedAt }[]` on read.
 */
export function loadActiveAmenityNames(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_AMENITIES)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    if (parsed.length === 0) return []

    if (typeof parsed[0] === 'string') {
      return parsed.filter((x): x is string => typeof x === 'string')
    }

    // Legacy: { id: string }[]
    const names = new Set<string>()
    for (const row of parsed as { id?: string }[]) {
      if (!row?.id) continue
      const item = AMENITY_CATALOG.find((a) => a.id === row.id)
      if (item) names.add(item.name)
    }
    const arr = [...names]
    if (arr.length) {
      localStorage.setItem(STORAGE_ACTIVE_AMENITIES, JSON.stringify(arr))
    }
    return arr
  } catch {
    return []
  }
}

export function saveActiveAmenityNames(names: string[]) {
  localStorage.setItem(STORAGE_ACTIVE_AMENITIES, JSON.stringify(names))
  window.dispatchEvent(new Event('plotkare-amenities-changed'))
}

export function getStoredPlan(): PlanTier {
  if (typeof window === 'undefined') return 'standard'
  const p = localStorage.getItem(STORAGE_PLAN) as PlanTier | null
  if (p === 'basic' || p === 'standard' || p === 'premium') return p
  return 'standard'
}

export function setStoredPlan(plan: PlanTier) {
  localStorage.setItem(STORAGE_PLAN, plan)
  window.dispatchEvent(new Event('plotkare-plan-changed'))
}
