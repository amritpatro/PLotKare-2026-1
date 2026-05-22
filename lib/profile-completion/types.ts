import type { UserRole } from '@/lib/supabase/types'

export type ProfileCompletionInput = {
  role: UserRole
  profile: Record<string, unknown>
  roleDetails?: Record<string, unknown> | null
  operationalRecord?: Record<string, unknown> | null
}

export type ProfileCompletionItem = {
  key: string
  label: string
  section: 'profile' | 'identity' | 'business' | 'property' | 'preferences' | 'operations'
  complete: boolean
}

export type ProfileCompletionResult = {
  score: number
  completed: number
  total: number
  items: ProfileCompletionItem[]
  missing: ProfileCompletionItem[]
}
