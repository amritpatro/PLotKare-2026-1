'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogoMark } from '@/components/logo'
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#0A1F12] p-8">
        <LogoMark variant="light" />
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1A0F] px-6 py-12">
        <div className="w-full max-w-[400px] space-y-8">
          <h1 className="font-serif text-4xl italic text-[#D4AF94]">New Password.</h1>
          {!sessionReady ? <p className="font-sans text-sm text-white/70">Checking your reset link...</p> : null}
          {sessionReady && linkExpired ? (
            <div className="space-y-4">
              <p className="font-sans text-sm leading-6 text-red-500">
                This reset link has expired. Request a new password reset email and try again.
              </p>
              <Link
                href="/forgot-password"
                className="block w-full rounded-sm bg-[#C0392B] py-3 text-center font-sans text-base font-medium text-white transition-colors hover:bg-[#A93225]"
              >
                Request a new reset link
              </Link>
            </div>
          ) : null}
          {sessionReady && !linkExpired ? <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full border-b border-white/20 bg-transparent px-0 py-3 font-sans text-white placeholder-white/40 focus:border-b-2 focus:border-[#C0392B] focus:outline-none"
            />
            <div className="space-y-1.5">
              {passwordChecks.map((item) => (
                <p key={item.label} className={`font-sans text-xs ${item.valid ? 'text-emerald-400' : 'text-white/50'}`}>
                  {item.valid ? '✓' : '○'} {item.label}
                </p>
              ))}
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full border-b border-white/20 bg-transparent px-0 py-3 font-sans text-white placeholder-white/40 focus:border-b-2 focus:border-[#C0392B] focus:outline-none"
            />
            {error && <p className="font-sans text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-[#C0392B] py-3 font-sans text-base font-medium text-white transition-colors hover:bg-[#A93225] disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form> : null}
        </div>
      </div>
    </div>
  )
}
