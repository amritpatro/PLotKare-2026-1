'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

type OnboardingStatusPageProps = {
  variant: 'land_owner' | 'plot_seller' | 'plot_buyer'
  welcomeBack?: boolean
  onDismissWelcome?: () => void
}

const COPY = {
  land_owner: {
    title: 'Verification pending',
    body: 'Your property details are being reviewed. You will receive an email update within 24 hours. Meanwhile, you can explore amenities and your dashboard.',
    primary: { href: '/dashboard/amenities', label: 'Explore amenities' },
    secondary: { href: '/dashboard', label: 'Go to dashboard' },
  },
  plot_seller: {
    title: 'Documents under review',
    body: 'Our team is verifying your business documents and bank details. This usually takes 24–48 hours. We will email you at each milestone.',
    primary: { href: '/dashboard', label: 'Go to dashboard' },
    secondary: { href: '/support', label: 'Contact support' },
  },
  plot_buyer: {
    title: 'KYC under review',
    body: 'Your KYC documents and bank details are being verified. This usually takes 24–48 hours before you can inquire on verified listings.',
    primary: { href: '/listings', label: 'View listings' },
    secondary: { href: '/dashboard', label: 'Go to dashboard' },
  },
} as const

export function OnboardingStatusPage({ variant, welcomeBack, onDismissWelcome }: OnboardingStatusPageProps) {
  const copy = COPY[variant]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-md sm:p-10">
      {welcomeBack ? (
        <p className="mb-6 rounded-xl border border-[#D4AF94]/20 bg-[#D4AF94]/10 px-4 py-3 font-sans text-sm text-white/75">
          Welcome back — your progress was restored.{' '}
          {onDismissWelcome ? (
            <button type="button" onClick={onDismissWelcome} className="text-[#D4AF94] underline">
              Dismiss
            </button>
          ) : null}
        </p>
      ) : null}

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C0392B]">
        <Check className="h-8 w-8 text-white" aria-hidden />
      </div>
      <h2 className="mt-6 font-serif text-3xl font-semibold text-white">{copy.title}</h2>
      <p className="mx-auto mt-4 max-w-md font-sans text-sm leading-7 text-white/60">{copy.body}</p>

      <StatusActions primary={copy.primary} secondary={copy.secondary} />
    </div>
  )
}

function StatusActions({
  primary,
  secondary,
}: {
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Link
        href={primary.href}
        className="rounded-md bg-[#C0392B] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#A93225]"
      >
        {primary.label}
      </Link>
      <Link
        href={secondary.href}
        className="rounded-md border border-white/15 px-6 py-3 font-sans text-sm font-medium text-white/80 transition-colors hover:border-[#D4AF94]/40 hover:text-[#D4AF94]"
      >
        {secondary.label}
      </Link>
    </div>
  )
}
