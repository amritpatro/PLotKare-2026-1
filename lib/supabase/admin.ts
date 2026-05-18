import { createClient } from '@supabase/supabase-js'
import { requireSupabaseServiceEnv } from './env'

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = requireSupabaseServiceEnv()

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
