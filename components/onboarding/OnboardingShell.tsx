'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { LogoMark } from '@/components/logo'

type OnboardingShellProps = {
  eyebrow: string
  title: string
  description: string
  highlights?: string[]
  children: ReactNode
}

export function OnboardingShell({
  eyebrow,
  title,
  description,
  highlights = [
    'Encrypted document storage',
    'Advisor-led verification',
    'Private dashboard after setup',
  ],
  children,
}: OnboardingShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0D1A0F] lg:grid-cols-[0.85fr_1.15fr]">
      <aside className="hidden flex-col justify-between bg-[#0A1F12] p-10 lg:flex">
        <Link href="/" aria-label="PlotKare home">
          <LogoMark />
        </Link>
        <div className="max-w-md space-y-7">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">{eyebrow}</p>
          <h1 className="font-serif text-5xl font-semibold leading-tight text-white">{title}</h1>
          <p className="font-sans text-base leading-8 text-white/65">{description}</p>
        </div>
        <ul className="grid gap-3 text-white/70">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-3 font-sans text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#D4AF94]" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </div>
  )
}
