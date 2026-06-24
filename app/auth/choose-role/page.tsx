'use client'

import { logger } from '@/lib/monitoring/logger'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BriefcaseBusiness, Building2, Home } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { PremiumButton } from '@/components/auth/PremiumButton'
import { SelectionCard } from '@/components/auth/SelectionCard'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { slugFromCustomerType, type CustomerType } from '@/lib/onboarding/types'

const dashboardByCustomerType: Record<CustomerType, string> = {
  land_owner: '/owner',
  plot_seller: '/seller',
  plot_buyer: '/customer',
}

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
            router.push(dashboardByCustomerType[profile.customer_type as CustomerType] ?? '/auth/choose-role')
            return
          }
          // If onboarding incomplete, go to onboarding page
          const slug = slugFromCustomerType(profile.customer_type as CustomerType)
          router.push(`/onboarding/${slug}`)
        }
      } catch (err) {
        logger.error('Error checking role:', err)
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
    <main className="min-h-screen bg-[#F8F6F3] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col">
        <Link href="/" aria-label="PlotKare home" className="w-fit">
          <LogoMark />
        </Link>

        <section className="flex flex-1 items-center py-12">
          <div className="w-full rounded-2xl border border-[#1a1a1a]/10 bg-white p-8 shadow-2xl shadow-black/10 md:p-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#1a1a1a]">What brings you to PlotKare?</h1>
              <p className="mt-4 text-lg leading-relaxed text-[#5f5f5f]">
                Choose your role. You can always contact us to change it later.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              {ROLES.map((role) => (
                <SelectionCard
                  key={role.id}
                  id={`choose-role-${role.id}`}
                  icon={<role.Icon className="h-7 w-7" />}
                  label={role.title}
                  description={`${role.subtitle}. ${role.features.slice(0, 2).join(' and ')} included.`}
                  selected={selected === role.id}
                  onSelect={() => setSelected(role.id)}
                />
              ))}
            </div>

            {error && (
              <div role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <PremiumButton onClick={handleContinue} disabled={!selected || loading} loading={loading} fullWidth className="mt-8">
              Continue
            </PremiumButton>
          </div>
        </section>
      </div>
    </main>
  )
}
