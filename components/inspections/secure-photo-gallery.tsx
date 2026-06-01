'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

export type ReviewPhoto = {
  id: string
  object_path: string | null
  direction: string | null
  subject: string | null
  captured_at: string | null
  latitude: number | null
  longitude: number | null
  accuracy_meters: number | null
  caption: string | null
  upload_status: string | null
}

type SignedPhoto = ReviewPhoto & {
  signedUrl: string | null
  loading: boolean
  error: boolean
}

type Props = {
  inspectionId: string
  photos: ReviewPhoto[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Time pending'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function metaLine(photo: ReviewPhoto) {
  const lat = photo.latitude == null ? 'lat pending' : Number(photo.latitude).toFixed(6)
  const lng = photo.longitude == null ? 'lng pending' : Number(photo.longitude).toFixed(6)
  return `${lat}, ${lng}`
}

function PhotoCard({ photo, label, issue = false, onOpen }: { photo?: SignedPhoto; label: string; issue?: boolean; onOpen: (photo: SignedPhoto) => void }) {
  return (
    <div className={`rounded-lg border p-3 ${issue ? 'border-red-200 bg-red-50' : 'border-[#E5E7EB] bg-[#F9FAFB]'}`}>
      <p className={`font-semibold ${issue ? 'text-red-800' : 'text-[#1F2937]'}`}>{label}</p>
      {!photo || photo.loading ? (
        <div className="mt-3 flex aspect-video animate-pulse items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-white text-sm text-[#6B7280]">
          Loading photo
        </div>
      ) : photo.signedUrl && !photo.error ? (
        <button type="button" onClick={() => onOpen(photo)} className="mt-3 block w-full overflow-hidden rounded-lg text-left">
          <img src={photo.signedUrl} alt={photo.subject || label} className="aspect-video w-full object-cover" />
        </button>
      ) : (
        <div className="mt-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-white text-sm text-[#6B7280]">
          Photo unavailable
        </div>
      )}
      <p className="mt-2 font-mono text-[11px] text-[#6B7280]">{formatDate(photo?.captured_at)}</p>
      <p className="mt-1 font-mono text-[11px] text-[#9CA3AF]">{photo ? metaLine(photo) : 'metadata pending'}</p>
    </div>
  )
}

export function SecurePhotoGallery({ inspectionId, photos }: Props) {
  const [signedPhotos, setSignedPhotos] = useState<SignedPhoto[]>(() =>
    photos.map((photo) => ({ ...photo, signedUrl: null, loading: Boolean(photo.object_path), error: false })),
  )
  const [openPhoto, setOpenPhoto] = useState<SignedPhoto | null>(null)

  useEffect(() => {
    let cancelled = false
    setSignedPhotos(photos.map((photo) => ({ ...photo, signedUrl: null, loading: Boolean(photo.object_path), error: false })))
    async function load() {
      const loaded = await Promise.all(photos.map(async (photo) => {
        if (!photo.object_path) return { ...photo, signedUrl: null, loading: false, error: true }
        try {
          const query = new URLSearchParams({ filePath: photo.object_path, inspectionId })
          const response = await fetch(`/api/secure-photo?${query.toString()}`)
          const result = await response.json()
          if (!response.ok || !result.signedUrl) throw new Error(result.error?.message || 'Photo unavailable.')
          return { ...photo, signedUrl: result.signedUrl as string, loading: false, error: false }
        } catch {
          return { ...photo, signedUrl: null, loading: false, error: true }
        }
      }))
      if (!cancelled) setSignedPhotos(loaded)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [inspectionId, photos])

  const boundaryPhotos = useMemo(() => ['north', 'south', 'east', 'west'].map((direction) => signedPhotos.find((photo) => String(photo.direction).toLowerCase() === direction)), [signedPhotos])
  const issuePhotos = useMemo(() => signedPhotos.filter((photo) => String(photo.direction).toLowerCase().startsWith('issue')), [signedPhotos])

  return (
    <>
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Photo evidence</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {boundaryPhotos.map((photo, index) => (
            <PhotoCard key={['north', 'south', 'east', 'west'][index]} photo={photo} label={`${['North', 'South', 'East', 'West'][index]} boundary`} onOpen={setOpenPhoto} />
          ))}
        </div>
        {issuePhotos.length ? (
          <div className="mt-6">
            <h3 className="font-serif text-xl font-semibold text-[#A93226]">Issue evidence</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {issuePhotos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} label={photo.subject || photo.caption || 'Issue evidence'} issue onOpen={setOpenPhoto} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {openPhoto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#111827]">{openPhoto.subject || openPhoto.direction || 'Inspection photo'}</p>
                <p className="mt-1 font-mono text-xs text-[#6B7280]">{formatDate(openPhoto.captured_at)} · {metaLine(openPhoto)}</p>
              </div>
              <button type="button" onClick={() => setOpenPhoto(null)} className="grid h-10 w-10 place-items-center rounded-lg border border-[#E5E7EB] text-[#4B5563]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {openPhoto.signedUrl ? <img src={openPhoto.signedUrl} alt={openPhoto.subject || 'Inspection photo'} className="mt-4 max-h-[70vh] w-full rounded-lg object-contain" /> : null}
            <div className="mt-4 grid gap-1 rounded-lg bg-[#F9FAFB] p-3 font-mono text-xs text-[#4B5563]">
              <span>Direction: {openPhoto.direction || 'pending'}</span>
              <span>Accuracy: {openPhoto.accuracy_meters == null ? 'pending' : `${Math.round(Number(openPhoto.accuracy_meters))} meters`}</span>
              <span>Path: {openPhoto.object_path || 'pending'}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
