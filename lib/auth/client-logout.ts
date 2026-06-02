'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type LogoutRouter = {
  replace: (href: string) => void
  refresh: () => void
}

export async function signOutToLanding(router: LogoutRouter) {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  router.replace('/')
  router.refresh()
}
