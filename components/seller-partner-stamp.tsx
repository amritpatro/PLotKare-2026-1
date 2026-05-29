type SellerPartnerStampProps = {
  compact?: boolean
  tone?: 'light' | 'dark'
}

export function SellerPartnerStamp({ compact = false, tone = 'light' }: SellerPartnerStampProps) {
  const dark = tone === 'dark'

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]',
        dark
          ? 'border-white/20 bg-black/35 text-white'
          : 'border-[#C9A962]/40 bg-[#FFF9EC] text-[#8A6D1D]',
      ].join(' ')}
      title="Seller partner with PlotKare bundled handover support"
      aria-label="PlotKare Seller Partner"
    >
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
        <path d="M3 5.25C3 4.00736 4.00736 3 5.25 3H8.25C9.49264 3 10.5 4.00736 10.5 5.25V8.25C10.5 9.49264 9.49264 10.5 8.25 10.5H5.25C4.00736 10.5 3 9.49264 3 8.25V5.25Z" fill={dark ? '#FCD34D' : '#C9A962'} />
        <path d="M7 5.7H12.55C13.6269 5.7 14.5 6.57304 14.5 7.65V11.8C14.5 12.8769 13.6269 13.75 12.55 13.75H8.4C7.32304 13.75 6.45 12.8769 6.45 11.8V7.35C6.45 6.43371 7.18371 5.7 8.1 5.7H7Z" stroke={dark ? '#F8FAFC' : '#8B1538'} strokeWidth="1.45" />
        <path d="M5.3 7.2L6.95 8.85L9.85 5.95" stroke={dark ? '#4B5563' : '#7C2D12'} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? 'Seller Partner' : 'PlotKare Seller Partner'}
    </span>
  )
}
