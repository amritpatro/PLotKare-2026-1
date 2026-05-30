'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Loader2, MapPin, Navigation, RefreshCcw, Save } from 'lucide-react'

type GpsPoint = {
  latitude: number
  longitude: number
  accuracy: number
  capturedAt: string
}

type EvidencePhoto = {
  localId: string
  direction: string
  subject: string
  blob: Blob
  previewUrl?: string
  uploadedPhotoId?: string
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'
  gps: GpsPoint | null
}

type ChecklistAnswer = {
  key: string
  label: string
  value: boolean | null
}

type AgentInspectionFlowProps = {
  inspectionId: string
  title: string
  location: string
  plotLabel: string
  target: {
    latitude: number | null
    longitude: number | null
  }
  documents: Array<{ id: string; label: string; status: string }>
  amenities: Array<{ id: string; name: string; status: string }>
}

const directions = [
  { key: 'north', label: 'North corner' },
  { key: 'south', label: 'South corner' },
  { key: 'east', label: 'East corner' },
  { key: 'west', label: 'West corner' },
]

const checklistDefaults: ChecklistAnswer[] = [
  { key: 'boundary_intact', label: 'Compound wall or boundary intact?', value: null },
  { key: 'gate_accessible', label: 'Gate or entrance accessible?', value: null },
  { key: 'encroachment', label: 'Encroachment observed?', value: null },
  { key: 'new_construction', label: 'New construction nearby?', value: null },
  { key: 'access_clear', label: 'Access path clear?', value: null },
  { key: 'vegetation', label: 'Vegetation or weeds covering boundary/access?', value: null },
  { key: 'waste_dumping', label: 'Waste dumped inside or against boundary?', value: null },
  { key: 'water_logging', label: 'Standing water or water logging visible?', value: null },
  { key: 'survey_markers', label: 'Survey stones or corner markers visible?', value: null },
]

function dbName(inspectionId: string) {
  return `plotkare-agent-${inspectionId}`
}

function openDraftDb(inspectionId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName(inspectionId), 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('draft')) db.createObjectStore('draft')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function saveDraft(inspectionId: string, value: unknown) {
  const db = await openDraftDb(inspectionId)
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('draft', 'readwrite')
    tx.objectStore('draft').put(value, 'state')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function loadDraft<T>(inspectionId: string): Promise<T | null> {
  if (!('indexedDB' in window)) return null
  const db = await openDraftDb(inspectionId)
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction('draft', 'readonly')
    const request = tx.objectStore('draft').get('state')
    request.onsuccess = () => resolve((request.result as T) ?? null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return value
}

function getGps(): Promise<GpsPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS not found on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        }),
      () => reject(new Error('GPS permission denied or unavailable. Move to an open area and try again.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

async function compressImage(file: File): Promise<Blob> {
  const image = await createImageBitmap(file)
  const scale = Math.min(1, 1920 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare image compression.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  let quality = 0.82
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  while (blob.size > 800_000 && quality > 0.45) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }
  return blob
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed.'))), type, quality)
  })
}

function boolLabel(value: boolean | null) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return 'Pending'
}

export function AgentInspectionFlow({ inspectionId, title, location, plotLabel, target, documents, amenities }: AgentInspectionFlowProps) {
  const [online, setOnline] = useState(true)
  const [arrival, setArrival] = useState<GpsPoint | null>(null)
  const [arrivalVerified, setArrivalVerified] = useState(false)
  const [photos, setPhotos] = useState<EvidencePhoto[]>([])
  const [checklist, setChecklist] = useState<ChecklistAnswer[]>(checklistDefaults)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const requiredCaptured = directions.every((direction) => photos.some((photo) => photo.direction === direction.key))
  const encroachment = checklist.find((answer) => answer.key === 'encroachment')?.value === true
  const issuePhotoCount = photos.filter((photo) => photo.direction.startsWith('issue')).length
  const checklistComplete = checklist.every((answer) => answer.value !== null)
  const canSubmit = arrivalVerified && requiredCaptured && checklistComplete && (!encroachment || issuePhotoCount >= 2)

  const statusText = useMemo(() => {
    if (!arrivalVerified) return 'Step 1 of 6 - verify arrival'
    if (!requiredCaptured) return 'Step 2 of 6 - capture four corners'
    if (!checklistComplete) return 'Step 3 of 6 - complete checklist'
    if (encroachment && issuePhotoCount < 2) return 'Step 4 of 6 - add issue evidence'
    return 'Step 6 of 6 - review and submit'
  }, [arrivalVerified, requiredCaptured, checklistComplete, encroachment, issuePhotoCount])

  useEffect(() => {
    setOnline(navigator.onLine)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    loadDraft<{
      arrival: GpsPoint | null
      arrivalVerified: boolean
      photos: EvidencePhoto[]
      checklist: ChecklistAnswer[]
      notes: string
    }>(inspectionId)
      .then((draft) => {
        if (!draft) return
        setArrival(draft.arrival)
        setArrivalVerified(draft.arrivalVerified)
        setPhotos(draft.photos.map((photo) => ({ ...photo, previewUrl: URL.createObjectURL(photo.blob) })))
        setChecklist(draft.checklist)
        setNotes(draft.notes)
        setMessage('Saved offline draft restored.')
      })
      .catch(() => undefined)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [inspectionId])

  useEffect(() => {
    saveDraft(inspectionId, { arrival, arrivalVerified, photos: photos.map(({ previewUrl, ...photo }) => photo), checklist, notes }).catch(() => undefined)
  }, [inspectionId, arrival, arrivalVerified, photos, checklist, notes])

  async function verifyArrival() {
    setBusy(true)
    setMessage('Capturing GPS...')
    try {
      const gps = await getGps()
      if (!online) {
        setArrival(gps)
        setArrivalVerified(false)
        setMessage('GPS saved offline. Reconnect to verify distance with server.')
        return
      }
      const response = await fetch(`/api/agent/inspections/${inspectionId}/arrival`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(gps),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || 'Arrival verification failed.')
      setArrival(gps)
      setArrivalVerified(true)
      setMessage(`GPS verified within ${result.arrival.distance_meters} meters.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Arrival verification failed.')
    } finally {
      setBusy(false)
    }
  }

  async function capturePhoto(direction: string, subject: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setMessage('Compressing photo...')
    try {
      const gps = await getGps().catch(() => arrival)
      const blob = await compressImage(file)
      const photo: EvidencePhoto = {
        localId: crypto.randomUUID(),
        direction,
        subject,
        blob,
        previewUrl: URL.createObjectURL(blob),
        uploadStatus: 'pending',
        gps,
      }
      setPhotos((current) => [...current.filter((item) => item.direction !== direction || direction.startsWith('issue')), photo])
      setMessage(`Photo saved offline at ${Math.round(blob.size / 1024)}KB.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Photo capture failed.')
    } finally {
      setBusy(false)
    }
  }

  async function syncPhotos() {
    if (!online) {
      setMessage('Saved offline. Reconnect to sync.')
      return photos
    }
    const synced: EvidencePhoto[] = []
    for (const photo of photos) {
      if (photo.uploadedPhotoId) {
        synced.push(photo)
        continue
      }
      setMessage(`Syncing ${photo.subject}...`)
      const form = new FormData()
      form.set('file', new File([photo.blob], `${photo.direction}.jpg`, { type: photo.blob.type || 'image/jpeg' }))
      form.set('direction', photo.direction)
      form.set('subject', photo.subject)
      if (photo.gps) {
        form.set('latitude', String(photo.gps.latitude))
        form.set('longitude', String(photo.gps.longitude))
        form.set('accuracy', String(photo.gps.accuracy))
        form.set('capturedAt', photo.gps.capturedAt)
      }
      const response = await fetch(`/api/agent/inspections/${inspectionId}/photo`, { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || `Upload failed for ${photo.subject}.`)
      synced.push({ ...photo, uploadedPhotoId: result.photo.id, uploadStatus: 'uploaded' })
    }
    setPhotos(synced)
    return synced
  }

  async function submitInspection() {
    if (!canSubmit) {
      setMessage('Complete arrival, four photos, checklist, and required issue evidence first.')
      return
    }
    setBusy(true)
    try {
      const synced = await syncPhotos()
      if (!online) return
      const summary = notes.trim() || `Field inspection completed for ${plotLabel}.`
      const actionRequired = checklist.some((answer) =>
        ['encroachment', 'new_construction', 'vegetation', 'waste_dumping', 'water_logging'].includes(answer.key) && answer.value === true,
      )
      const response = await fetch(`/api/agent/inspections/${inspectionId}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          summary,
          notes,
          issueSeverity: actionRequired ? 'high' : 'normal',
          actionRequired,
          checklist,
          documents: documents.map((doc) => ({ id: doc.id, label: doc.label, result: doc.status === 'approved' ? 'confirmed' : 'review_needed' })),
          amenities: amenities.map((amenity) => ({ id: amenity.id, name: amenity.name, condition: 'good' })),
          photos: synced.map((photo) => ({
            localId: photo.localId,
            photoId: photo.uploadedPhotoId,
            direction: photo.direction,
            subject: photo.subject,
            capturedAt: photo.gps?.capturedAt || new Date().toISOString(),
            latitude: photo.gps?.latitude ?? null,
            longitude: photo.gps?.longitude ?? null,
            accuracy: photo.gps?.accuracy ?? null,
          })),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || 'Inspection submission failed.')
      setMessage('Inspection submitted to admin review.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inspection submission failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B45309]">{statusText}</p>
        <h2 className="mt-2 text-2xl font-bold text-[#111827]">{title}</h2>
        <p className="mt-1 text-sm text-[#6B7280]">{location}</p>
        <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#C0392B]" /> Target: {target.latitude ?? 'pending'}, {target.longitude ?? 'pending'}</span>
          <span className="flex items-center gap-2"><Navigation className="h-4 w-4 text-[#C0392B]" /> Current: {arrival ? `${arrival.latitude.toFixed(5)}, ${arrival.longitude.toFixed(5)} (${Math.round(arrival.accuracy)}m)` : 'not captured'}</span>
        </div>
        <button type="button" disabled={busy || !target.latitude || !target.longitude} onClick={verifyArrival} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9CA3AF]">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
          I am at the plot
        </button>
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#111827]">Boundary photos</h2>
        <div className="mt-4 grid gap-3">
          {directions.map((direction) => {
            const captured = photos.find((photo) => photo.direction === direction.key)
            return (
              <div key={direction.key} className="rounded-lg border border-[#E5E7EB] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{direction.label}</span>
                  <button type="button" onClick={() => inputRefs.current[direction.key]?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C0392B] px-3 text-sm font-bold text-[#C0392B]">
                    <Camera className="h-4 w-4" />
                    {captured ? 'Retake' : 'Capture'}
                  </button>
                </div>
                <input ref={(node) => { inputRefs.current[direction.key] = node }} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => capturePhoto(direction.key, direction.label, event)} />
                {captured?.previewUrl ? <img src={captured.previewUrl} alt={direction.label} className="mt-3 aspect-video w-full rounded-lg object-cover" /> : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#111827]">Boundary checklist</h2>
        <div className="mt-4 space-y-3">
          {checklist.map((answer) => (
            <div key={answer.key} className="rounded-lg border border-[#E5E7EB] p-3">
              <p className="text-sm font-semibold">{answer.label}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[true, false].map((value) => (
                  <button key={String(value)} type="button" onClick={() => setChecklist((current) => current.map((item) => item.key === answer.key ? { ...item, value } : item))} className={`min-h-11 rounded-lg border text-sm font-bold ${answer.value === value ? 'border-[#C0392B] bg-red-50 text-[#C0392B]' : 'border-[#E5E7EB] bg-white text-[#6B7280]'}`}>
                    {boolLabel(value)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {encroachment ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            Encroachment needs two issue photos before submit.
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#111827]">Issue evidence, documents, and amenities</h2>
        <button type="button" onClick={() => inputRefs.current.issue?.click()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#C0392B] px-4 text-sm font-bold text-[#C0392B]">
          <Camera className="h-5 w-5" />
          Add issue photo
        </button>
        <input ref={(node) => { inputRefs.current.issue = node }} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => capturePhoto(`issue-${Date.now()}`, 'Issue evidence', event)} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {photos.filter((photo) => photo.direction.startsWith('issue')).map((photo) => (
            <img key={photo.localId} src={photo.previewUrl} alt={photo.subject} className="aspect-video rounded-lg object-cover" />
          ))}
        </div>
        <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
          <p>Documents in file: {documents.length || 'None linked'}</p>
          <p>Active amenities: {amenities.length || 'None linked'}</p>
        </div>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe anything unusual, access issues, visible damage, or owner-facing notes." className="mt-4 min-h-28 w-full rounded-lg border border-[#D1D5DB] p-3 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" />
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#111827]">Submit</h2>
        {message ? <p className="mt-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm text-[#6B7280]">{message}</p> : null}
        <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
          <p>Photos: {photos.length} captured, {photos.filter((photo) => photo.uploadedPhotoId).length} synced</p>
          <p>Checklist: {checklist.filter((answer) => answer.value !== null).length} of {checklist.length}</p>
          <p>Mode: {online ? 'Online sync available' : 'Saved offline until signal returns'}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <button type="button" disabled={busy} onClick={() => syncPhotos().then(() => setMessage('Sync complete.')).catch((error) => setMessage(error.message))} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#1F2937]">
            <RefreshCcw className="h-5 w-5" />
            Sync inspection
          </button>
          <button type="button" disabled={busy || !canSubmit} onClick={submitInspection} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9CA3AF]">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : canSubmit ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            Submit inspection report
          </button>
        </div>
      </section>
    </div>
  )
}
