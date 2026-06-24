'use client'

type PremiumInputProps = {
  label: string
  id: string
  type?: string
  placeholder?: string
  value: string
  onChange: (val: string) => void
  error?: string
  hint?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
  name?: string
}

export function PremiumInput({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  prefix,
  suffix,
  required,
  disabled,
  autoComplete,
  inputMode,
  maxLength,
  name,
}: PremiumInputProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="relative">
        {prefix ? <div className="absolute left-0 top-0 flex h-14 items-center">{prefix}</div> : null}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          className={`h-14 w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 text-base text-[#1a1a1a] placeholder:text-[#9CA3AF] outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#8B1538] disabled:cursor-not-allowed disabled:opacity-50 ${
            prefix ? 'pl-20' : ''
          } ${suffix ? 'pr-12' : ''}`}
        />
        {suffix ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div> : null}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-[#6B7280]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
