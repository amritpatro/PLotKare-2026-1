'use client'

import { useCallback, useRef, useState } from 'react'
import { FileUp, X } from 'lucide-react'
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, MAX_KYC_FILE_BYTES } from '@/lib/onboarding/config'

type FileDropzoneProps = {
  name: string
  label: string
  hint?: string
  optional?: boolean
  kyc?: boolean
  value?: File | null
  onChange: (file: File | null) => void
}

export function FileDropzone({
  name,
  label,
  hint,
  optional = false,
  kyc = false,
  value,
  onChange,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const maxBytes = kyc ? MAX_KYC_FILE_BYTES : MAX_FILE_BYTES

  const validate = useCallback(
    (file: File) => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return 'Use PDF, JPG, or PNG only.'
      }
      if (file.size > maxBytes) {
        return `File exceeds ${kyc ? 5 : 10}MB limit.`
      }
      return null
    },
    [kyc, maxBytes],
  )

  const handleFile = (file: File | null) => {
    if (!file) {
      onChange(null)
      setLocalError(null)
      return
    }
    const err = validate(file)
    if (err) {
      setLocalError(err)
      return
    }
    setLocalError(null)
    onChange(file)
  }

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">
        {label}
        {optional ? <span className="ml-2 text-white/30">(optional)</span> : null}
      </span>
      {hint ? <p className="mt-1 font-sans text-xs text-white/50">{hint}</p> : null}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-2 cursor-pointer rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
          dragOver
            ? 'border-[#D4AF94] bg-[#D4AF94]/10'
            : 'border-white/15 bg-white/[0.02] hover:border-[#D4AF94]/40'
        }`}
      >
        <FileUp className="mx-auto h-8 w-8 text-[#D4AF94]/70" aria-hidden />
        <p className="mt-3 font-sans text-sm text-white/70">Drag & drop or click to upload</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/35">
          PDF, JPG, PNG · max {kyc ? 5 : 10}MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {value ? (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="truncate font-sans text-sm text-white/80">{value.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleFile(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="text-white/50 hover:text-white"
            aria-label={`Remove ${value.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {localError ? <p className="mt-2 font-sans text-xs text-red-300">{localError}</p> : null}
    </div>
  )
}
