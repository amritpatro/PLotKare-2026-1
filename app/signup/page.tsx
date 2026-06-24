'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PremiumButton } from '@/components/auth/PremiumButton'
import { PremiumInput } from '@/components/auth/PremiumInput'
import { SelectionCard } from '@/components/auth/SelectionCard'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  rememberPendingOnboardingPath,
  resolvePostLoginRedirect,
} from '@/lib/onboarding/redirect'
import { slugFromCustomerType, type CustomerType } from '@/lib/onboarding/types'
import { buildAuthCallbackUrl, formatAuthError } from '@/lib/supabase/auth-redirect'
import { getPasswordRequirementChecks, signupSchema } from '@/lib/validation/auth'

type SignupFormData = {
  customerType: CustomerType | ''
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

const initialFormData: SignupFormData = {
  customerType: '',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const roleOptions: Array<{
  id: CustomerType
  title: string
  subtitle: string
}> = [
  {
    id: 'land_owner',
    title: 'Land Owner',
    subtitle: 'Monitor and protect owned land.',
  },
  {
    id: 'plot_seller',
    title: 'Property Seller',
    subtitle: 'List verified plots and properties.',
  },
  {
    id: 'plot_buyer',
    title: 'Property Buyer',
    subtitle: 'Find verified properties to buy.',
  },
]

function normalizeFieldValue(name: string, value: string) {
  if (name === 'postalCode') return value.replace(/\D/g, '').slice(0, 6)
  if (name === 'phone') return value.replace(/[^\d+\s-]/g, '').slice(0, 20)
  return value
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [nextPath, setNextPath] = useState('/auth/choose-role')
  const [intent, setIntent] = useState('')
  const [formData, setFormData] = useState<SignupFormData>(initialFormData)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null)

  const checks = useMemo(() => getPasswordRequirementChecks(formData.password), [formData.password])
  const strength = checks.filter((item) => item.valid).length

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    if (next?.startsWith('/')) setNextPath(next)
    setIntent(params.get('intent') ?? '')
  }, [])

  useEffect(() => {
    let mounted = true

    fetch('/api/auth/providers')
      .then(async (response) => {
        const providers = (await response.json()) as { google?: boolean }
        if (mounted) setGoogleEnabled(response.ok && providers.google === true)
      })
      .catch(() => {
        if (mounted) setGoogleEnabled(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return
      const destination = await resolvePostLoginRedirect(supabase, data.user.id, nextPath)
      if (mounted) router.replace(destination)
    })
    return () => {
      mounted = false
    }
  }, [nextPath, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')

    const parsed = signupSchema.safeParse(formData)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please complete all required details.')
      return
    }

    const onboardingPath = `/onboarding/${slugFromCustomerType(parsed.data.customerType)}`
    rememberPendingOnboardingPath(onboardingPath)

    setSubmitting(true)
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
    const result = (await response.json()) as {
      error?: string
      sessionCreated?: boolean
      awaitingEmailConfirmation?: boolean
      destination?: string
    }
    setSubmitting(false)

    if (!response.ok) {
      setError(result.error ?? 'We could not create the account right now. Please try again later.')
      return
    }

    if (result.sessionCreated) {
      router.replace(result.destination ?? onboardingPath)
      router.refresh()
      return
    }

    if (result.awaitingEmailConfirmation) {
      setAwaitingEmailConfirmation(true)
    }

    setSubmitted(true)
  }

  const handleOAuth = async () => {
    setError('')
    if (googleEnabled !== true) {
      setError('Google sign-up is not enabled for this PlotKare environment yet.')
      return
    }

    setSubmitting(true)
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildAuthCallbackUrl('/auth/choose-role'),
        skipBrowserRedirect: true,
      },
    })
    if (oauthError) {
      setError(formatAuthError(oauthError))
      setSubmitting(false)
      return
    }

    if (!data.url) {
      setError('Google sign-up could not be started. Please try again.')
      setSubmitting(false)
      return
    }

    window.location.assign(data.url)
  }

  return (
    <AuthLayout
      headline="Build your property command room."
      subtext="Choose the right workspace first. PlotKare then opens the exact setup flow for owners, sellers, or buyers."
    >
      <div className="rounded-2xl border border-[#1a1a1a]/10 bg-white p-8 shadow-2xl shadow-black/10 md:p-10 xl:p-12">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a] md:text-4xl">Create your account</h1>
          <p className="text-base leading-7 text-[#5f5f5f]">
            Join property owners protecting their land the smart way.
          </p>
        </div>

        <div className="my-8 border-b border-[#8B1538]/20" />

          {intent === 'add-property' ? (
            <p className="mb-6 rounded-xl border border-[#8B1538]/20 bg-[#8B1538]/10 px-4 py-3 text-sm leading-relaxed text-[#5f5f5f]">
              Create your owner account first. After signup, your dashboard will guide plot details, documents, and
              inspection setup.
            </p>
          ) : null}

          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                  <Check size={36} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#1a1a1a]">
                  {awaitingEmailConfirmation ? 'Confirm your email' : 'Account created'}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
                  {awaitingEmailConfirmation
                    ? `We sent a confirmation link to ${formData.email}. Open it on this device, then sign in to continue.`
                    : 'Your access has been created. Sign in to continue to the PlotKare dashboard.'}
                </p>
                <PremiumButton onClick={() => router.push('/login')} fullWidth className="mt-6">
                  Go to Sign In
                </PremiumButton>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <span className="block text-sm font-medium uppercase tracking-widest text-[#5f5f5f]">I am a...</span>
                <div className="grid gap-4 lg:grid-cols-3">
                  {roleOptions.map((role) => (
                    <SelectionCard
                      key={role.id}
                      id={`signup-role-${role.id}`}
                      label={role.title}
                      description={role.subtitle}
                      selected={formData.customerType === role.id}
                      onSelect={() => setFormData((prev) => ({ ...prev, customerType: role.id }))}
                    />
                  ))}
                </div>
              </div>

              <PremiumInput
                id="signup-full-name"
                label="Full name"
                value={formData.fullName}
                onChange={(value) => setFormData((prev) => ({ ...prev, fullName: normalizeFieldValue('fullName', value) }))}
                autoComplete="name"
                placeholder="Your full name"
                required
              />

              <PremiumInput
                id="signup-email"
                label="Email address"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData((prev) => ({ ...prev, email: normalizeFieldValue('email', value) }))}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />

              <PremiumInput
                id="signup-password"
                label="Create a password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
                autoComplete="new-password"
                placeholder="Create a strong password"
                hint="Minimum 12 characters with uppercase, lowercase, number, and symbol."
                required
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#5f5f5f] transition-colors hover:text-[#8B1538]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
              />

              <PremiumInput
                id="signup-confirm-password"
                label="Confirm password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(value) => setFormData((prev) => ({ ...prev, confirmPassword: value }))}
                autoComplete="new-password"
                placeholder="Repeat password"
                required
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[#5f5f5f] transition-colors hover:text-[#8B1538]"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
              />

              <div className="rounded-2xl border border-[#1a1a1a]/10 bg-white p-4">
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]/10">
                  <div
                    className="h-full rounded-full bg-[#8B1538] transition-all"
                    style={{ width: `${(strength / checks.length) * 100}%` }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {checks.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 text-xs ${
                        item.valid ? 'text-emerald-300' : 'text-[#6B7280]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <PremiumButton type="submit" loading={submitting} disabled={submitting} fullWidth>
                Create account
              </PremiumButton>

              <PremiumButton
                type="button"
                variant="secondary"
                onClick={handleOAuth}
                loading={submitting && googleEnabled === true}
                disabled={submitting || googleEnabled !== true}
                fullWidth
                icon={<span className="font-bold text-[#8B1538]">G</span>}
                aria-describedby={googleEnabled === false ? 'google-signup-status' : undefined}
              >
                {googleEnabled === null
                  ? 'Checking Google sign-up...'
                  : googleEnabled
                    ? 'Continue with Google'
                    : 'Google sign-up unavailable'}
              </PremiumButton>
              {googleEnabled === false ? (
                <p id="google-signup-status" role="status" aria-live="polite" className="text-center text-xs text-[#6B7280]">
                  Google sign-up is not enabled for this environment. Email signup remains available.
                </p>
              ) : null}

              <p className="text-center text-xs leading-5 text-[#6B7280]">
                By creating an account you agree to PlotKare service terms and privacy practices.
              </p>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-[#5f5f5f]">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#8B1538] underline-offset-4 hover:text-[#75112f] hover:underline">
              Sign in →
            </Link>
          </p>
      </div>
    </AuthLayout>
  )
}
