'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PremiumButton } from '@/components/auth/PremiumButton'
import { PremiumInput } from '@/components/auth/PremiumInput'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { buildAuthCallbackUrl, formatAuthError } from '@/lib/supabase/auth-redirect'
import { loginSchema } from '@/lib/validation/auth'

type AuthLoginMode = 'user' | 'admin'

const returningUserLines = [
  'Pick up where your property story left off.',
  'Your land file is ready when you are.',
  'Back to the dashboard that keeps watch.',
  'Every plot deserves a current record.',
  'Sign in and see what changed on the ground.',
]

export function AuthLoginPage({ mode }: { mode: AuthLoginMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const callbackError = searchParams.get('error')
  const callbackMessage = searchParams.get('message')
  const initialError =
    callbackError === 'no_code'
      ? 'The sign-in response was incomplete. Please try again.'
      : callbackError === 'auth_failed'
        ? 'Google sign-in could not be completed. Please try again.'
        : callbackError || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(initialError)
  const [statusMessage] = useState(
    callbackMessage === 'password-updated' ? 'Your password has been updated. You can now log in.' : '',
  )
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isOpeningWorkspace, setIsOpeningWorkspace] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null)
  const [returningLine, setReturningLine] = useState(returningUserLines[0])

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
    try {
      const lastIndex = Number(window.localStorage.getItem('plotkare_login_line_index') ?? '-1')
      const nextIndex =
        returningUserLines.length > 1
          ? (lastIndex + 1 + Math.floor(Math.random() * (returningUserLines.length - 1))) % returningUserLines.length
          : 0

      window.localStorage.setItem('plotkare_login_line_index', String(nextIndex))
      setReturningLine(returningUserLines[nextIndex])
    } catch {
      setReturningLine(returningUserLines[Math.floor(Math.random() * returningUserLines.length)])
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return
      if (mode === 'admin') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profile?.role === 'admin') router.replace('/admin/dashboard')
        return
      }
      const next = searchParams.get('next') || '/auth/choose-role'
      const destination = await resolvePostLoginRedirect(supabase, data.user.id, next)
      router.replace(destination)
    })
    return () => {
      mounted = false
    }
  }, [router, mode, searchParams, supabase])

  const handleSignIn = async () => {
    setError('')
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please fill in all fields')
      return
    }

    setIsSigningIn(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          mode,
          next: searchParams.get('next'),
        }),
      })
      const result = (await response.json()) as { destination?: string; error?: string }

      if (!response.ok || !result.destination) {
        setError(result.error ?? 'Unable to sign in. Please try again.')
        setIsSigningIn(false)
        return
      }

      setIsOpeningWorkspace(true)
      router.replace(result.destination)
      router.refresh()
    } catch {
      setError('Network error. Check your connection and try again.')
      setIsSigningIn(false)
    }
  }

  const handleOAuth = async () => {
    setError('')
    if (googleEnabled !== true) {
      setError('Google sign-in is not enabled for this PlotKare environment yet.')
      return
    }

    setIsSigningIn(true)
    const next = searchParams.get('next') || (mode === 'admin' ? '/admin/dashboard' : '/auth/choose-role')
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildAuthCallbackUrl(next),
        skipBrowserRedirect: true,
      },
    })
    if (oauthError) {
      setError(formatAuthError(oauthError))
      setIsSigningIn(false)
      return
    }

    if (!data.url) {
      setError('Google sign-in could not be started. Please try again.')
      setIsSigningIn(false)
      return
    }

    window.location.assign(data.url)
  }

  return (
    <AuthLayout
      headline={mode === 'admin' ? 'Command access, guarded.' : 'Your property, protected.'}
      subtext={
        mode === 'admin'
          ? 'Secure operational access for the team that reviews documents, inspections, and customer support.'
          : 'GPS-verified inspections and real-time boundary monitoring for your land in Visakhapatnam.'
      }
    >
      <div className="rounded-2xl border border-[#1a1a1a]/10 bg-white p-8 shadow-2xl shadow-black/10 md:p-10 xl:p-12">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a] md:text-4xl">Welcome back</h1>
          <p className="text-base text-[#5f5f5f]">
            {mode === 'admin' ? 'Sign in to the PlotKare admin workspace.' : 'Sign in to your PlotKare account.'}
          </p>
          <p className="text-sm text-[#6B7280]" aria-live="polite">
            {returningLine}
          </p>
        </div>

        <div className="my-8 border-b border-[#8B1538]/20" />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSignIn()
            }}
            className="space-y-6"
          >
            {error && (
              <div id="login-error" role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {statusMessage && !error ? (
              <div role="status" aria-live="polite" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            ) : null}

            <PremiumInput
              id="login-email"
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              disabled={isSigningIn}
              autoComplete="email"
              required
            />

            <PremiumInput
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="Password"
              disabled={isSigningIn}
              autoComplete="current-password"
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#5f5f5f] transition-colors hover:text-[#8B1538] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1538]"
                  disabled={isSigningIn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
            />

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-[#8B1538] underline-offset-4 hover:text-[#75112f] hover:underline">
                Forgot password?
              </Link>
            </div>

            <PremiumButton
              type="submit"
              fullWidth
              loading={isSigningIn}
              disabled={isSigningIn}
            >
              {isOpeningWorkspace ? 'Opening workspace...' : isSigningIn ? 'Signing In...' : 'Sign In'}
            </PremiumButton>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-[#6B7280]">
            <span className="h-px flex-1 bg-[#1a1a1a]/10" />
            or
            <span className="h-px flex-1 bg-[#1a1a1a]/10" />
          </div>

          <PremiumButton
            variant="secondary"
            onClick={handleOAuth}
            fullWidth
            disabled={isSigningIn || googleEnabled !== true}
            aria-describedby={googleEnabled === false ? 'google-login-status' : undefined}
            icon={<span className="font-bold text-[#8B1538]">G</span>}
          >
            {googleEnabled === null
              ? 'Checking Google sign-in...'
              : googleEnabled
                ? 'Continue with Google'
                : 'Google sign-in unavailable'}
          </PremiumButton>
          {googleEnabled === false ? (
            <p id="google-login-status" role="status" aria-live="polite" className="mt-3 text-center text-xs text-[#6B7280]">
              Google sign-in is not enabled for this environment. Email and password sign-in remains available.
            </p>
          ) : null}

          <p className="mt-8 text-center text-sm text-[#5f5f5f]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-[#8B1538] underline-offset-4 hover:text-[#75112f] hover:underline">
              Sign up →
            </Link>
          </p>
      </div>
    </AuthLayout>
  )
}
