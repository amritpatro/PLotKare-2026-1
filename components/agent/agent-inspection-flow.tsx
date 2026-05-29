'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Camera, Check, ChevronLeft, ChevronRight, FileText, LoaderCircle, MapPin, RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CORNER_DIRECTIONS, DEFAULT_PROXIMITY_RADIUS_METERS, FIELD_CHECKLIST, GPS_MAX_ACCURACY_METERS, MIN_AMENITY_NOTE_LENGTH, MIN_ISSUE_DESCRIPTION_LENGTH, REQUIRED_ISSUE_PHOTO_COUNT } from '@/lib/agent/field-spec'
import { compressInspectionPhoto, readQueuedEvidence, removeEvidence, storeEvidence, type QueuedEvidence, validateEvidenceFile } from '@/lib/agent/offline'

type Packet = {
  inspection: any
  photos: Array<any>
  checklist: Array<{ question_code: string; answer: boolean; note?: string | null }>
  flags: Array<any>
  documentChecks: Array<any>
  documentSummaries: Array<any>
  activeAmenities: Array<any>
  amenityChecks: Array<any>
}

type Props = { initialPacket: Packet }
type CaptureKind = { direction: 'north' | 'south' | 'east' | 'west' | 'issue' | 'amenity'; subject: 'boundary' | 'issue' | 'amenity'; amenityId?: string }
type PendingCapture = { file: File; kind: CaptureKind; previewUrl: string }
type EvidenceReceipt = {
  direction: string
  subject: 'boundary' | 'issue' | 'amenity'
  latitude: number
  longitude: number
  accuracyMeters: number
  capturedAt: string
  status: 'synced' | 'saved_offline' | 'retry'
}

const panel = 'rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const button = 'flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'

const timestampFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function formatCoordinate(value: number | null | undefined, axis: 'lat' | 'lng') {
  if (!Number.isFinite(value)) return 'Unavailable'
  const absolute = Math.abs(Number(value)).toFixed(6)
  const suffix = axis === 'lat' ? (Number(value) >= 0 ? 'N' : 'S') : Number(value) >= 0 ? 'E' : 'W'
  return `${absolute}° ${suffix}`
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'Unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unavailable'
  return timestampFormatter.format(date)
}

function formatMeters(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 'Unavailable'
  return `${Math.round(Number(value))} m`
}

function getPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  })
}

function stepNumber(value: string) {
  return ['arrival', 'photos', 'checklist', 'documents', 'amenities', 'review'].indexOf(value) + 1
}

function initialWorkflowStep(packet: Packet) {
  const saved = String(packet.inspection.workflow_step || '')
  if (!packet.inspection.arrival_verified) return 'arrival'
  if (['photos', 'checklist', 'documents', 'amenities', 'review'].includes(saved)) return saved
  return 'photos'
}

export function AgentInspectionFlow({ initialPacket }: Props) {
  const router = useRouter()
  const [packet, setPacket] = useState(initialPacket)
  const [step, setStep] = useState(initialWorkflowStep(initialPacket))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [syncState, setSyncState] = useState<'synced' | 'saved_offline' | 'syncing' | 'retry'>('synced')
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>(
    Object.fromEntries(initialPacket.checklist.map((item) => [item.question_code, item.answer])),
  )
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialPacket.checklist.filter((item) => item.note).map((item) => [item.question_code, item.note as string])),
  )
  const [issueDescription, setIssueDescription] = useState(
    initialPacket.flags.find((flag) => flag.flag_type === 'encroachment')?.description || '',
  )
  const [documentResults, setDocumentResults] = useState<Record<string, 'confirmed' | 'reminder' | 'review_needed'>>(
    Object.fromEntries(initialPacket.documentSummaries.map((item) => {
      const existing = initialPacket.documentChecks?.find((check: any) => check.document_id === item.id)?.result
      return [item.id, existing || 'confirmed']
    })),
  )
  const [amenityResults, setAmenityResults] = useState<Record<string, 'good' | 'needs_attention' | 'damaged' | 'not_found'>>(
    Object.fromEntries(initialPacket.amenityChecks.map((item) => [item.active_amenity_id, item.condition])),
  )
  const [amenityNotes, setAmenityNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialPacket.amenityChecks.filter((item) => item.note).map((item) => [item.active_amenity_id, item.note as string])),
  )
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const [queuedPhotos, setQueuedPhotos] = useState<Array<{ id: string; direction: string; subject: string; active_amenity_id?: string }>>([])
  const [lastEvidenceReceipt, setLastEvidenceReceipt] = useState<EvidenceReceipt | null>(null)

  const photos = useMemo(() => [...packet.photos, ...queuedPhotos], [packet.photos, queuedPhotos])
  const capturedDirections = useMemo(() => new Set(photos.map((photo) => photo.direction)), [photos])
  const nextCorner = CORNER_DIRECTIONS.find((direction) => !capturedDirections.has(direction))
  const encroachment = answers.encroachment_observed === true
  const issuePhotoCount = photos.filter((photo) => photo.subject === 'issue').length
  const requiredRadiusMeters = Number(packet.inspection.proximity_radius_meters ?? DEFAULT_PROXIMITY_RADIUS_METERS)
  const arrivalAccuracyMeters = Number(packet.inspection.arrival_accuracy_meters ?? NaN)
  const arrivalDistanceMeters = Number(packet.inspection.arrival_distance_meters ?? NaN)
  const missingAmenityEvidence = packet.activeAmenities.some((active) => !photos.some((photo) => photo.active_amenity_id === active.id))
  const incompleteAmenityNotes = packet.activeAmenities.some((active) => {
    const condition = amenityResults[active.id] || 'good'
    return condition !== 'good' && (amenityNotes[active.id] || '').trim().length < MIN_AMENITY_NOTE_LENGTH
  })
  const queuedEvidenceCount = queuedPhotos.length
  const issueDescriptionReady = issueDescription.trim().length >= MIN_ISSUE_DESCRIPTION_LENGTH
  const checklistComplete = FIELD_CHECKLIST.every((item) => answers[item.code] !== undefined)
  const amenityStepBlockedReason = !packet.activeAmenities.length
    ? null
    : missingAmenityEvidence
      ? 'Capture one current photo for each listed amenity before review.'
      : incompleteAmenityNotes
        ? `Add at least ${MIN_AMENITY_NOTE_LENGTH} characters for every amenity marked as needing attention.`
        : encroachment && issuePhotoCount < REQUIRED_ISSUE_PHOTO_COUNT
          ? `Capture ${REQUIRED_ISSUE_PHOTO_COUNT} encroachment photos before review.`
          : null
  const reviewWarnings = [
    !packet.inspection.arrival_verified ? 'GPS arrival is not verified.' : null,
    CORNER_DIRECTIONS.filter((item) => !capturedDirections.has(item)).length ? 'All four boundary directions are required.' : null,
    !checklistComplete ? 'Every boundary checklist question must be answered.' : null,
    encroachment && !issueDescriptionReady ? `Encroachment description must be at least ${MIN_ISSUE_DESCRIPTION_LENGTH} characters.` : null,
    encroachment && issuePhotoCount < REQUIRED_ISSUE_PHOTO_COUNT ? `Encroachment requires ${REQUIRED_ISSUE_PHOTO_COUNT} issue photos.` : null,
    missingAmenityEvidence ? 'Every active amenity needs a current photo.' : null,
    incompleteAmenityNotes ? `Amenity issue notes must be at least ${MIN_AMENITY_NOTE_LENGTH} characters.` : null,
    queuedEvidenceCount > 0 ? `${queuedEvidenceCount} evidence item${queuedEvidenceCount === 1 ? '' : 's'} still waiting to sync.` : null,
  ].filter(Boolean) as string[]

  const reloadPacket = useCallback(async () => {
    const response = await fetch(`/api/agent/inspections/${packet.inspection.id}`, { cache: 'no-store' })
    if (response.ok) setPacket(await response.json())
  }, [packet.inspection.id])

  const uploadEvidence = useCallback(async (evidence: QueuedEvidence) => {
    const prepare = await fetch(`/api/agent/inspections/${evidence.inspectionId}/photos/prepare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ direction: evidence.direction, subject: evidence.subject, mimeType: evidence.blob.type, sizeBytes: evidence.blob.size }),
    })
    const upload = await prepare.json()
    if (!prepare.ok) throw new Error(upload.error || 'Could not prepare upload.')
    const sent = await fetch(upload.signedUrl, { method: 'PUT', headers: { 'content-type': evidence.blob.type }, body: evidence.blob })
    if (!sent.ok) throw new Error('Upload failed. Your evidence remains saved offline.')
    const finalize = await fetch(`/api/agent/inspections/${evidence.inspectionId}/photos/finalize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        objectPath: upload.objectPath,
        direction: evidence.direction,
        subject: evidence.subject,
        mimeType: evidence.blob.type,
        sizeBytes: evidence.blob.size,
        latitude: evidence.latitude,
        longitude: evidence.longitude,
        accuracyMeters: evidence.accuracyMeters,
        capturedAt: evidence.capturedAt,
        note: evidence.note,
        activeAmenityId: evidence.amenityId,
      }),
    })
    const completed = await finalize.json()
    if (!finalize.ok) throw new Error(completed.error || 'Upload finalization failed.')
  }, [])

  const syncQueued = useCallback(async () => {
    if (!navigator.onLine) return
    const queued = await readQueuedEvidence(packet.inspection.id)
    if (!queued.length) return
    setSyncState('syncing')
    try {
      for (const evidence of queued) {
        await uploadEvidence(evidence)
        await removeEvidence(evidence.key)
      }
      await reloadPacket()
      setQueuedPhotos([])
      setSyncState('synced')
      setMessage('Offline evidence synced.')
    } catch (uploadError) {
      setSyncState('retry')
      setError(uploadError instanceof Error ? uploadError.message : 'Sync failed. Retry when connected.')
    }
  }, [packet.inspection.id, reloadPacket, uploadEvidence])

  useEffect(() => {
    setOnline(navigator.onLine)
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    void readQueuedEvidence(packet.inspection.id).then((items) => {
      setQueuedPhotos(items.map((item) => ({
        id: item.key,
        direction: item.direction,
        subject: item.subject,
        active_amenity_id: item.amenityId,
      })))
      if (items.length) setSyncState(navigator.onLine ? 'retry' : 'saved_offline')
    })
    void syncQueued()
    window.addEventListener('online', syncQueued)
    return () => window.removeEventListener('online', syncQueued)
  }, [syncQueued])

  useEffect(() => () => {
    if (pendingCapture) URL.revokeObjectURL(pendingCapture.previewUrl)
  }, [pendingCapture])

  const verifyArrival = async () => {
    setBusy(true)
    setError(null)
    try {
      const position = await getPosition()
      const response = await fetch(`/api/agent/inspections/${packet.inspection.id}/arrival`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      await reloadPacket()
      setMessage(`GPS locked at ${formatMeters(result.distanceMeters)} from target with ${formatMeters(result.accuracyMeters)} accuracy. Begin boundary photos.`)
      setStep('photos')
    } catch (arrivalError) {
      setError(arrivalError instanceof Error ? arrivalError.message : 'GPS not found. Move to an open area and retry.')
    } finally {
      setBusy(false)
    }
  }

  const queueCapturePreview = (file: File, kind: CaptureKind) => {
    const fileError = validateEvidenceFile(file)
    if (fileError) {
      setError(fileError)
      return
    }
    setError(null)
    setPendingCapture((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return { file, kind, previewUrl: URL.createObjectURL(file) }
    })
  }

  const capture = async (file: File, kind: CaptureKind) => {
    setBusy(true)
    setError(null)
    try {
      const position = await getPosition()
      const compressed = await compressInspectionPhoto(file)
      const evidence: QueuedEvidence = {
        key: crypto.randomUUID(),
        inspectionId: packet.inspection.id,
        direction: kind.direction,
        subject: kind.subject,
        amenityId: kind.amenityId,
        blob: compressed.blob,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        capturedAt: new Date(position.timestamp).toISOString(),
      }
      const receipt = {
        direction: kind.direction,
        subject: kind.subject,
        latitude: evidence.latitude,
        longitude: evidence.longitude,
        accuracyMeters: evidence.accuracyMeters,
        capturedAt: evidence.capturedAt,
      }
      if (!navigator.onLine) {
        await storeEvidence(evidence)
        setQueuedPhotos((current) => [...current, { id: evidence.key, direction: evidence.direction, subject: evidence.subject, active_amenity_id: evidence.amenityId }])
        setSyncState('saved_offline')
        setLastEvidenceReceipt({ ...receipt, status: 'saved_offline' })
        setMessage('Saved offline with GPS and timestamp. Upload will resume when signal returns.')
        return true
      } else {
        try {
          await uploadEvidence(evidence)
          setSyncState('synced')
          setLastEvidenceReceipt({ ...receipt, status: 'synced' })
          setMessage(`${kind.direction.toUpperCase()} evidence captured, stamped, and synced.`)
        } catch {
          await storeEvidence(evidence)
          setQueuedPhotos((current) => [...current, { id: evidence.key, direction: evidence.direction, subject: evidence.subject, active_amenity_id: evidence.amenityId }])
          setSyncState('retry')
          setLastEvidenceReceipt({ ...receipt, status: 'retry' })
          setMessage('Upload interrupted. Evidence is saved on this device with GPS metadata; tap retry when online.')
        }
      }
      await reloadPacket()
      return true
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Photo capture could not be completed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const confirmCapture = async () => {
    if (!pendingCapture) return
    const completed = await capture(pendingCapture.file, pendingCapture.kind)
    if (completed) setPendingCapture(null)
  }

  const saveAndSubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (reviewWarnings.length) throw new Error(reviewWarnings[0])
      const waitingEvidence = await readQueuedEvidence(packet.inspection.id)
      if (waitingEvidence.length) {
        if (!navigator.onLine) throw new Error('Evidence is saved offline. Reconnect and sync before submitting.')
        await syncQueued()
        const remainingEvidence = await readQueuedEvidence(packet.inspection.id)
        if (remainingEvidence.length) throw new Error('Evidence is still waiting to sync. Retry once the connection is stable.')
        setMessage('Evidence synced. Review the inspection and submit again.')
        return
      }
      const checklistFlags = Object.entries(answers)
        .filter(([code, value]) => FIELD_CHECKLIST.find((item) => item.code === code)?.adverseWhen === value)
        .map(([code]) => ({
          type: code === 'encroachment_observed' ? 'encroachment' : code === 'vegetation_overgrowth' ? 'vegetation' : code === 'waste_dumping' ? 'waste' : code === 'water_logging' ? 'water_logging' : code === 'survey_markers_visible' ? 'survey_marker' : 'other',
          severity: code === 'encroachment_observed' ? 'urgent' : 'normal',
          description: code === 'encroachment_observed' ? issueDescription : notes[code] || FIELD_CHECKLIST.find((item) => item.code === code)?.label,
        }))
      const amenityFlags = packet.activeAmenities
        .filter((active) => (amenityResults[active.id] || 'good') !== 'good')
        .map((active) => {
          const amenity = Array.isArray(active.amenities) ? active.amenities[0] : active.amenities
          const photoId = photos.find((photo) => photo.active_amenity_id === active.id)?.id
          return {
            type: 'amenity_issue',
            severity: 'high',
            description: `${amenity?.name || 'Managed amenity'}: ${(amenityNotes[active.id] || 'Needs operations review').trim()}`,
            photoId,
          }
        })
      const draft = await fetch(`/api/agent/inspections/${packet.inspection.id}/draft`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          checklist: FIELD_CHECKLIST.map((item) => ({ code: item.code, answer: answers[item.code], note: notes[item.code] || undefined })),
          documentChecks: packet.documentSummaries.map((doc) => ({
            documentId: doc.id,
            label: doc.title || doc.document_type,
            observedStatus: doc.verification_status,
            result: documentResults[doc.id] || 'confirmed',
          })),
          amenityChecks: packet.activeAmenities.map((active) => ({
            activeAmenityId: active.id,
            condition: amenityResults[active.id] || 'good',
            note: amenityNotes[active.id] || undefined,
            photoId: photos.find((photo) => photo.active_amenity_id === active.id)?.id,
          })),
          flags: [...checklistFlags, ...amenityFlags],
        }),
      })
      const saved = await draft.json()
      if (!draft.ok) throw new Error(saved.error)
      const submitted = await fetch(`/api/agent/inspections/${packet.inspection.id}/submit`, { method: 'POST' })
      const result = await submitted.json()
      if (!submitted.ok) throw new Error(result.error)
      setMessage(`${result.inspectionReference} submitted for admin review.`)
      router.push('/agent/reports')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Inspection submission failed.')
    } finally {
      setBusy(false)
    }
  }

  const status = syncState === 'synced'
    ? queuedEvidenceCount ? `${queuedEvidenceCount} queued` : 'All evidence synced'
    : syncState === 'saved_offline'
      ? `${queuedEvidenceCount} saved offline`
      : syncState === 'syncing'
        ? `Syncing ${queuedEvidenceCount} item${queuedEvidenceCount === 1 ? '' : 's'}`
        : `Retry ${queuedEvidenceCount} upload${queuedEvidenceCount === 1 ? '' : 's'}`
  const property = Array.isArray(packet.inspection.properties) ? packet.inspection.properties[0] : packet.inspection.properties
  const plot = Array.isArray(packet.inspection.plots) ? packet.inspection.plots[0] : packet.inspection.plots

  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/agent" className="flex min-h-12 items-center gap-1 text-sm text-[#6B7280]"><ChevronLeft className="h-4 w-4" /> Today</Link>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#C0392B]">{packet.inspection.inspection_reference}</span>
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold">{plot?.plot_number || property?.title || 'Plot inspection'}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">{plot?.location || [property?.address, property?.city].filter(Boolean).join(', ')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Target GPS</p>
            <p className="mt-2 font-semibold">{formatCoordinate(packet.inspection.target_latitude ?? property?.latitude, 'lat')}</p>
            <p className="text-[#6B7280]">{formatCoordinate(packet.inspection.target_longitude ?? property?.longitude, 'lng')}</p>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Arrival GPS</p>
            <p className="mt-2 font-semibold">{packet.inspection.arrival_verified ? formatMeters(arrivalDistanceMeters) : 'Pending'}</p>
            <p className="text-[#6B7280]">{packet.inspection.arrival_verified ? `${formatMeters(arrivalAccuracyMeters)} accuracy` : `Need <= ${GPS_MAX_ACCURACY_METERS} m accuracy`}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Step {stepNumber(step)} of 6</span>
          <button type="button" disabled={!online || syncState === 'syncing' || !queuedEvidenceCount} onClick={() => void syncQueued()} className="flex min-h-12 items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-50">
            {!online || syncState === 'saved_offline' ? <WifiOff className="h-4 w-4" /> : syncState === 'synced' ? <Wifi className="h-4 w-4" /> : <RefreshCw className={`h-4 w-4 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />} {status}
          </button>
        </div>
        <p className="mt-2 text-xs text-[#6B7280]">
          {online ? (queuedEvidenceCount ? 'Connection is back. Sync queued evidence before submitting.' : 'Connection is stable and evidence can sync immediately.') : 'No signal. New evidence stays on this phone until you reconnect.'}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
          <div className="h-full bg-[#C0392B]" style={{ width: `${(stepNumber(step) / 6) * 100}%` }} />
        </div>
      </section>

      {message ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {lastEvidenceReceipt ? (
        <section className="rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Latest evidence saved</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lastEvidenceReceipt.status === 'synced' ? 'bg-emerald-50 text-emerald-700' : lastEvidenceReceipt.status === 'saved_offline' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
              {lastEvidenceReceipt.status === 'synced' ? 'Synced' : lastEvidenceReceipt.status === 'saved_offline' ? 'Stored offline' : 'Retry upload'}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#6B7280]">
            <div><dt className="font-mono uppercase tracking-[0.1em]">Shot</dt><dd className="mt-1 text-sm font-semibold text-[#1F2937]">{lastEvidenceReceipt.direction.toUpperCase()}</dd></div>
            <div><dt className="font-mono uppercase tracking-[0.1em]">Captured</dt><dd className="mt-1 text-sm font-semibold text-[#1F2937]">{formatTimestamp(lastEvidenceReceipt.capturedAt)}</dd></div>
            <div><dt className="font-mono uppercase tracking-[0.1em]">Latitude</dt><dd className="mt-1 text-sm font-semibold text-[#1F2937]">{formatCoordinate(lastEvidenceReceipt.latitude, 'lat')}</dd></div>
            <div><dt className="font-mono uppercase tracking-[0.1em]">Longitude</dt><dd className="mt-1 text-sm font-semibold text-[#1F2937]">{formatCoordinate(lastEvidenceReceipt.longitude, 'lng')}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-[#6B7280]">Accuracy {formatMeters(lastEvidenceReceipt.accuracyMeters)}. This is the GPS stamp that will be attached to the evidence record.</p>
        </section>
      ) : null}

      {pendingCapture ? (
        <section className={panel}>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#C9A962]">Confirm evidence photo</p>
          <h2 className="mt-3 font-serif text-2xl font-semibold">{pendingCapture.kind.direction.toUpperCase()} capture</h2>
          <img src={pendingCapture.previewUrl} alt={`${pendingCapture.kind.direction} captured evidence preview`} className="mt-4 aspect-[4/3] w-full rounded-lg border border-[#E5E7EB] object-cover" />
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Original file</p>
              <p className="mt-1 font-semibold">{pendingCapture.file.name || 'Camera photo'}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Size</p>
              <p className="mt-1 font-semibold">{Math.max(1, Math.round(pendingCapture.file.size / 1024))} KB</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">Nothing uploads until you tap Confirm. PlotKare then saves an optimized copy together with a fresh GPS fix and capture time.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" disabled={busy} onClick={() => setPendingCapture(null)} className="min-h-12 rounded-lg border border-[#D1D5DB] px-4 text-sm font-semibold text-[#374151]">Retake</button>
            <button type="button" disabled={busy} onClick={() => void confirmCapture()} className={button}>
              {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Confirm
            </button>
          </div>
        </section>
      ) : null}

      {step === 'arrival' ? (
        <section className={panel}>
          <MapPin className="h-8 w-8 text-[#C0392B]" />
          <h2 className="mt-4 font-serif text-2xl font-semibold">Arrive at the plot</h2>
          <p className="mt-2 text-base leading-7 text-[#6B7280]">GPS must place you within {formatMeters(requiredRadiusMeters)} of the verified plot location before evidence capture begins.</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Target latitude</dt>
              <dd className="mt-1 font-semibold">{formatCoordinate(packet.inspection.target_latitude ?? property?.latitude, 'lat')}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Target longitude</dt>
              <dd className="mt-1 font-semibold">{formatCoordinate(packet.inspection.target_longitude ?? property?.longitude, 'lng')}</dd>
            </div>
            {packet.inspection.arrival_verified ? (
              <>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Recorded distance</dt>
                  <dd className="mt-1 font-semibold">{formatMeters(arrivalDistanceMeters)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Recorded accuracy</dt>
                  <dd className="mt-1 font-semibold">{formatMeters(arrivalAccuracyMeters)}</dd>
                </div>
              </>
            ) : null}
          </dl>
          <button type="button" disabled={busy} onClick={() => void verifyArrival()} className={`${button} mt-6 w-full`}>
            {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} I am at the plot
          </button>
        </section>
      ) : null}

      {step === 'photos' ? (
        <section className={panel}>
          <Camera className="h-8 w-8 text-[#C0392B]" />
          <h2 className="mt-4 font-serif text-2xl font-semibold">Boundary photos</h2>
          <p className="mt-2 text-base text-[#6B7280]">{nextCorner ? `Capture the ${nextCorner.toUpperCase()} corner with the boundary visible.` : 'All four corner photos are captured.'}</p>
          <div className="mt-5 flex gap-2">
            {CORNER_DIRECTIONS.map((direction) => <span key={direction} className={`h-3 flex-1 rounded-full ${capturedDirections.has(direction) ? 'bg-[#C0392B]' : 'bg-[#E5E7EB]'}`} />)}
          </div>
          {nextCorner ? (
            <label className={`${button} mt-6 w-full cursor-pointer`}>
              <Camera className="h-5 w-5" /> Capture {nextCorner} corner
              <input type="file" className="sr-only" accept="image/*" capture="environment" disabled={busy} onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) queueCapturePreview(file, { direction: nextCorner, subject: 'boundary' })
                event.currentTarget.value = ''
              }} />
            </label>
          ) : (
            <button type="button" className={`${button} mt-6 w-full`} onClick={() => setStep('checklist')}>Continue to checklist <ChevronRight className="h-5 w-5" /></button>
          )}
        </section>
      ) : null}

      {step === 'checklist' ? (
        <section className={panel}>
          <h2 className="font-serif text-2xl font-semibold">Boundary check</h2>
          <div className="mt-5 space-y-5">
            {FIELD_CHECKLIST.map((item) => (
              <div key={item.code}>
                <p className="mb-2 text-base font-medium">{item.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map((value) => (
                    <button key={String(value)} type="button" onClick={() => setAnswers((current) => ({ ...current, [item.code]: value }))} className={`min-h-12 rounded-lg border text-sm font-semibold ${answers[item.code] === value ? 'border-[#C0392B] bg-[#FFF1F2] text-[#C0392B]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
                      {value ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {encroachment ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-red-700"><AlertTriangle className="h-5 w-5" /> Encroachment evidence required</p>
                <textarea value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} rows={3} placeholder="Describe what was observed" className="mt-3 w-full rounded-lg border border-red-200 bg-white p-3 text-base outline-none" />
                <p className="mt-3 text-sm text-red-700">Write at least {MIN_ISSUE_DESCRIPTION_LENGTH} characters, then capture {REQUIRED_ISSUE_PHOTO_COUNT} issue photos in the amenities step.</p>
              </div>
            ) : null}
          </div>
          <button type="button" disabled={!checklistComplete || (encroachment && !issueDescriptionReady)} onClick={() => setStep('documents')} className={`${button} mt-6 w-full`}>
            Next <ChevronRight className="h-5 w-5" />
          </button>
        </section>
      ) : null}

      {step === 'documents' ? (
        <section className={panel}>
          <FileText className="h-7 w-7 text-[#C0392B]" />
          <h2 className="mt-4 font-serif text-2xl font-semibold">Document status</h2>
          <p className="mt-2 text-sm text-[#6B7280]">Confirm what the system shows or flag a reminder. You are not approving documents.</p>
          <div className="mt-5 space-y-3">
            {packet.documentSummaries.length === 0 ? <p className="rounded-lg bg-[#F9FAFB] p-4 text-sm text-[#6B7280]">No document status checks required for this plan.</p> : null}
            {packet.documentSummaries.map((document) => (
              <div key={document.id} className="rounded-lg border border-[#E5E7EB] p-4">
                <p className="font-semibold">{document.title || document.document_type}</p>
                <p className="mt-1 text-sm text-[#6B7280]">Status: {String(document.verification_status).replaceAll('_', ' ')}</p>
                <select value={documentResults[document.id] || 'confirmed'} onChange={(event) => setDocumentResults((current) => ({ ...current, [document.id]: event.target.value as any }))} className="mt-3 min-h-12 w-full rounded-lg border border-[#D1D5DB] px-3 text-sm">
                  <option value="confirmed">Confirmed as shown</option>
                  <option value="reminder">Flag reminder</option>
                  <option value="review_needed">Flag for review</option>
                </select>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setStep('amenities')} className={`${button} mt-6 w-full`}>Next <ChevronRight className="h-5 w-5" /></button>
        </section>
      ) : null}

      {step === 'amenities' ? (
        <section className={panel}>
          <h2 className="font-serif text-2xl font-semibold">Amenity status</h2>
          <div className="mt-5 space-y-4">
            {packet.activeAmenities.length === 0 ? <p className="rounded-lg bg-[#F9FAFB] p-4 text-sm text-[#6B7280]">No active amenities included for this plot.</p> : null}
            {packet.activeAmenities.map((active) => {
              const amenity = Array.isArray(active.amenities) ? active.amenities[0] : active.amenities
              const amenityPhoto = photos.find((photo) => photo.active_amenity_id === active.id)
              return (
                <div key={active.id} className="rounded-lg border border-[#E5E7EB] p-4">
                  <p className="font-semibold">{amenity?.name || 'Managed amenity'}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#6B7280]">{amenityPhoto ? 'Evidence photo captured' : 'Current evidence photo required'}</p>
                  <select value={amenityResults[active.id] || 'good'} onChange={(event) => setAmenityResults((current) => ({ ...current, [active.id]: event.target.value as any }))} className="mt-3 min-h-12 w-full rounded-lg border border-[#D1D5DB] px-3 text-sm">
                    <option value="good">All good</option>
                    <option value="needs_attention">Needs attention</option>
                    <option value="damaged">Damaged</option>
                    <option value="not_found">Not found</option>
                  </select>
                  <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#C0392B] text-sm font-semibold text-[#C0392B]">
                    <Camera className="h-4 w-4" /> {amenityPhoto ? 'Retake amenity photo' : 'Take amenity photo'}
                    <input type="file" className="sr-only" accept="image/*" capture="environment" onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      if (file) queueCapturePreview(file, { direction: 'amenity', subject: 'amenity', amenityId: active.id })
                      event.currentTarget.value = ''
                    }} />
                  </label>
                  {(amenityResults[active.id] || 'good') !== 'good' ? (
                    <div className="mt-3">
                      <textarea value={amenityNotes[active.id] || ''} onChange={(event) => setAmenityNotes((current) => ({ ...current, [active.id]: event.target.value }))} rows={2} placeholder="Describe the issue" className="mt-3 w-full rounded-lg border border-[#D1D5DB] p-3 text-base" />
                      <p className="mt-2 text-xs text-[#6B7280]">Include at least {MIN_AMENITY_NOTE_LENGTH} characters so operations can trust the exception.</p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {encroachment ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">Capture {REQUIRED_ISSUE_PHOTO_COUNT} encroachment evidence photos</p>
              <p className="mt-1 text-xs text-red-600">{issuePhotoCount} of {REQUIRED_ISSUE_PHOTO_COUNT} captured</p>
              <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#C0392B] text-sm font-semibold text-white">
                <Camera className="h-4 w-4" /> Capture issue photo
                <input type="file" className="sr-only" accept="image/*" capture="environment" onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  if (file) queueCapturePreview(file, { direction: 'issue', subject: 'issue' })
                  event.currentTarget.value = ''
                }} />
              </label>
            </div>
          ) : null}
          {amenityStepBlockedReason ? <p className="mt-4 text-sm text-[#6B7280]">{amenityStepBlockedReason}</p> : null}
          <button type="button" disabled={Boolean(amenityStepBlockedReason)} onClick={() => setStep('review')} className={`${button} mt-6 w-full`}>Review inspection <ChevronRight className="h-5 w-5" /></button>
        </section>
      ) : null}

      {step === 'review' ? (
        <section className={panel}>
          <Check className="h-8 w-8 text-emerald-600" />
          <h2 className="mt-4 font-serif text-2xl font-semibold">Inspection complete</h2>
          {reviewWarnings.length ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Finish these before submitting</p>
              <ul className="mt-2 space-y-1">
                {reviewWarnings.map((warning) => <li key={warning}>- {warning}</li>)}
              </ul>
            </div>
          ) : null}
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[#6B7280]">GPS</dt><dd className="text-right font-semibold">{packet.inspection.arrival_verified ? `Verified (${formatMeters(arrivalDistanceMeters)} away)` : 'Not verified'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#6B7280]">Arrival coordinates</dt><dd className="text-right font-semibold">{packet.inspection.arrival_verified ? `${formatCoordinate(packet.inspection.arrival_latitude, 'lat')} / ${formatCoordinate(packet.inspection.arrival_longitude, 'lng')}` : 'Unavailable'}</dd></div>
            <div className="flex justify-between"><dt className="text-[#6B7280]">Corner photos</dt><dd className="font-semibold">{CORNER_DIRECTIONS.filter((item) => capturedDirections.has(item)).length} of 4</dd></div>
            <div className="flex justify-between"><dt className="text-[#6B7280]">Checklist</dt><dd className="font-semibold">{Object.values(answers).filter((value) => value !== undefined).length} of {FIELD_CHECKLIST.length}</dd></div>
            <div className="flex justify-between"><dt className="text-[#6B7280]">Issue evidence</dt><dd className="font-semibold">{encroachment ? `${issuePhotoCount} of ${REQUIRED_ISSUE_PHOTO_COUNT}` : 'Not required'}</dd></div>
            <div className="flex justify-between"><dt className="text-[#6B7280]">Offline queue</dt><dd className="font-semibold">{queuedEvidenceCount ? `${queuedEvidenceCount} waiting` : 'Clear'}</dd></div>
          </dl>
          <button type="button" disabled={busy || packet.inspection.status === 'submitted' || reviewWarnings.length > 0} onClick={() => void saveAndSubmit()} className={`${button} mt-6 w-full`}>
            {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {packet.inspection.status === 'submitted' ? 'Submitted for admin review' : 'Submit inspection report'}
          </button>
        </section>
      ) : null}
    </div>
  )
}
