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
const FALLBACK_PREFIX = 'plotkare-field:fallback'

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function emitPrivateModeWarning() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('plotkare-private-mode-storage'))
  }
}

function fallbackKey(store: string, key: string) {
  return `${FALLBACK_PREFIX}:${store}:${key}`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string) {
  const [header, value] = dataUrl.split(',')
  const mimeType = /data:(.*?);base64/.exec(header)?.[1] || 'image/jpeg'
  const binary = atob(value || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mimeType })
}

async function saveFallbackPhoto(record: OfflinePhotoRecord) {
  emitPrivateModeWarning()
  const { blob, ...rest } = record
  sessionStorage.setItem(fallbackKey('photos', `${record.inspectionId}:${record.direction}`), JSON.stringify({ ...rest, dataUrl: await blobToDataUrl(blob) }))
}

function readFallbackPhoto(value: string | null): OfflinePhotoRecord | null {
  if (!value) return null
  const parsed = JSON.parse(value) as Omit<OfflinePhotoRecord, 'blob'> & { dataUrl: string }
  return { ...parsed, blob: dataUrlToBlob(parsed.dataUrl) }
}

function getFallbackPhotos() {
  emitPrivateModeWarning()
  const records: OfflinePhotoRecord[] = []
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index)
    if (!key?.startsWith(`${FALLBACK_PREFIX}:photos:`)) continue
    const record = readFallbackPhoto(sessionStorage.getItem(key))
    if (record) records.push(record)
  }
  return records
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
  try {
    await withStore('photos', 'readwrite', (store) => store.put(record))
  } catch {
    await saveFallbackPhoto(record)
  }
}

export async function getPhotoDraft(inspectionId: string, direction: string) {
  try {
    return (await withStore<OfflinePhotoRecord>('photos', 'readonly', (store) => store.get([inspectionId, direction]))) ?? null
  } catch {
    return readFallbackPhoto(sessionStorage.getItem(fallbackKey('photos', `${inspectionId}:${direction}`)))
  }
}

export async function getAllPhotoDrafts(inspectionId: string) {
  let all: OfflinePhotoRecord[]
  try {
    all = (await withStore<OfflinePhotoRecord[]>('photos', 'readonly', (store) => store.getAll())) ?? []
  } catch {
    all = getFallbackPhotos()
  }
  return all.filter((record) => record.inspectionId === inspectionId)
}

export async function saveDraft(inspectionId: string, step: string, data: unknown) {
  const record = { inspectionId, step, data, savedAt: new Date().toISOString() }
  try {
    await withStore('drafts', 'readwrite', (store) => store.put(record))
  } catch {
    emitPrivateModeWarning()
    sessionStorage.setItem(fallbackKey('drafts', `${inspectionId}:${step}`), JSON.stringify(record))
  }
}

export async function getDraft<T>(inspectionId: string, step: string) {
  try {
    const record = await withStore<{ data: T }>('drafts', 'readonly', (store) => store.get([inspectionId, step]))
    return record?.data ?? null
  } catch {
    emitPrivateModeWarning()
    const record = JSON.parse(sessionStorage.getItem(fallbackKey('drafts', `${inspectionId}:${step}`)) || 'null') as { data: T } | null
    return record?.data ?? null
  }
}

export async function cacheAssignment(inspection: { id?: string; inspectionId?: string; [key: string]: unknown }) {
  const inspectionId = String(inspection.inspectionId || inspection.id || '')
  if (!inspectionId) throw new Error('Inspection id is required.')
  const record = { ...inspection, inspectionId, cachedAt: new Date().toISOString() }
  try {
    await withStore('assignments', 'readwrite', (store) => store.put(record))
  } catch {
    emitPrivateModeWarning()
    sessionStorage.setItem(fallbackKey('assignments', inspectionId), JSON.stringify(record))
  }
}

export async function getCachedAssignment<T = unknown>(inspectionId: string) {
  try {
    return (await withStore<T>('assignments', 'readonly', (store) => store.get(inspectionId))) ?? null
  } catch {
    emitPrivateModeWarning()
    return JSON.parse(sessionStorage.getItem(fallbackKey('assignments', inspectionId)) || 'null') as T | null
  }
}

export async function getPendingUploads() {
  let all: OfflinePhotoRecord[]
  try {
    all = (await withStore<OfflinePhotoRecord[]>('photos', 'readonly', (store) => store.getAll())) ?? []
  } catch {
    all = getFallbackPhotos()
  }
  return all.filter((record) => record.syncStatus === 'pending' || record.syncStatus === 'failed')
}

export async function markPhotoSynced(inspectionId: string, direction: string, storagePath?: string) {
  const record = await getPhotoDraft(inspectionId, direction)
  if (!record) return
  const updated = { ...record, storagePath, syncStatus: 'uploaded' as const }
  try {
    await withStore('photos', 'readwrite', (store) => store.put(updated))
  } catch {
    await saveFallbackPhoto(updated)
  }
}

export async function markPhotoFailed(inspectionId: string, direction: string) {
  const record = await getPhotoDraft(inspectionId, direction)
  if (!record) return
  const updated = { ...record, syncStatus: 'failed' as const, retryCount: record.retryCount + 1 }
  try {
    await withStore('photos', 'readwrite', (store) => store.put(updated))
  } catch {
    await saveFallbackPhoto(updated)
  }
}

export async function clearInspectionDrafts(inspectionId: string) {
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    emitPrivateModeWarning()
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (key?.includes(`:${inspectionId}:`) || key?.endsWith(`:${inspectionId}`)) sessionStorage.removeItem(key)
    }
    return
  }
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
