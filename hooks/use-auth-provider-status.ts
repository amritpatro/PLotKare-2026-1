'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  type AuthServiceStatusPayload,
} from '@/lib/auth/auth-service-status'

type AuthProviderState = AuthServiceStatusPayload & {
  loading: boolean
}

const initialState: AuthProviderState = {
  available: true,
  email: true,
  google: false,
  status: null,
  message: null,
  checkedAt: '',
  loading: true,
}

async function fetchAuthProviderStatus(): Promise<AuthProviderState> {
  try {
    const response = await fetch('/api/auth/providers', { cache: 'no-store' })
    const payload = (await response.json().catch(() => null)) as Partial<AuthServiceStatusPayload> | null

    return {
      available: response.ok && payload?.available !== false,
      email: Boolean(payload?.email),
      google: response.ok && payload?.google === true,
      status: typeof payload?.status === 'number' ? payload.status : response.status,
      message: payload?.message ?? (response.ok ? null : AUTH_SERVICE_UNAVAILABLE_MESSAGE),
      checkedAt: payload?.checkedAt ?? new Date().toISOString(),
      loading: false,
    }
  } catch {
    return {
      available: false,
      email: false,
      google: false,
      status: null,
      message: AUTH_SERVICE_UNAVAILABLE_MESSAGE,
      checkedAt: new Date().toISOString(),
      loading: false,
    }
  }
}

export function useAuthProviderStatus() {
  const [status, setStatus] = useState<AuthProviderState>(initialState)

  const refresh = useCallback(() => {
    setStatus((current) => ({ ...current, loading: true }))
    void fetchAuthProviderStatus().then(setStatus)
  }, [])

  useEffect(() => {
    let mounted = true

    void fetchAuthProviderStatus().then((nextStatus) => {
      if (mounted) setStatus(nextStatus)
    })

    return () => {
      mounted = false
    }
  }, [])

  return { ...status, refresh }
}
