'use client'

export type AreaUnit = 'sq_ft' | 'sq_m' | 'cents' | 'acres' | 'guntas' | 'grounds' | 'sq_yards'

type UnitInputProps = {
  label: string
  value: number | ''
  unit: AreaUnit
  onValueChange: (val: number | '') => void
  onUnitChange: (unit: AreaUnit) => void
  error?: string
  required?: boolean
}

const unitLabels: Record<AreaUnit, string> = {
  sq_ft: 'Sq ft',
  sq_m: 'Sq meters',
  cents: 'Cents',
  acres: 'Acres',
  guntas: 'Guntas',
  grounds: 'Grounds',
  sq_yards: 'Sq yards',
}

const toSqFt: Record<AreaUnit, number> = {
  sq_ft: 1,
  sq_m: 10.7639,
  cents: 435.6,
  acres: 43560,
  guntas: 1089,
  grounds: 2400,
  sq_yards: 9,
}

export function UnitInput({ label, value, unit, onValueChange, onUnitChange, error, required }: UnitInputProps) {
  const sqFt = typeof value === 'number' && Number.isFinite(value) ? value * toSqFt[unit] : null
  const acres = sqFt ? sqFt / 43560 : null

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="flex gap-3">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => {
            const next = event.target.value
            onValueChange(next === '' ? '' : Number(next))
          }}
          aria-invalid={Boolean(error)}
          className="h-14 min-w-0 flex-1 rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
        />
        <select
          value={unit}
          onChange={(event) => onUnitChange(event.target.value as AreaUnit)}
          className="h-14 w-36 rounded-xl border border-[#1a1a1a]/15 bg-white px-3 text-base text-[#1a1a1a] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538]"
        >
          {Object.entries(unitLabels).map(([key, labelText]) => (
            <option key={key} value={key}>
              {labelText}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {sqFt ? (
        <p className="text-sm text-[#6B7280]">
          Approximately {Math.round(sqFt).toLocaleString('en-IN')} sq ft
          {acres ? ` - ${acres.toFixed(3)} acres` : ''}
        </p>
      ) : null}
    </div>
  )
}
