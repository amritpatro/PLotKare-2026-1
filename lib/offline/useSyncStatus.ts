'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getPendingUploads } from './inspectionStore'
import { SyncManager, type SyncProgress } from './syncManager'

export function useSyncStatus(agentUserId: string) {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete' | 'error'>('idle')
  const [progress, setProgress] = useState<SyncProgress>({ total: 0, synced: 0, failed: 0, inProgress: 0 })
  const manager = useMemo(() => (typeof window === 'undefined' ? null : new SyncManager(agentUserId)), [agentUserId])

  const refreshPending = useCallback(async () => {
    const pending = await getPendingUploads().catch(() => [])
    setProgress((current) => ({ ...current, total: pending.length }))
  }, [])

  const startSync = useCallback(() => {
    if (!manager) return
    setSyncStatus('syncing')
    manager.startSync().catch(() => setSyncStatus('error'))
  }, [manager])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    refreshPending()
    const online = () => {
      setIsOnline(true)
      startSync()
    }
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [refreshPending, startSync])

  useEffect(() => {
    if (!manager) return
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<SyncProgress>).detail
      setProgress(detail)
      if (detail.total === 0) setSyncStatus('idle')
      else if (detail.inProgress > 0) setSyncStatus('syncing')
      else if (detail.failed > 0) setSyncStatus('error')
      else if (detail.synced > 0) setSyncStatus('complete')
    }
    manager.addEventListener('progress', onProgress)
    manager.setupNetworkListeners()
    return () => manager.removeEventListener('progress', onProgress)
  }, [manager])

  return {
    isOnline,
    syncStatus,
    pendingCount: Math.max(0, progress.total - progress.synced),
    syncedCount: progress.synced,
    failedCount: progress.failed,
    startSync,
  }
}
