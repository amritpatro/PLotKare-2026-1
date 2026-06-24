'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

type OnboardingStatusPageProps = {
  variant: 'land_owner' | 'plot_seller' | 'plot_buyer'
  welcomeBack?: boolean
  onDismissWelcome?: () => void
  tone?: 'light' | 'dark'
}

const COPY = {
  land_owner: {
    title: 'Verification pending',
    body: 'Your property details are saved and queued for review. You can continue from the owner dashboard while the operations team checks the submission.',
    primary: { href: '/owner', label: 'Go to owner dashboard' },
    secondary: { href: '/owner/services', label: 'Explore services' },
  },
  plot_seller: {
    title: 'Seller profile submitted',
    body: 'Your seller profile is saved for admin review. Listing documents and payout details can be added later from protected dashboard flows.',
    primary: { href: '/seller', label: 'Go to seller dashboard' },
    secondary: { href: '/support', label: 'Contact support' },
  },
  plot_buyer: {
    title: 'Buyer profile ready',
    body: 'Your buying preferences are saved. You can browse verified listings and add extra verification details only when a real transaction needs them.',
    primary: { href: '/customer/listings', label: 'View listings' },
    secondary: { href: '/customer', label: 'Go to customer dashboard' },
  },
} as const

const toneClasses = {
  light: {
    card: 'border-[#1a1a1a]/10 bg-white text-[#1a1a1a] shadow-2xl shadow-black/10',
    welcome: 'border-[#8B1538]/20 bg-[#8B1538]/10 text-[#5f5f5f]',
    welcomeAction: 'text-[#8B1538]',
    icon: 'bg-[#8B1538] text-white',
    title: 'text-[#1a1a1a]',
    body: 'text-[#5f5f5f]',
    secondary:
      'border-[#1a1a1a]/15 text-[#5f5f5f] hover:border-[#8B1538]/40 hover:text-[#8B1538]',
  },
  dark: {
    card: 'border-white/10 bg-white/[0.045] text-white shadow-2xl shadow-black/30 backdrop-blur-md',
    welcome: 'border-[#D4AF94]/20 bg-[#D4AF94]/10 text-white/75',
    welcomeAction: 'text-[#D4AF94]',
    icon: 'bg-[#C0392B] text-white',
    title: 'text-white',
    body: 'text-white/65',
    secondary:
      'border-white/15 text-white/80 hover:border-[#D4AF94]/40 hover:text-[#D4AF94]',
  },
} as const

export function OnboardingStatusPage({
  variant,
  welcomeBack,
  onDismissWelcome,
  tone = 'light',
}: OnboardingStatusPageProps) {
  const copy = COPY[variant]
  const classes = toneClasses[tone]

  return (
    <div className={`rounded-2xl border p-8 text-center sm:p-10 ${classes.card}`}>
      {welcomeBack ? (
        <p className={`mb-6 rounded-xl border px-4 py-3 font-sans text-sm ${classes.welcome}`}>
          Welcome back. Your progress was restored.{' '}
          {onDismissWelcome ? (
            <button type="button" onClick={onDismissWelcome} className={`${classes.welcomeAction} underline`}>
              Dismiss
            </button>
          ) : null}
        </p>
      ) : null}

      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${classes.icon}`}>
        <Check className="h-8 w-8" aria-hidden />
      </div>
      <h1 className={`mt-6 font-serif text-3xl font-semibold ${classes.title}`}>{copy.title}</h1>
      <p className={`mx-auto mt-4 max-w-md font-sans text-sm leading-7 ${classes.body}`}>{copy.body}</p>

      <StatusActions primary={copy.primary} secondary={copy.secondary} secondaryClassName={classes.secondary} />
    </div>
  )
}

function StatusActions({
  primary,
  secondary,
  secondaryClassName,
}: {
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
  secondaryClassName: string
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
        className={`rounded-md border px-6 py-3 font-sans text-sm font-medium transition-colors ${secondaryClassName}`}
      >
        {secondary.label}
      </Link>
    </div>
  )
}
