'use client'

import { createBrowserClient } from '@supabase/ssr'
import { requireSupabaseBrowserEnv } from './env'

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseBrowserEnv()
  return createBrowserClient(url, anonKey)
}
