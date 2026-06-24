'use client'

import Link from 'next/link'
import { LogoMark } from '@/components/logo'

type StepProgressProps = {
  currentStep: number
  totalSteps: number
  stepLabel: string
}

export function StepProgress({ currentStep, totalSteps, stepLabel }: StepProgressProps) {
  const progress = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100))

  return (
    <header className="mx-auto w-full max-w-5xl px-6 pt-6">
      <div className="flex items-center justify-between gap-6">
        <Link href="/" aria-label="PlotKare home">
          <LogoMark />
        </Link>
        <p className="text-right text-sm font-medium text-[#5f5f5f]">
          Step {currentStep} of {totalSteps} - {stepLabel}
        </p>
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-[#1a1a1a]/10">
        <div
          className="h-full rounded-full bg-[#8B1538] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  )
}
