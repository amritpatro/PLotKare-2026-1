'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { customerTypeFromSlug, slugFromCustomerType, type CustomerType } from '@/lib/onboarding/types'

const TYPE_OPTIONS: { type: CustomerType; label: string; description: string }[] = [
  {
    type: 'land_owner',
    label: 'Land owner',
    description: 'Monitor plots, documents, and amenities on your land.',
  },
  {
    type: 'plot_seller',
    label: 'Plot seller',
    description: 'List and sell plots with verified business credentials.',
  },
  {
    type: 'plot_buyer',
    label: 'Plot buyer',
    description: 'Set investment preferences and complete KYC to buy plots.',
  },
]

export default function OnboardingRouterPage() {
  const params = useParams()
  const router = useRouter()
  const slug = String(params.customerType ?? '')

  const resolved = customerTypeFromSlug(slug)

  useEffect(() => {
    if (resolved) {
      router.replace(`/onboarding/${slugFromCustomerType(resolved)}`)
    }
  }, [resolved, router])

  if (resolved) return null

  return (
    <OnboardingShell
      eyebrow="Choose your path"
      title="Complete your PlotKare profile."
      description="Select the onboarding flow that matches how you use PlotKare. You can update this later with our team."
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-md sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">Account type</p>
        <div className="mt-6 grid gap-4">
          {TYPE_OPTIONS.map((option) => (
            <Link
              key={option.type}
              href={`/onboarding/${slugFromCustomerType(option.type)}`}
              className="block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#D4AF94]/40 hover:bg-[#D4AF94]/5"
            >
              <p className="font-serif text-xl text-[#D4AF94]">{option.label}</p>
              <p className="mt-2 font-sans text-sm text-white/60">{option.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </OnboardingShell>
  )
}
