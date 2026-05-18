import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { requireSupabaseBrowserEnv } from './env'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = requireSupabaseBrowserEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot set cookies. Middleware refreshes sessions.
        }
      },
    },
  })
}
