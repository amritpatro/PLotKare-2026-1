'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type LogoutRouter = {
  replace: (href: string) => void
  refresh: () => void
}

export async function signOutToLanding(router: LogoutRouter) {
  const supabase = createSupabaseBrowserClient()
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    cache: 'no-store',
  })
  const { error } = await supabase.auth.signOut()
  if (!response.ok) throw new Error('Server logout failed.')
  if (error) throw error
  router.replace('/')
  router.refresh()
}
