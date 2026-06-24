'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { PremiumButton } from '@/components/auth/PremiumButton'
import { PremiumInput } from '@/components/auth/PremiumInput'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { getPasswordRequirementChecks, updatePasswordSchema } from '@/lib/validation/auth'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const passwordChecks = useMemo(() => getPasswordRequirementChecks(password), [password])

  useEffect(() => {
    let mounted = true

    async function establishRecoverySession() {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const search = new URLSearchParams(window.location.search)
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        const code = search.get('code')

        let recoveryError: Error | null = null
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          recoveryError = sessionError
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          recoveryError = exchangeError
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return
        setLinkExpired(Boolean(recoveryError) || !session)
        setSessionReady(true)

        if (session && (window.location.hash || window.location.search)) {
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch {
        if (!mounted) return
        setLinkExpired(true)
        setSessionReady(true)
      }
    }

    void establishRecoverySession()
    return () => {
      mounted = false
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsed = updatePasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid password.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password })
    setLoading(false)

    if (updateError) {
      const message = updateError.message.toLowerCase()
      setError(message.includes('session') || message.includes('expired') || message.includes('invalid')
        ? 'This reset link is no longer valid. Request a new password reset email and try again.'
        : 'We could not update your password right now. Please try again later.')
      return
    }

    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) {
      setError('Your password was updated, but we could not confirm your session. Please sign in again.')
      return
    }

    const destination = await resolvePostLoginRedirect(
      supabase,
      user.id,
      '/settings',
      user.user_metadata as Record<string, unknown> | undefined,
    )

    router.replace(destination)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#F8F6F3] px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" aria-label="PlotKare home" className="inline-flex">
          <LogoMark />
        </Link>

        <section className="mt-14 rounded-2xl border border-[#1a1a1a]/10 bg-white p-8 shadow-2xl shadow-black/10">
          <h1 className="text-4xl font-bold tracking-tight text-[#1a1a1a]">Create a new password.</h1>
          <p className="mt-4 text-lg leading-relaxed text-[#5f5f5f]">
            Use a strong password to keep your PlotKare workspace protected.
          </p>

          {!sessionReady ? <p role="status" aria-live="polite" className="mt-8 text-sm text-[#5f5f5f]">Checking your reset link...</p> : null}
          {sessionReady && linkExpired ? (
            <div className="mt-8 space-y-5">
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
                This reset link has expired. Request a new password reset email and try again.
              </p>
              <Link
                href="/forgot-password"
                className="flex h-14 w-full items-center justify-center rounded-xl bg-[#8B1538] px-5 text-base font-semibold text-white transition-all duration-200 hover:bg-[#75112f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1538] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F6F3]"
              >
                Request a new reset link
              </Link>
            </div>
          ) : null}
          {sessionReady && !linkExpired ? <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <PremiumInput
              id="new-password"
              label="New password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="New password"
              autoComplete="new-password"
              required
              error={error}
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
            <div id="password-requirements" className="space-y-1.5 rounded-2xl border border-[#1a1a1a]/10 bg-white p-4">
              {passwordChecks.map((item) => (
                <p key={item.label} className={`text-xs ${item.valid ? 'text-emerald-300' : 'text-[#6B7280]'}`}>
                  {item.valid ? 'Pass' : 'Needed'} - {item.label}
                </p>
              ))}
            </div>
            <PremiumInput
              id="confirm-new-password"
              label="Confirm new password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
              autoComplete="new-password"
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
            <PremiumButton type="submit" disabled={loading} loading={loading} fullWidth>
              Update password
            </PremiumButton>
          </form> : null}
        </section>
      </div>
    </main>
  )
}
