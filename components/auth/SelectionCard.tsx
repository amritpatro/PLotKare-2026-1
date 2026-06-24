'use client'

type SelectionCardProps = {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  selected: boolean
  onSelect: () => void
  badge?: string
  disabled?: boolean
}

export function SelectionCard({
  id,
  label,
  description,
  icon,
  selected,
  onSelect,
  badge,
  disabled,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`relative w-full rounded-2xl p-5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1538] ${
        disabled
          ? 'cursor-not-allowed border border-[#1a1a1a]/10 bg-[#F8F6F3] opacity-50'
          : selected
            ? 'border border-[#8B1538] bg-[#8B1538]/5 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]'
            : 'border border-[#1a1a1a]/10 bg-white hover:border-[#8B1538]/40'
      }`}
    >
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-[#F8F6F3] px-2 py-0.5 text-xs text-[#5f5f5f]">
          {badge}
        </span>
      ) : null}
      <div className={`flex items-start gap-4 ${badge ? 'pr-20' : ''}`}>
        {icon ? <span className="text-2xl leading-none text-[#8B1538]">{icon}</span> : null}
        <div>
          <p className="font-semibold text-[#1a1a1a]">{label}</p>
          {description ? <p className="mt-2 text-sm leading-6 text-[#5f5f5f]">{description}</p> : null}
        </div>
      </div>
    </button>
  )
}
