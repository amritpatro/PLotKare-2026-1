'use client'

import { cn } from '@/lib/utils'

/** Abstract top-down plot layout in the same polygon / muted style as the global presence map */
export function PlotTopdownSvg({
  className,
  cornerPlot,
}: {
  className?: string
  cornerPlot?: boolean
}) {
  return (
    <svg
      viewBox="0 0 360 220"
      className={cn('w-full max-w-md rounded-lg border border-white/10 bg-[#1a1a1a]', className)}
      aria-hidden
    >
      <path
        d="M24 28 L336 40 L320 196 L20 184 Z"
        fill="#2a2a2a"
        stroke="#3a3a3a"
        strokeWidth="1"
      />
      <path
        d="M48 52 L292 60 L280 172 L40 164 Z"
        fill="#252525"
        stroke="#4a4a4a"
        strokeWidth="0.75"
      />
      {cornerPlot && (
        <>
          <path d="M40 160 L40 56 L108 60 L104 168 Z" fill="#353535" stroke="#5a5a5a" strokeWidth="0.5" />
          <circle cx="72" cy="112" r="6" fill="#F59E0B" opacity="0.85" />
        </>
      )}
      <rect
        x="120"
        y="78"
        width="120"
        height="72"
        fill="none"
        stroke="#C0392B"
        strokeWidth="1.25"
        strokeDasharray="5 4"
        opacity="0.9"
      />
      <line x1="180" y1="78" x2="180" y2="150" stroke="#C0392B" strokeWidth="1.2" opacity="0.5" />
      <line x1="120" y1="114" x2="240" y2="114" stroke="#8B1538" strokeWidth="0.6" opacity="0.35" />
      <circle cx="180" cy="114" r="4" fill="#C0392B" />
      <text x="188" y="98" fill="#9CA3AF" fontSize="9" className="font-mono">
        N
      </text>
    </svg>
  )
}
