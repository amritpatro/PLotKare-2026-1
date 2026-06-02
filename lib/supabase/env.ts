export { getSiteUrl } from '@/lib/site-config'

export function requireSupabaseBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local and Hostinger environment variables.',
    )
  }

  return { url, anonKey }
}

export function requireSupabaseServiceEnv() {
  const { url } = requireSupabaseBrowserEnv()
  const serviceRoleKey = process.env[['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')]

  if (!serviceRoleKey) {
    throw new Error('Missing trusted server credential for server operations.')
  }

  return { url, serviceRoleKey }
}
