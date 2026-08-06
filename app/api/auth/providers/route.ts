import { NextResponse } from 'next/server'
import {
  authServiceUnavailablePayload,
  isAuthServiceUnavailableStatus,
  type AuthServiceStatusPayload,
} from '@/lib/auth/auth-service-status'
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

    if (!response.ok) {
      const payload = authServiceUnavailablePayload(response.status)
      return NextResponse.json(payload, {
        status: isAuthServiceUnavailableStatus(response.status) ? 503 : response.status,
      })
    }

    const settings = (await response.json()) as AuthSettings
    const payload: AuthServiceStatusPayload = {
      available: true,
      email: settings.external?.email === true,
      google: settings.external?.google === true,
      status: response.status,
      message: null,
      checkedAt: new Date().toISOString(),
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(authServiceUnavailablePayload(null), { status: 503 })
  }
}
