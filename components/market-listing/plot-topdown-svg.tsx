'use client'

/** Simple abstract top-down plot layout (map-style), not geospatially accurate. */
export function PlotTopdownSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="200" height="140" fill="#E8E4DC" rx="4" />
      <rect
        x="12"
        y="12"
        width="176"
        height="116"
        fill="none"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        rx="2"
      />
      <polygon
        points="40,35 155,40 150,105 35,100"
        fill="#D1FAE5"
        stroke="#16A34A"
        strokeWidth="1.5"
        opacity="0.9"
      />
      <line x1="98" y1="35" x2="98" y2="102" stroke="#6B7280" strokeWidth="0.75" strokeDasharray="2 2" />
      <circle cx="98" cy="68" r="4" fill="#C0392B" />
      <text x="106" y="72" fontSize="8" fill="#374151" fontFamily="system-ui">
        Entry
      </text>
    </svg>
  )
}
