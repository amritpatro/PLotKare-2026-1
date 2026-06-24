'use client'

import { PremiumButton } from '@/components/auth/PremiumButton'

type OnboardingCardProps = {
  stepNumber: number
  totalSteps: number
  title: string
  description: string
  children: React.ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextLoading?: boolean
  nextDisabled?: boolean
  skipLabel?: string
  onSkip?: () => void
  error?: string | null
}

export function OnboardingCard({
  stepNumber,
  totalSteps,
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextLoading,
  nextDisabled,
  skipLabel,
  onSkip,
  error,
}: OnboardingCardProps) {
  return (
    <div className="animate-fade-in-up mx-auto mt-12 w-full max-w-2xl rounded-2xl border border-[#1a1a1a]/10 bg-white p-8 shadow-2xl shadow-black/10 md:mt-16 md:p-12">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B1538] text-sm font-bold text-white">
        {String(stepNumber).padStart(2, '0')}
      </div>
      <p className="mt-5 text-sm font-medium uppercase tracking-widest text-[#6B7280]">
        Step {stepNumber} of {totalSteps}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#1a1a1a] md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#5f5f5f]">{description}</p>
      <div className="my-8 border-b border-[#1a1a1a]/10" />
      <div className="space-y-6">{children}</div>
      {error ? (
        <div role="alert" className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <PremiumButton type="button" variant="secondary" onClick={onBack}>
            Back
          </PremiumButton>
        ) : (
          <span />
        )}
        <PremiumButton type={onNext ? 'button' : 'submit'} onClick={onNext} loading={nextLoading} disabled={nextDisabled}>
          {nextLabel}
        </PremiumButton>
      </div>
      {skipLabel && onSkip ? (
        <button type="button" onClick={onSkip} className="mt-5 w-full text-center text-sm text-[#6B7280] underline-offset-4 hover:text-[#8B1538] hover:underline">
          {skipLabel}
        </button>
      ) : null}
    </div>
  )
}
