'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOutToLanding } from '@/lib/auth/client-logout'

type LogoutButtonProps = {
  className?: string
  iconOnly?: boolean
  label?: string
}

export function LogoutButton({ className, iconOnly = false, label = 'Logout' }: LogoutButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    if (busy) return
    setBusy(true)
    try {
      await signOutToLanding(router)
    } catch {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={busy}
      className={className}
      aria-label={busy ? 'Signing out' : label}
      title={busy ? 'Signing out' : label}
    >
      <LogOut className="h-4 w-4" />
      {iconOnly ? null : <span>{busy ? 'Signing out...' : label}</span>}
    </button>
  )
}
