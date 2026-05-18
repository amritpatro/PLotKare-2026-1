'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolvePostLoginRedirect } from '@/lib/onboarding/redirect'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

/** Redirects to onboarding when profile is not completed (client-side guard for /dashboard). */
export function useRequireOnboarding() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true
    const supabase = createSupabaseBrowserClient()

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return

      if (!user) {
        router.replace('/login?next=/dashboard')
        return
      }

      const destination = await resolvePostLoginRedirect(supabase, user.id, '/dashboard')
      if (!mounted) return

      if (destination.startsWith('/onboarding')) {
        router.replace(destination)
        return
      }

      setChecking(false)
    }

    void check()
    return () => {
      mounted = false
    }
  }, [router])

  return { checking }
}
