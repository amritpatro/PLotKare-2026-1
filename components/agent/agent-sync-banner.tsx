'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useSyncStatus } from '@/lib/offline/useSyncStatus'

export function AgentSyncBanner() {
  const { isOnline, syncStatus, pendingCount, failedCount, startSync } = useSyncStatus('current')
  const [showComplete, setShowComplete] = useState(false)
  const [privateMode, setPrivateMode] = useState(false)

  useEffect(() => {
    const onPrivateMode = () => setPrivateMode(true)
    window.addEventListener('plotkare-private-mode-storage', onPrivateMode)
    return () => window.removeEventListener('plotkare-private-mode-storage', onPrivateMode)
  }, [])

  useEffect(() => {
    if (syncStatus !== 'complete') return
    setShowComplete(true)
    const timer = window.setTimeout(() => setShowComplete(false), 3000)
    return () => window.clearTimeout(timer)
  }, [syncStatus])

  if (privateMode) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">
        Private browsing detected. Your photos may not persist if the app closes.
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">
        Offline - work saved on device
      </div>
    )
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Uploading... {pendingCount} remaining
      </div>
    )
  }

  if (syncStatus === 'error') {
    return (
      <button type="button" onClick={startSync} className="w-full border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs font-semibold text-red-800">
        {failedCount || pendingCount} photos failed - tap to retry
      </button>
    )
  }

  if (showComplete) {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-xs font-semibold text-emerald-800">
        All uploaded
      </div>
    )
  }

  return null
}
