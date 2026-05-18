'use client'

import { createSupabaseBrowserClient } from './browser'
import type { PlotRow } from './types'
import type { StoredPlot } from '@/lib/plotkare-storage'

function formatLastInspection(date: string | null, fallbackIso: string) {
  const d = new Date(date ?? fallbackIso)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function plotRowToStoredPlot(row: PlotRow): StoredPlot {
  return {
    id: row.id,
    plotNumber: row.plot_number,
    location: row.location,
    locationOther: row.location_other ?? undefined,
    sqYards: Number(row.sq_yards),
    facing: row.facing,
    cornerPlot: row.corner_plot,
    purchasePriceLakhs: Number(row.purchase_price_lakhs),
    currentValueLakhs: Number(row.current_value_lakhs),
    purchaseDate: row.purchase_date ?? '',
    status: 'active',
    lastInspection: formatLastInspection(row.last_inspection, row.created_at),
    registeredAt: row.created_at,
  }
}

export async function getCurrentProfile() {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) throw error
  return data
}

export async function loadUserPlots() {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('plots')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as PlotRow[]).map(plotRowToStoredPlot)
}

export async function createUserPlot(input: Omit<StoredPlot, 'id' | 'status' | 'lastInspection' | 'registeredAt'>) {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('You must be signed in to register a plot.')

  const { data, error } = await supabase
    .from('plots')
    .insert({
      owner_id: user.id,
      plot_number: input.plotNumber,
      location: input.location,
      location_other: input.locationOther ?? null,
      sq_yards: input.sqYards,
      facing: input.facing,
      corner_plot: input.cornerPlot,
      purchase_price_lakhs: input.purchasePriceLakhs,
      current_value_lakhs: input.currentValueLakhs,
      purchase_date: input.purchaseDate || null,
      last_inspection: new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single()

  if (error) throw error
  return plotRowToStoredPlot(data as PlotRow)
}

export function subscribeToUserPlots(onChange: () => void) {
  const supabase = createSupabaseBrowserClient()
  const channel = supabase
    .channel('plotkare-plots')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'plots' }, onChange)
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
