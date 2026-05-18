'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BriefcaseBusiness, Building2, Check, Home } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { slugFromCustomerType, type CustomerType } from '@/lib/onboarding/types'

const ROLES: {
  id: CustomerType
  title: string
  subtitle: string
  Icon: typeof Home
  features: string[]
}[] = [
  {
    id: 'land_owner',
    title: 'Land Owner',
    subtitle: 'I own land and want to protect and grow its value',
    Icon: Home,
    features: ['Monthly inspections', 'Legal document vault', 'Value tracking', 'Amenity services'],
  },
  {
    id: 'plot_seller',
    title: 'Plot Developer / Seller',
    subtitle: 'I develop or sell plots and want to list them',
    Icon: Building2,
    features: ['List your plots', 'Manage buyers', 'Commission tracking', 'Document management'],
  },
  {
    id: 'plot_buyer',
    title: 'Plot Buyer / Investor',
    subtitle: 'I want to find and buy verified plots',
    Icon: BriefcaseBusiness,
    features: ['Browse verified plots', 'Inspection reports', 'Direct contact', 'Loan assistance'],
  },
]

export default function ChooseRolePage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [selected, setSelected] = useState<CustomerType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if user already has a role on mount
  useEffect(() => {
    const checkExistingRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('customer_type, onboarding_completed')
          .eq('id', user.id)
          .single()

        if (!profile) return

        // User already has a role
        if (profile.customer_type) {
          // If onboarding complete, go to dashboard
          if (profile.onboarding_completed) {
            router.push('/dashboard')
            return
          }
          // If onboarding incomplete, go to onboarding page
          const slug = slugFromCustomerType(profile.customer_type as CustomerType)
          router.push(`/onboarding/${slug}`)
        }
      } catch (err) {
        console.error('Error checking role:', err)
      }
    }

    checkExistingRole()
  }, [router, supabase])

  const handleContinue = async () => {
    if (!selected) return

    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          customer_type: selected,
          onboarding_status: 'in_progress',
          onboarding_completed: false,
        })
        .eq('id', user.id)

      if (updateError) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({
            customer_type: selected,
            onboarding_status: 'in_progress',
          })
          .eq('id', user.id)

        if (fallbackError) throw fallbackError
      }

      router.push(`/onboarding/${slugFromCustomerType(selected)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0D1A0F] lg:grid-cols-[0.85fr_1.15fr]">
      <div className="hidden flex-col justify-between bg-[#0A1F12] p-10 lg:flex">
        <div aria-label="PlotKare home">
          <LogoMark variant="light" />
        </div>
        <div className="max-w-md space-y-7">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">
            Choose your path
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-tight text-white">
            Tell us how you'll use PlotKare.
          </h1>
          <p className="font-sans text-base leading-8 text-white/65">
            Select your role to get a personalized dashboard, inspections, documents, and tools built for your property journey.
          </p>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8 lg:p-10">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">PlotKare onboarding</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold italic text-[#D4AF94] sm:text-5xl">
              Choose your role.
            </h1>
            <p className="mt-3 font-sans text-sm leading-6 text-white/60">
              Select the option that best describes how you'll use PlotKare.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelected(role.id)}
                className={`relative rounded-xl border p-5 text-left transition-all duration-200 ${
                  selected === role.id
                    ? 'border-[#D4AF94] bg-[#D4AF94]/10 shadow-lg shadow-[#D4AF94]/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {selected === role.id && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF94]">
                    <Check className="h-3 w-3 text-black" />
                  </span>
                )}

                <role.Icon className={`mb-3 h-8 w-8 ${selected === role.id ? 'text-[#D4AF94]' : 'text-white/50'}`} />
                <h3 className="mb-1 font-sans text-base font-semibold text-white">
                  {role.title}
                </h3>
                <p className="mb-3 font-sans text-xs text-white/50">{role.subtitle}</p>

                <ul className="space-y-1">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 font-sans text-xs text-white/40">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#D4AF94]/60" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-md border border-red-400/30 bg-red-950/30 px-4 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selected || loading}
            className="w-full rounded-md bg-[#C0392B] py-4 font-sans text-base font-semibold text-white transition-colors hover:bg-[#A93225] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Setting up your profile...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
