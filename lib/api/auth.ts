import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError } from './response'

type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type ApiProfile = {
  id: string
  email: string
  full_name: string
  role: 'user' | 'admin'
  [key: string]: unknown
}

export type ApiUserContext = {
  supabase: ServerSupabaseClient
  user: User
  profile: ApiProfile
  isAdmin: boolean
}

export async function requireUserContext(): Promise<ApiUserContext | { response: Response }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { response: apiError('Please log in to continue.', 401, 'UNAUTHORIZED') }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      response: apiError('Your profile is not ready yet. Please log out and sign in again.', 409, 'PROFILE_MISSING'),
    }
  }

  const typedProfile = profile as ApiProfile
  const appRole = user.app_metadata?.role

  return {
    supabase,
    user,
    profile: typedProfile,
    isAdmin: typedProfile.role === 'admin' || appRole === 'admin',
  }
}

export async function requireAdminContext(): Promise<ApiUserContext | { response: Response }> {
  const context = await requireUserContext()
  if ('response' in context) return context
  if (!context.isAdmin) {
    return { response: apiError('Admin access is required for this action.', 403, 'FORBIDDEN') }
  }
  return context
}
