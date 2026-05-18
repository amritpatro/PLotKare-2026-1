'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoMark } from '@/components/logo'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { updatePasswordSchema } from '@/lib/validation/auth'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      setError(updateError.message)
      return
    }

    router.replace('/dashboard/settings')
    router.refresh()
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#0A1F12] p-8">
        <LogoMark />
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1A0F] px-6 py-12">
        <div className="w-full max-w-[400px] space-y-8">
          <h1 className="font-serif text-4xl italic text-[#D4AF94]">New Password.</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full border-b border-white/20 bg-transparent px-0 py-3 font-sans text-white placeholder-white/40 focus:border-b-2 focus:border-[#C0392B] focus:outline-none"
            />
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
          </form>
        </div>
      </div>
    </div>
  )
}
