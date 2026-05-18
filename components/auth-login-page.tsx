'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogoMark } from '@/components/logo'
import { Eye, EyeOff } from 'lucide-react'
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
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [returningLine, setReturningLine] = useState(returningUserLines[0])

  useEffect(() => {
    const callbackError = searchParams.get('error')
    if (callbackError) setError(callbackError)
  }, [searchParams])

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
      const next = searchParams.get('next') || '/dashboard'
      const destination = await resolvePostLoginRedirect(supabase, data.user.id, next)
      router.replace(destination)
    })
    return () => {
      mounted = false
    }
  }, [router, mode, searchParams, supabase])

  const redirectAfterLogin = async (userId: string, userMetadata?: Record<string, unknown>) => {
    const next = searchParams.get('next')
    const fallback = next || (mode === 'admin' ? '/admin/dashboard' : '/dashboard')
    const destination =
      mode === 'admin'
        ? fallback
        : await resolvePostLoginRedirect(supabase, userId, fallback, userMetadata)
    router.replace(destination)
    router.refresh()
  }

  const handleSignIn = async () => {
    setError('')
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please fill in all fields')
      return
    }

    setIsSigningIn(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword(parsed.data)

    if (signInError) {
      setError(formatAuthError(signInError))
      setIsSigningIn(false)
      return
    }

    if (mode === 'admin') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut()
        setError('This account does not have admin access.')
        setIsSigningIn(false)
        return
      }
    }

    await redirectAfterLogin(data.user.id, data.user.user_metadata)
  }

  const handleOAuth = async () => {
    setError('')
    setIsSigningIn(true)
    const next = searchParams.get('next') || (mode === 'admin' ? '/admin/dashboard' : '/dashboard')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildAuthCallbackUrl(next),
      },
    })
    if (oauthError) {
      setError(formatAuthError(oauthError))
      setIsSigningIn(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSigningIn) {
      void handleSignIn()
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#0A1F12] p-8">
        <div className="text-center space-y-8">
          <LogoMark variant="light" />
          <p className="font-serif text-xl italic text-white/80 max-w-xs">
            {returningLine}
          </p>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-[#0D1A0F] px-5 py-10 sm:px-8">
        <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8 lg:p-10">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#D4AF94]/80">PlotKare access</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold italic text-[#D4AF94] sm:text-5xl">
              Welcome Back.
            </h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSignIn()
            }}
            className="space-y-5"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="your@email.com"
              disabled={isSigningIn}
              autoComplete="username"
              className="w-full rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 font-sans text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF94] focus:bg-white/[0.06] disabled:opacity-50"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Password"
                disabled={isSigningIn}
                autoComplete="current-password"
                className="w-full rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 pr-12 font-sans text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF94] focus:bg-white/[0.06] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-white/60 transition-colors hover:text-white disabled:opacity-50"
                disabled={isSigningIn}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && <p className="text-red-500 font-sans text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isSigningIn}
              className="mt-7 w-full rounded-md bg-[#C0392B] py-4 font-sans text-base font-semibold text-white shadow-lg shadow-black/20 transition-colors hover:bg-[#A93225] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSigningIn ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleOAuth}
            disabled={isSigningIn}
            className="mt-5 w-full rounded-md border border-white/10 bg-white/[0.035] py-4 font-sans text-base font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:border-[#D4AF94]/30 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Continue with Google
          </button>

          <p className="mt-8 font-sans text-sm text-white/70 text-center">
            <Link href="/forgot-password" className="text-white hover:text-[#D4AF94] font-medium transition-colors">
              Forgot password?
            </Link>
          </p>
          <p className="mt-7 font-sans text-sm text-white/70 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-white hover:text-[#D4AF94] font-medium transition-colors">
              Sign up →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
