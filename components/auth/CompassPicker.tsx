'use client'

export type Facing = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

type CompassPickerProps = {
  value: Facing | null
  onChange: (facing: Facing) => void
  label?: string
  allowed?: Facing[]
}

const directionLabels: Record<Facing, string> = {
  N: 'North',
  NE: 'North East',
  E: 'East',
  SE: 'South East',
  S: 'South',
  SW: 'South West',
  W: 'West',
  NW: 'North West',
}

const cells: Array<Facing | null> = ['NW', 'N', 'NE', 'W', null, 'E', 'SW', 'S', 'SE']

export function CompassPicker({ value, onChange, label = 'Facing', allowed }: CompassPickerProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">{label}</label>
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-3">
        {cells.map((direction, index) =>
          direction ? (
            <button
              key={direction}
              type="button"
              onClick={() => onChange(direction)}
              disabled={allowed ? !allowed.includes(direction) : false}
              className={`flex aspect-square items-center justify-center rounded-full border text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1538] disabled:cursor-not-allowed disabled:opacity-35 ${
                value === direction
                  ? 'border-[#8B1538] bg-[#8B1538] text-white'
                  : 'border-[#1a1a1a]/10 bg-white text-[#5f5f5f] hover:border-[#8B1538]/40'
              }`}
            >
              {direction}
            </button>
          ) : (
            <div key={`center-${index}`} className="flex aspect-square items-center justify-center rounded-full border border-[#1a1a1a]/10 bg-[#ffffff] text-xs text-[#6B7280]">
              Plot
            </div>
          ),
        )}
      </div>
      <p className="text-center text-sm text-[#5f5f5f]">
        {value ? `${directionLabels[value]} facing` : 'Select the property facing'}
      </p>
    </div>
  )
}
