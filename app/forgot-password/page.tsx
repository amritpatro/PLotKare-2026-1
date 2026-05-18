'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/logo'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { buildAuthCallbackUrl, formatAuthError } from '@/lib/supabase/auth-redirect'
import { resetPasswordSchema } from '@/lib/validation/auth'

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: buildAuthCallbackUrl('/update-password'),
    })
    setLoading(false)

    if (resetError) {
      setError(formatAuthError(resetError))
      return
    }

    setMessage('Password reset email sent. Check your inbox.')
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#0A1F12] p-8">
        <LogoMark />
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1A0F] px-6 py-12">
        <div className="w-full max-w-[400px] space-y-8">
          <h1 className="font-serif text-4xl italic text-[#D4AF94]">Reset Password.</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border-b border-white/20 bg-transparent px-0 py-3 font-sans text-white placeholder-white/40 focus:border-b-2 focus:border-[#C0392B] focus:outline-none"
            />
            {error && <p className="font-sans text-sm text-red-500">{error}</p>}
            {message && <p className="font-sans text-sm text-emerald-400">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-[#C0392B] py-3 font-sans text-base font-medium text-white transition-colors hover:bg-[#A93225] disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <Link href="/login" className="block text-center font-sans text-sm text-white hover:text-[#D4AF94]">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
