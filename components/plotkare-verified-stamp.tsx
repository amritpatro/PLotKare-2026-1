type PlotKareVerifiedStampProps = {
  className?: string
  compact?: boolean
  tone?: 'light' | 'dark'
}

export function PlotKareVerifiedStamp({ className = '', compact = false, tone = 'light' }: PlotKareVerifiedStampProps) {
  const dark = tone === 'dark'

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]',
        dark
          ? 'border-white/25 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
          : 'border-[#8B1538]/25 bg-[#FFF1F2] text-[#8B1538] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        className,
      ].join(' ')}
      title="Verified by PlotKare operations"
      aria-label="PlotKare Verified"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M9 1.5L11.02 3.02L13.5 2.58L14.18 5.02L16.35 6.3L15.28 8.6L15.9 11.05L13.55 12L12.25 14.15L9.75 13.82L7.75 15.35L5.85 13.68L3.35 13.85L2.2 11.6L.1 10.2L1.32 8L.88 5.52L3.28 4.68L4.72 2.62L7.18 3.12L9 1.5Z"
          fill="#8B1538"
          opacity={dark ? '0.95' : '1'}
        />
        <path
          d="M5.25 9.1L7.55 11.25L12.65 6.7"
          stroke="#C9A962"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? 'Verified' : 'PlotKare Verified'}
    </span>
  )
}
