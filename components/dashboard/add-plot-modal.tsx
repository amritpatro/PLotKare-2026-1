'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  type StoredPlot,
  type Facing,
} from '@/lib/plotkare-storage'
import { createUserPlot } from '@/lib/supabase/data'
import { SIZE_TILES, VIZAG_LOCATIONS } from '@/lib/vizag-form-constants'

function parseSqFromTile(tile: (typeof SIZE_TILES)[number], custom: string): number | null {
  if (tile === 'Custom') {
    const n = parseInt(custom, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const m = tile.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function formatLastInspectionToday(): string {
  const d = new Date()
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export type AddPlotModalProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function AddPlotModal({ open, onClose, onSaved }: AddPlotModalProps) {
  const [plotNumber, setPlotNumber] = useState('')
  const [location, setLocation] = useState<(typeof VIZAG_LOCATIONS)[number]>(
    VIZAG_LOCATIONS[1],
  )
  const [locationOther, setLocationOther] = useState('')
  const [sizeTile, setSizeTile] = useState<(typeof SIZE_TILES)[number] | null>(null)
  const [customSqYards, setCustomSqYards] = useState('')
  const [facing, setFacing] = useState<Facing>('East')
  const [cornerPlot, setCornerPlot] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )

  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErr, setFieldErr] = useState({
    plotNumber: false,
    location: false,
    size: false,
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const sqPreview = sizeTile ? parseSqFromTile(sizeTile, customSqYards) : null

  const clearErrors = () => {
    setSubmitError('')
    setFieldErr({
      plotNumber: false,
      location: false,
      size: false,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (submitting) return
    let ok = true
    const nextErr = { ...fieldErr }

    if (!plotNumber.trim()) {
      nextErr.plotNumber = true
      ok = false
    }
    if (location === 'Other' && !locationOther.trim()) {
      nextErr.location = true
      ok = false
    }
    const sq = sizeTile ? parseSqFromTile(sizeTile, customSqYards) : null
    if (!sizeTile || sq == null) {
      nextErr.size = true
      ok = false
    }
    if (!ok) {
      setFieldErr(nextErr)
      setSubmitError('Please complete all required fields.')
      return
    }

    const locationResolved =
      location === 'Other' ? locationOther.trim() : location

    const newPlot: Omit<StoredPlot, 'id' | 'status' | 'lastInspection' | 'registeredAt'> = {
      plotNumber: plotNumber.trim(),
      location: locationResolved,
      locationOther: location === 'Other' ? locationOther.trim() : undefined,
      sqYards: sq!,
      facing,
      cornerPlot,
      purchasePriceLakhs: 0,
      currentValueLakhs: 0,
      purchaseDate,
    }

    setSubmitting(true)
    try {
      await createUserPlot(newPlot)
      toast.success('Plot registered successfully', {
        position: 'bottom-right',
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      })
      onSaved()
      onClose()
      setPlotNumber('')
      setLocation(VIZAG_LOCATIONS[1])
      setLocationOther('')
      setSizeTile(null)
      setCustomSqYards('')
      setFacing('East')
      setCornerPlot(false)
      setPurchaseDate(new Date().toISOString().slice(0, 10))
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Plot registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const tileBase =
    'rounded-lg border px-2 py-3 text-center font-mono text-[11px] transition-colors sm:text-xs md:text-sm '
  const tileUnselected = 'border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#9CA3AF]'
  const tileSelected = 'border-[#C0392B] bg-[#FFF1F2] text-[#C0392B]'

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add new plot"
      onClick={onClose}
    >
      <div
        className="mx-auto min-h-full max-w-2xl px-4 py-10 md:py-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg border border-[#E5E7EB] p-2 text-[#6B7280] hover:bg-[#F9FAFB]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="font-serif text-2xl font-bold text-[#1F2937] md:text-3xl">Register New Plot</h2>
          <p className="mt-2 font-sans text-sm text-[#9CA3AF]">
            Complete the details below. Your plot will appear on My Plots after registration.
          </p>

          {submitError && (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 font-sans text-sm text-red-300">
              {submitError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Plot Number</label>
              <input
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                className={`mt-1 w-full rounded-lg border bg-white px-4 py-3 font-mono text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/30 ${
                  fieldErr.plotNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-[#D1D5DB]'
                }`}
                placeholder="VZG-048"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-[#6B7280]">Location</label>
              <select
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value as (typeof VIZAG_LOCATIONS)[number])
                }
                className={`mt-1 w-full rounded-lg border bg-white px-4 py-3 font-sans text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/30 ${
                  fieldErr.location ? 'border-red-500 ring-1 ring-red-500' : 'border-[#D1D5DB]'
                }`}
              >
                {VIZAG_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} className="bg-white text-[#1F2937]">
                    {loc}
                  </option>
                ))}
              </select>
              {location === 'Other' && (
                <input
                  value={locationOther}
                  onChange={(e) => setLocationOther(e.target.value)}
                  className={`mt-3 w-full rounded-lg border bg-white px-4 py-3 font-sans text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/30 ${
                    fieldErr.location ? 'border-red-500 ring-1 ring-red-500' : 'border-[#D1D5DB]'
                  }`}
                  placeholder="Enter location"
                />
              )}
            </div>

            <div>
              <label className="font-mono text-xs text-[#6B7280]">Plot Size</label>
              <div
                className={`mt-3 grid grid-cols-2 gap-2 rounded-xl sm:grid-cols-4 ${
                  fieldErr.size ? 'rounded-xl p-1 ring-2 ring-red-500' : ''
                }`}
              >
                {SIZE_TILES.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSizeTile(label)}
                    className={
                      tileBase +
                      (sizeTile === label ? tileSelected : tileUnselected)
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {sizeTile === 'Custom' && (
                <input
                  type="number"
                  min={1}
                  value={customSqYards}
                  onChange={(e) => setCustomSqYards(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 font-mono text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/30"
                  placeholder="Sq yards"
                />
              )}
              {sqPreview != null && (
                <p className="mt-3 font-mono text-sm text-[#9CA3AF]">
                  3D plot will be generated for {sqPreview} sq yards.
                </p>
              )}
            </div>

            <div>
              <span className="font-mono text-xs text-[#6B7280]">Facing direction</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['East', 'West', 'North', 'South'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setFacing(dir)}
                    className={`rounded-full border px-5 py-2 font-sans text-sm transition-colors ${
                      facing === dir
                        ? 'border-[#C0392B] bg-[#FFF1F2] text-[#C0392B]'
                        : 'border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#9CA3AF]'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#6B7280]">Corner Plot</span>
              <button
                type="button"
                onClick={() => setCornerPlot(false)}
                className={`rounded-full border px-5 py-2 font-sans text-sm ${
                  !cornerPlot
                    ? 'border-[#C0392B] bg-[#FFF1F2] text-[#C0392B]'
                    : 'border-[#D1D5DB] bg-white text-[#6B7280]'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setCornerPlot(true)}
                className={`rounded-full border px-5 py-2 font-sans text-sm ${
                  cornerPlot
                    ? 'border-[#C0392B] bg-[#FFF1F2] text-[#C0392B]'
                    : 'border-[#D1D5DB] bg-white text-[#6B7280]'
                }`}
              >
                Yes
              </button>
            </div>

            <div>
              <label className="font-mono text-xs text-[#6B7280]">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 font-mono text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/30"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#C0392B] py-4 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-95"
            >
              {submitting ? 'Registering...' : 'Register Plot'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
