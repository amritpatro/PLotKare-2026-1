'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Eye, EyeOff, Sparkles } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  buildAuthCallbackUrl,
  formatAuthError,
  isAuthEmailDeliveryError,
  signupAwaitingEmailConfirmation,
} from '@/lib/supabase/auth-redirect'
import {
  rememberPendingOnboardingPath,
  resolvePostLoginRedirect,
} from '@/lib/onboarding/redirect'
import { slugFromCustomerType, type CustomerType } from '@/lib/onboarding/types'
import { signupSchema } from '@/lib/validation/auth'

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
    subtitle: 'Register and manage your own land or property.',
  },
  {
    id: 'plot_seller',
    title: 'Plot Seller',
    subtitle: 'Manage plots, sales, customers, and documents.',
  },
  {
    id: 'plot_buyer',
    title: 'Customer',
    subtitle: 'Track purchased property, documents, services, and support.',
  },
]

function normalizeFieldValue(name: string, value: string) {
  if (name === 'postalCode') return value.replace(/\D/g, '').slice(0, 6)
  if (name === 'phone') return value.replace(/[^\d+\s-]/g, '').slice(0, 20)
  return value
}

function passwordChecks(password: string) {
  return [
    { label: '10 or more characters', valid: password.length >= 10 },
    { label: 'Uppercase and lowercase letters', valid: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'At least one number', valid: /[0-9]/.test(password) },
    { label: 'At least one special character', valid: /[^A-Za-z0-9]/.test(password) },
  ]
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
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false)

  const checks = useMemo(() => passwordChecks(formData.password), [formData.password])
  const strength = checks.filter((item) => item.valid).length

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    if (next?.startsWith('/')) setNextPath(next)
    setIntent(params.get('intent') ?? '')
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: normalizeFieldValue(name, value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setEmailDeliveryFailed(false)

    const parsed = signupSchema.safeParse(formData)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please complete all required details.')
      return
    }

    const onboardingPath = `/onboarding/${slugFromCustomerType(parsed.data.customerType)}`
    rememberPendingOnboardingPath(onboardingPath)

    setSubmitting(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      options: {
        emailRedirectTo: buildAuthCallbackUrl(onboardingPath),
        data: {
          full_name: parsed.data.fullName,
          customer_type: parsed.data.customerType,
          onboarding_status: 'in_progress',
        },
      },
    })
    setSubmitting(false)

    if (signUpError) {
      setEmailDeliveryFailed(isAuthEmailDeliveryError(signUpError))
      setError(formatAuthError(signUpError))
      return
    }

    if (data.session && data.user) {
      router.replace(onboardingPath)
      router.refresh()
      return
    }

    if (signupAwaitingEmailConfirmation(data)) {
      setAwaitingEmailConfirmation(true)
    }

    setSubmitted(true)
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0D1A0F] lg:grid-cols-[0.85fr_1.15fr]">
      <div className="hidden flex-col justify-between bg-[#0A1F12] p-10 lg:flex">
        <Link href="/" aria-label="PlotKare home">
          <LogoMark variant="light" />
        </Link>
        <div className="max-w-md space-y-7">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">
            Role-based onboarding
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-tight text-white">
            Build your property command room.
          </h1>
          <p className="font-sans text-base leading-8 text-white/65">
            Choose the right workspace first. PlotKare then opens the exact setup flow for sellers, land owners, or
            customers.
          </p>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8 lg:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">PlotKare access</p>
              <h1 className="mt-3 font-serif text-4xl font-semibold italic text-[#D4AF94] sm:text-5xl">
                Create Account.
              </h1>
              <p className="mt-3 max-w-xl font-sans text-sm leading-6 text-white/60">
                A few details help us personalize your dashboard, verify service coverage, and guide the right property
                workflow from day one.
              </p>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 p-3 text-[#D4AF94] sm:block">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>

          {intent === 'add-property' ? (
            <p className="mb-6 rounded-xl border border-[#D4AF94]/20 bg-[#D4AF94]/10 px-4 py-3 font-sans text-sm leading-relaxed text-white/70">
              Create your owner account first. After signup, your dashboard will guide plot details, documents, and
              inspection setup.
            </p>
          ) : null}

          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C0392B]">
                  <Check size={32} className="text-white" />
                </div>
              </div>
              <div>
                <p className="font-sans text-lg font-medium text-white">
                  {awaitingEmailConfirmation ? 'Confirm your email' : 'Account created'}
                </p>
                <p className="mt-2 font-sans text-sm text-white/60">
                  {awaitingEmailConfirmation
                    ? `We sent a confirmation link to ${formData.email}. Open it on this device, then sign in to continue.`
                    : 'Your access has been created. Sign in to continue to the PlotKare dashboard.'}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="mt-6 w-full rounded-md bg-[#C0392B] py-3 font-sans text-base font-medium text-white transition-colors hover:bg-[#A93225]"
                >
                  Go to Sign In
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">I am joining as</span>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {roleOptions.map((role) => {
                    const selected = formData.customerType === role.id

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, customerType: role.id }))}
                        className={`rounded-xl border p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF94] ${
                          selected
                            ? 'border-[#C0392B] bg-[#C0392B]/20 shadow-lg shadow-black/20'
                            : 'border-white/10 bg-white/[0.025] hover:border-[#D4AF94]/40 hover:bg-white/[0.045]'
                        }`}
                        aria-pressed={selected}
                      >
                        <span className="font-sans text-sm font-semibold text-white">{role.title}</span>
                        <span className="mt-2 block font-sans text-xs leading-5 text-white/55">{role.subtitle}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">Full name</span>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    autoComplete="name"
                    placeholder="Aaditya Rao"
                    className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 font-sans text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF94] focus:bg-white/[0.06]"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 font-sans text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF94] focus:bg-white/[0.06]"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">Password</span>
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      className="w-full rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 pr-12 font-sans text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF94] focus:bg-white/[0.06]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-white/60 transition-colors hover:text-white"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">Confirm password</span>
                  <div className="relative mt-2">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      className="w-full rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 pr-12 font-sans text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF94] focus:bg-white/[0.06]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-white/60 transition-colors hover:text-white"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#C0392B] transition-all"
                    style={{ width: `${(strength / checks.length) * 100}%` }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {checks.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 font-sans text-xs ${
                        item.valid ? 'text-emerald-200' : 'text-white/45'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="space-y-2">
                  <p className="rounded-md border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm leading-relaxed text-red-200">
                    {error}
                  </p>
                  {emailDeliveryFailed ? (
                    <p className="font-sans text-xs leading-relaxed text-white/50">
                      Dev workaround: Supabase → Authentication → Providers → Email → turn off{' '}
                      <span className="text-white/70">Confirm email</span> locally, or switch to the built-in email
                      sender under Authentication → Email until custom SMTP is configured.
                    </p>
                  ) : null}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-[#C0392B] py-4 font-sans text-base font-semibold text-white transition-colors hover:bg-[#A93225] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Creating secure account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="mt-7 font-sans text-sm text-white/70">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-white transition-colors hover:text-[#D4AF94]">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
