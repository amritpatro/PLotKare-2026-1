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

async function readAuthSettings(url: string, anonKey: string) {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: anonKey },
    cache: 'no-store',
  })

  if (!response.ok) return { response, settings: null }

  return {
    response,
    settings: (await response.json()) as AuthSettings,
  }
}

export async function GET() {
  const { url, anonKey } = requireSupabaseBrowserEnv()

  try {
    const health = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: 'no-store',
    })

    if (health.ok) {
      const { settings } = await readAuthSettings(url, anonKey)
      const payload: AuthServiceStatusPayload = {
        available: true,
        email: settings?.external?.email === true,
        google: settings?.external?.google === true,
        status: health.status,
        message: null,
        checkedAt: new Date().toISOString(),
      }
      return NextResponse.json(payload)
    }

    if (isAuthServiceUnavailableStatus(health.status)) {
      return NextResponse.json(authServiceUnavailablePayload(health.status), { status: 503 })
    }

    const { response: settingsResponse, settings } = await readAuthSettings(url, anonKey)

    if (!settingsResponse.ok) {
      const payload = authServiceUnavailablePayload(settingsResponse.status)
      return NextResponse.json(payload, {
        status: isAuthServiceUnavailableStatus(settingsResponse.status) ? 503 : settingsResponse.status,
      })
    }

    const payload: AuthServiceStatusPayload = {
      available: true,
      email: settings?.external?.email === true,
      google: settings?.external?.google === true,
      status: settingsResponse.status,
      message: null,
      checkedAt: new Date().toISOString(),
    }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(authServiceUnavailablePayload(null), { status: 503 })
  }
}
