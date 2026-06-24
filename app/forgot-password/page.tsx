'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { PremiumButton } from '@/components/auth/PremiumButton'
import { PremiumInput } from '@/components/auth/PremiumInput'
import { resetPasswordSchema } from '@/lib/validation/auth'

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const linkError = searchParams.get('error')
  const linkErrorMessage =
    linkError === 'expired_link'
      ? 'That reset link has expired. Enter your email to request a new one.'
      : linkError === 'invalid_link'
        ? 'That reset link is invalid. Enter your email to request a new one.'
        : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const parsed = resetPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter your email.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.data.email }),
      })
      const result = (await response.json().catch(() => null)) as { error?: string; message?: string } | null

      if (!response.ok) {
        setError(result?.error || 'We could not send the reset email right now. Please try again later.')
        return
      }

      setMessage(result?.message || 'If an account exists for that email, a reset link has been sent.')
      setCooldown(60)
      const timer = window.setInterval(() => {
        setCooldown((current) => {
          if (current <= 1) {
            window.clearInterval(timer)
            return 0
          }
          return current - 1
        })
      }, 1000)
    } catch {
      setError('We could not send the reset email right now. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F6F3] px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" aria-label="PlotKare home" className="inline-flex">
          <LogoMark />
        </Link>
        <Link href="/login" className="mt-10 inline-flex items-center gap-2 text-sm text-[#5f5f5f] underline-offset-4 hover:text-[#8B1538] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <section className="mt-8 rounded-2xl border border-[#1a1a1a]/10 bg-white p-8 shadow-2xl shadow-black/10">
          {message ? (
            <div className="space-y-6 text-center" role="status" aria-live="polite">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-[#1a1a1a]">Check your inbox.</h1>
                <p className="mt-4 text-lg leading-relaxed text-[#5f5f5f]">
                  We sent a reset link to {email}. Check your spam folder if you do not see it.
                </p>
              </div>
              <PremiumButton type="button" fullWidth disabled={cooldown > 0 || loading} loading={loading} onClick={() => void handleSubmit({ preventDefault: () => undefined } as React.FormEvent)}>
                {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
              </PremiumButton>
              <Link href="/login" className="block text-sm font-medium text-[#8B1538] underline-offset-4 hover:text-[#75112f] hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-bold tracking-tight text-[#1a1a1a]">Reset your password.</h1>
              <p className="mt-4 text-lg leading-relaxed text-[#5f5f5f]">
                Enter your email and we will send a reset link. The link works for 1 hour.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <PremiumInput
              id="forgot-password-email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                  error={error}
                />
                {linkErrorMessage ? <p className="text-sm text-[#8B1538]" role="status">{linkErrorMessage}</p> : null}
                <PremiumButton type="submit" disabled={loading} loading={loading} fullWidth>
                  Send reset link
                </PremiumButton>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
