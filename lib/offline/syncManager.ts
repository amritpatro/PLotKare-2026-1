'use client'

import { getPendingUploads, markPhotoFailed, markPhotoSynced, type OfflinePhotoRecord } from './inspectionStore'

export type SyncProgress = {
  total: number
  synced: number
  failed: number
  inProgress: number
}

export class SyncManager extends EventTarget {
  private running = false
  private readonly agentUserId: string
  private readonly supabaseClient: unknown

  constructor(supabaseClientOrAgentUserId?: unknown, agentUserId?: string) {
    super()
    this.supabaseClient = typeof supabaseClientOrAgentUserId === 'string' ? null : supabaseClientOrAgentUserId ?? null
    this.agentUserId = typeof supabaseClientOrAgentUserId === 'string' ? supabaseClientOrAgentUserId : agentUserId || 'current'
  }

  async startSync() {
    if (this.running || typeof navigator !== 'undefined' && !navigator.onLine) return
    this.running = true
    const pending = await getPendingUploads()
    const progress: SyncProgress = { total: pending.length, synced: 0, failed: 0, inProgress: 0 }
    this.emitProgress(progress)
    for (const photo of pending) {
      progress.inProgress += 1
      this.emitProgress(progress)
      try {
        let lastError: unknown = null
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            await this.uploadSinglePhoto(photo)
            lastError = null
            break
          } catch (error) {
            lastError = error
            if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
        if (lastError) {
          await markPhotoFailed(photo.inspectionId, photo.direction)
          throw lastError
        }
        progress.synced += 1
      } catch {
        progress.failed += 1
      } finally {
        progress.inProgress -= 1
        this.emitProgress(progress)
      }
    }
    this.running = false
  }

  async uploadSinglePhoto(photo: OfflinePhotoRecord) {
    const uploadResponse = await fetch('/api/agent/get-upload-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        inspectionId: photo.inspectionId,
        direction: photo.direction,
        mimeType: photo.mimeType,
        agentUserId: this.agentUserId,
      }),
    })
    const upload = await uploadResponse.json()
    if (!uploadResponse.ok) {
      throw new Error(upload.error?.message || 'Could not prepare upload.')
    }

    const putResponse = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': photo.mimeType },
      body: photo.blob,
    })
    if (!putResponse.ok) {
      throw new Error('Photo upload failed.')
    }

    const confirmResponse = await fetch('/api/agent/confirm-photo-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        inspectionId: photo.inspectionId,
        direction: photo.direction,
        storagePath: upload.storagePath,
        sizeBytes: photo.blob.size,
        latitude: photo.metadata.gpsLat,
        longitude: photo.metadata.gpsLng,
        accuracy: photo.metadata.gpsAccuracy,
        capturedAt: photo.metadata.capturedAt,
      }),
    })
    const confirmed = await confirmResponse.json()
    if (!confirmResponse.ok) {
      throw new Error(confirmed.error?.message || 'Photo upload confirmation failed.')
    }

    await markPhotoSynced(photo.inspectionId, photo.direction, upload.storagePath)
    this.dispatchEvent(new CustomEvent('photo-synced', { detail: photo }))
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => this.startSync())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.startSync()
    })
  }

  private emitProgress(progress: SyncProgress) {
    this.dispatchEvent(new CustomEvent<SyncProgress>('progress', { detail: { ...progress } }))
  }
}
