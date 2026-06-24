import { NextResponse } from 'next/server'
import { requireSupabaseBrowserEnv } from '@/lib/supabase/env'

type AuthSettings = {
  external?: {
    email?: boolean
    google?: boolean
  }
}

export async function GET() {
  const { url, anonKey } = requireSupabaseBrowserEnv()

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('Auth settings request failed')

    const settings = (await response.json()) as AuthSettings
    return NextResponse.json({
      email: settings.external?.email === true,
      google: settings.external?.google === true,
    })
  } catch {
    return NextResponse.json({ email: true, google: false }, { status: 503 })
  }
}
