'use client'

const DATABASE_NAME = 'plotkare-agent-offline'
const STORE_NAME = 'inspection-drafts'
const DATABASE_VERSION = 1

export type QueuedEvidence = {
  key: string
  inspectionId: string
  direction: string
  subject: 'boundary' | 'issue' | 'amenity'
  blob: Blob
  latitude: number
  longitude: number
  accuracyMeters: number
  capturedAt: string
  note?: string
  amenityId?: string
}

export function validateEvidenceFile(file: File) {
  if (!file.type.startsWith('image/')) return 'Use the phone camera or choose an image file.'
  if (file.size <= 0) return 'The selected photo is empty. Capture it again.'
  return null
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function storeEvidence(item: QueuedEvidence) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(item)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function readQueuedEvidence(inspectionId: string) {
  const db = await openDatabase()
  const rows = await new Promise<QueuedEvidence[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve((request.result as QueuedEvidence[]).filter((row) => row.inspectionId === inspectionId))
    request.onerror = () => reject(request.error)
  })
  db.close()
  return rows
}

export async function removeEvidence(key: string) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function compressInspectionPhoto(file: File) {
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const value = new Image()
      value.onload = () => resolve(value)
      value.onerror = () => reject(new Error('Could not read the captured photo.'))
      value.src = sourceUrl
    })
    const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo processing is unavailable on this device.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    let quality = 0.84
    let blob: Blob | null = null
    while (quality >= 0.34) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= 800 * 1024) break
      quality -= 0.08
    }
    if (!blob || blob.size > 800 * 1024) {
      throw new Error('The photo could not be compressed below 800 KB. Retake with less detail or better light.')
    }
    return {
      blob,
      mimeType: 'image/jpeg',
      width: canvas.width,
      height: canvas.height,
      sizeBytes: blob.size,
    }
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
