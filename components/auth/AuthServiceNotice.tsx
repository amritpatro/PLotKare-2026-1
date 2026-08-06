'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { AUTH_SERVICE_RETRY_MESSAGE } from '@/lib/auth/auth-service-status'

type AuthServiceNoticeProps = {
  available: boolean
  status: number | null
  message: string | null
  loading?: boolean
  onRetry: () => void
}

export function AuthServiceNotice({ available, status, message, loading, onRetry }: AuthServiceNoticeProps) {
  if (available) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-[#C9A962]/45 bg-[#C9A962]/12 px-4 py-4 text-sm leading-relaxed text-[#4b3824]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-[#8B1538]" aria-hidden="true" />
          <div>
            <p className="font-semibold text-[#1a1a1a]">Authentication service unavailable</p>
            <p className="mt-1">{message}</p>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              {status ? `Upstream status ${status}. ` : ''}
              {AUTH_SERVICE_RETRY_MESSAGE}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="inline-flex h-9 flex-none items-center justify-center gap-2 rounded-md border border-[#8B1538]/25 bg-white px-3 text-xs font-semibold text-[#8B1538] transition hover:border-[#8B1538] hover:bg-[#8B1538] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Retry
        </button>
      </div>
    </div>
  )
}
