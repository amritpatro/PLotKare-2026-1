'use client'

export type OfflinePhotoMetadata = {
  gpsLat: number | null
  gpsLng: number | null
  gpsAccuracy: number | null
  capturedAt: string
  direction: string
  inspectionId: string
  mimeType: string
}

export type OfflinePhotoRecord = {
  inspectionId: string
  direction: string
  blob: Blob
  mimeType: string
  metadata: OfflinePhotoMetadata
  syncStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'
  retryCount: number
  storagePath?: string
  savedAt: string
}

const DB_NAME = 'plotkare-field'
const DB_VERSION = 1

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB is unavailable.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: ['inspectionId', 'direction'] })
      }
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: ['inspectionId', 'step'] })
      }
      if (!db.objectStoreNames.contains('assignments')) {
        db.createObjectStore('assignments', { keyPath: 'inspectionId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = run(tx.objectStore(storeName))
    tx.oncomplete = () => {
      db.close()
      resolve(request && 'result' in request ? request.result : undefined)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function savePhotoDraft(inspectionId: string, direction: string, blob: Blob, metadata: OfflinePhotoMetadata) {
  const record: OfflinePhotoRecord = {
    inspectionId,
    direction,
    blob,
    mimeType: metadata.mimeType || blob.type || 'image/jpeg',
    metadata,
    syncStatus: 'pending',
    retryCount: 0,
    savedAt: new Date().toISOString(),
  }
  await withStore('photos', 'readwrite', (store) => store.put(record))
}

export async function getPhotoDraft(inspectionId: string, direction: string) {
  return (await withStore<OfflinePhotoRecord>('photos', 'readonly', (store) => store.get([inspectionId, direction]))) ?? null
}

export async function getAllPhotoDrafts(inspectionId: string) {
  const all = (await withStore<OfflinePhotoRecord[]>('photos', 'readonly', (store) => store.getAll())) ?? []
  return all.filter((record) => record.inspectionId === inspectionId)
}

export async function saveDraft(inspectionId: string, step: string, data: unknown) {
  await withStore('drafts', 'readwrite', (store) => store.put({ inspectionId, step, data, savedAt: new Date().toISOString() }))
}

export async function getDraft<T>(inspectionId: string, step: string) {
  const record = await withStore<{ data: T }>('drafts', 'readonly', (store) => store.get([inspectionId, step]))
  return record?.data ?? null
}

export async function cacheAssignment(inspection: { id?: string; inspectionId?: string; [key: string]: unknown }) {
  const inspectionId = String(inspection.inspectionId || inspection.id || '')
  if (!inspectionId) throw new Error('Inspection id is required.')
  await withStore('assignments', 'readwrite', (store) => store.put({ ...inspection, inspectionId, cachedAt: new Date().toISOString() }))
}

export async function getPendingUploads() {
  const all = (await withStore<OfflinePhotoRecord[]>('photos', 'readonly', (store) => store.getAll())) ?? []
  return all.filter((record) => record.syncStatus === 'pending' || record.syncStatus === 'failed')
}

export async function markPhotoSynced(inspectionId: string, direction: string, storagePath?: string) {
  const record = await getPhotoDraft(inspectionId, direction)
  if (!record) return
  await withStore('photos', 'readwrite', (store) => store.put({ ...record, storagePath, syncStatus: 'uploaded' as const }))
}

export async function markPhotoFailed(inspectionId: string, direction: string) {
  const record = await getPhotoDraft(inspectionId, direction)
  if (!record) return
  await withStore('photos', 'readwrite', (store) => store.put({ ...record, syncStatus: 'failed' as const, retryCount: record.retryCount + 1 }))
}

export async function clearInspectionDrafts(inspectionId: string) {
  const db = await openDb()
  await Promise.all(['photos', 'drafts'].map((storeName) => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => {
      for (const record of request.result as Array<{ inspectionId: string; direction?: string; step?: string }>) {
        if (record.inspectionId === inspectionId) {
          const keyPart = storeName === 'photos' ? record.direction : record.step
          if (keyPart) store.delete([inspectionId, keyPart])
        }
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })))
  db.close()
}
