'use client'

import { Check } from 'lucide-react'

type StepProgressProps = {
  currentStep: number
  totalSteps: number
  stepNames: readonly string[]
}

export function StepProgress({ currentStep, totalSteps, stepNames }: StepProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-2">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const step = idx + 1
          const isActive = step === currentStep
          const isCompleted = step < currentStep

          return (
            <div key={step} className="flex flex-1 flex-col items-center gap-2">
              <StepCircle isCompleted={isCompleted} isActive={isActive} step={step} />
              <p
                className={`max-w-[5.5rem] text-center font-mono text-[10px] uppercase leading-tight tracking-[0.12em] ${
                  isActive ? 'text-[#D4AF94]' : 'text-white/40'
                }`}
              >
                {stepNames[idx]}
              </p>
            </div>
          )
        })}
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <ProgressFill currentStep={currentStep} totalSteps={totalSteps} />
      </div>
    </div>
  )
}

function StepCircle({
  isCompleted,
  isActive,
  step,
}: {
  isCompleted: boolean
  isActive: boolean
  step: number
}) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-semibold transition-all ${
        isCompleted
          ? 'bg-[#D4AF94]/20 text-[#D4AF94] ring-1 ring-[#D4AF94]/40'
          : isActive
            ? 'bg-[#C0392B] text-white ring-2 ring-[#C0392B]/50'
            : 'border border-white/15 bg-white/[0.04] text-white/40'
      }`}
    >
      {isCompleted ? <Check className="h-4 w-4" aria-hidden /> : step}
    </div>
  )
}

function ProgressFill({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div
      className="h-full bg-[#C0392B] transition-all duration-500"
      style={{ width: `${Math.min((currentStep / totalSteps) * 100, 100)}%` }}
    />
  )
}
