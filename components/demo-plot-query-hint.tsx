'use client'

import { useSearchParams } from 'next/navigation'

/** Reads listing label from /demo/plot-3d/?listing=… — client-only for static export. */
export function PlotDemoQueryHint() {
  const sp = useSearchParams()
  const raw = sp.get('listing') ?? sp.get('from')
  if (!raw) return null
  const label = decodeURIComponent(raw.replace(/\+/g, ' '))
  return (
    <p className="font-mono text-sm text-white/55">
      Listing context: <span className="text-white/85">{label}</span> — demo geometry may not match survey records.
    </p>
  )
}
