'use client'

import type { FormEvent, ReactNode } from 'react'

const cardClass =
  'rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8 lg:p-10'

type StepContainerProps = {
  title: string
  subtitle?: string
  children: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
  error?: string | null
  onBack?: () => void
  submitButtonText?: string
  headerExtra?: ReactNode
}

export function StepContainer({
  title,
  subtitle,
  children,
  onSubmit,
  isLoading = false,
  error,
  onBack,
  submitButtonText = 'Continue',
  headerExtra,
}: StepContainerProps) {
  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">PlotKare onboarding</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold italic text-[#D4AF94] sm:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-3 font-sans text-sm leading-6 text-white/60">{subtitle}</p> : null}
        {headerExtra}
      </div>

      {error ? (
        <p className="mb-6 rounded-md border border-red-400/30 bg-red-950/30 px-4 py-3 font-sans text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-6">{children}</div>

      <StepActions onBack={onBack} isLoading={isLoading} submitButtonText={submitButtonText} />
    </form>
  )
}

function StepActions({
  onBack,
  isLoading,
  submitButtonText,
}: {
  onBack?: () => void
  isLoading: boolean
  submitButtonText: string
}) {
  return (
    <div className={`flex gap-4 pt-8 ${onBack ? '' : ''}`}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 rounded-md border border-white/15 py-3 font-sans text-sm font-medium text-white/80 transition-colors hover:border-[#D4AF94]/40 hover:text-[#D4AF94] disabled:opacity-60"
        >
          Back
        </button>
      ) : null}
      <button
        type="submit"
        disabled={isLoading}
        className={`${onBack ? 'flex-1' : 'w-full'} rounded-md bg-[#C0392B] py-3 font-sans text-base font-semibold text-white transition-colors hover:bg-[#A93225] disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {isLoading ? 'Saving...' : submitButtonText}
      </button>
    </div>
  )
}
