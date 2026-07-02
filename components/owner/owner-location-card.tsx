'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Loader2, LockKeyhole, Map, MapPin, PenLine, Satellite } from 'lucide-react'
import type * as Leaflet from 'leaflet'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import type { OwnerCoordinatePlot } from '@/components/owner/owner-coordinate-panel'

type LocationSource = 'owner_map_pin' | 'owner_gps' | 'owner_manual'

type OwnerLocationCardProps = {
  plot: OwnerCoordinatePlot
  action: (formData: FormData) => Promise<void>
}

const leafletCssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const defaultPoint: [number, number] = [17.6868, 83.2185]
const apBounds = { minLat: 12, maxLat: 20, minLng: 76, maxLng: 85.5 }

function ensureLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Map is available only in the browser.'))
  if (!document.querySelector(`link[href="${leafletCssUrl}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = leafletCssUrl
    document.head.appendChild(link)
  }
  return import('leaflet')
}

function isInAndhraPradesh(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= apBounds.minLat &&
    latitude <= apBounds.maxLat &&
    longitude >= apBounds.minLng &&
    longitude <= apBounds.maxLng
  )
}

function pinIcon(): Leaflet.DivIconOptions {
  return {
    className: 'plotkare-owner-location-marker',
    html: '<div style="position:relative;width:34px;height:34px;transform:translate(-50%,-100%)"><div style="width:30px;height:30px;border-radius:999px;background:#C0392B;box-shadow:0 0 0 8px rgba(192,57,43,0.18)"></div><div style="position:absolute;left:13px;top:22px;width:12px;height:12px;transform:rotate(45deg);background:#C0392B"></div></div>',
    iconSize: [34, 34] as [number, number],
    iconAnchor: [17, 34] as [number, number],
  }
}

function statusCopy(status: string | null | undefined) {
  if (status === 'verified') return { label: 'Verified', tone: 'emerald', copy: 'Admin verified. Agents will use this pin for navigation and arrival proof.' }
  if (status === 'pending_verification') return { label: 'Pending verification', tone: 'amber', copy: 'Submitted to admin. The pin is locked until review is complete.' }
  if (status === 'rejected') return { label: 'Rejected', tone: 'red', copy: 'Admin rejected this pin. Adjust and resubmit with a clear landmark.' }
  return { label: 'Not set', tone: 'neutral', copy: 'Submit the plot pin before inspection assignment.' }
}

function numberOrNull(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function OwnerLocationCard({ plot, action }: OwnerLocationCardProps) {
  const status = plot.location_status || 'not_set'
  const locked = status === 'pending_verification' || status === 'verified'
  const initialLat = numberOrNull(plot.submitted_latitude ?? plot.target_latitude)
  const initialLng = numberOrNull(plot.submitted_longitude ?? plot.target_longitude)
  const [point, setPoint] = useState<[number, number] | null>(() =>
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null,
  )
  const [manualLat, setManualLat] = useState(initialLat?.toFixed(6) ?? '')
  const [manualLng, setManualLng] = useState(initialLng?.toFixed(6) ?? '')
  const [accuracy, setAccuracy] = useState<number | null>(numberOrNull(plot.submitted_accuracy_meters))
  const [source, setSource] = useState<LocationSource>((plot.location_source as LocationSource) || 'owner_map_pin')
  const [tileStyle, setTileStyle] = useState<'street' | 'satellite'>('street')
  const [loadingGps, setLoadingGps] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const markerRef = useRef<Leaflet.Marker | null>(null)
  const tileRef = useRef<Leaflet.TileLayer | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const banner = statusCopy(status)
  const valid = point ? isInAndhraPradesh(point[0], point[1]) : false
  const coordinateLabel = point ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}` : 'Coordinates not selected'

  const center = useMemo(() => point ?? defaultPoint, [point])

  useEffect(() => {
    if (locked || !containerRef.current) return
    let cancelled = false
    ensureLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return
        leafletRef.current = L
        const map = L.map(containerRef.current, {
          center,
          zoom: point ? 17 : 12,
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
          touchZoom: true,
          dragging: true,
        })
        tileRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 20,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)
        map.on('click', (event: Leaflet.LeafletMouseEvent) => {
          const next: [number, number] = [event.latlng.lat, event.latlng.lng]
          setPoint(next)
          setManualLat(next[0].toFixed(6))
          setManualLng(next[1].toFixed(6))
          setAccuracy(null)
          setSource('owner_map_pin')
          setMessage('Map pin updated. Check the landmark before submitting.')
        })
        if (point) markerRef.current = L.marker(point, { icon: L.divIcon(pinIcon()) }).addTo(map)
        mapRef.current = map
        requestAnimationFrame(() => map.invalidateSize())
      })
      .catch(() => setMapError('Map could not load. Manual coordinates and device GPS still work.'))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      tileRef.current = null
    }
  }, [locked])

  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || locked) return
    tileRef.current?.remove()
    const url =
      tileStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    const attribution =
      tileStyle === 'satellite' ? 'Tiles &copy; Esri, Earthstar Geographics' : '&copy; OpenStreetMap contributors'
    tileRef.current = leafletRef.current.tileLayer(url, { maxZoom: 20, attribution }).addTo(mapRef.current)
  }, [tileStyle, locked])

  useEffect(() => {
    if (!point || !mapRef.current || !leafletRef.current || locked) return
    const L = leafletRef.current
    if (markerRef.current) {
      markerRef.current.setLatLng(point)
    } else {
      markerRef.current = L.marker(point, { icon: L.divIcon(pinIcon()) }).addTo(mapRef.current)
    }
    mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), 16))
    requestAnimationFrame(() => mapRef.current?.invalidateSize())
  }, [point, locked])

  function updateManual(latitudeText: string, longitudeText: string) {
    setManualLat(latitudeText)
    setManualLng(longitudeText)
    const latitude = Number(latitudeText)
    const longitude = Number(longitudeText)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setPoint([latitude, longitude])
      setAccuracy(null)
      setSource('owner_manual')
      setMessage(isInAndhraPradesh(latitude, longitude) ? 'Manual coordinates ready.' : 'Coordinates must be inside Andhra Pradesh bounds.')
    }
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setMessage('Device GPS is not available in this browser.')
      return
    }
    setLoadingGps(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude]
        setPoint(next)
        setManualLat(next[0].toFixed(6))
        setManualLng(next[1].toFixed(6))
        setAccuracy(position.coords.accuracy)
        setSource('owner_gps')
        setLoadingGps(false)
        setMessage(`GPS captured with ${Math.round(position.coords.accuracy)}m accuracy.`)
      },
      () => {
        setLoadingGps(false)
        setMessage('Location permission was blocked or unavailable.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <form action={action} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <input type="hidden" name="plotId" value={plot.id} />
      <input type="hidden" name="latitude" value={point?.[0] ?? ''} />
      <input type="hidden" name="longitude" value={point?.[1] ?? ''} />
      <input type="hidden" name="accuracy" value={accuracy ?? ''} />
      <input type="hidden" name="source" value={source} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-[#1F2937]">{plot.plot_number || 'Plot reference pending'}</p>
          <p className="text-sm text-[#6B7280]">{plot.location || 'Location pending'}</p>
          <p className="mt-1 font-mono text-xs text-[#9CA3AF]">{coordinateLabel}</p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
            banner.tone === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : banner.tone === 'amber'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : banner.tone === 'red'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-[#E5E7EB] bg-white text-[#6B7280]'
          }`}
        >
          {locked ? <LockKeyhole className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
          {banner.label}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs leading-5 text-[#6B7280]">
        {banner.copy}
        {plot.location_note ? <p className="mt-1 font-medium text-[#C0392B]">Admin note: {plot.location_note}</p> : null}
        {plot.address_landmark ? <p className="mt-1">Landmark: {plot.address_landmark}</p> : null}
      </div>

      {locked ? (
        <div className="mt-3 grid gap-2 text-xs text-[#6B7280] sm:grid-cols-2">
          <p>Submitted: {plot.location_submitted_at ? new Date(plot.location_submitted_at).toLocaleString('en-IN') : 'Pending'}</p>
          <p>Verified: {plot.location_verified_at ? new Date(plot.location_verified_at).toLocaleString('en-IN') : 'Waiting'}</p>
          {plot.google_maps_link ? (
            <a href={plot.google_maps_link} target="_blank" rel="noreferrer" className="font-semibold text-[#C0392B]">
              Open verified location
            </a>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTileStyle('street')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${tileStyle === 'street' ? 'border-[#C0392B] bg-red-50 text-[#C0392B]' : 'border-[#D1D5DB] bg-white text-[#1F2937]'}`}
            >
              <Map className="h-4 w-4" />
              Street
            </button>
            <button
              type="button"
              onClick={() => setTileStyle('satellite')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${tileStyle === 'satellite' ? 'border-[#C0392B] bg-red-50 text-[#C0392B]' : 'border-[#D1D5DB] bg-white text-[#1F2937]'}`}
            >
              <Satellite className="h-4 w-4" />
              Satellite
            </button>
            <button
              type="button"
              onClick={captureGps}
              disabled={loadingGps}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm font-semibold text-[#1F2937] disabled:opacity-60"
            >
              {loadingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              Use GPS
            </button>
          </div>

          <div className="relative h-64 overflow-hidden rounded-lg border border-[#D1D5DB] bg-[#E5E7EB]">
            <div ref={containerRef} className="h-full w-full" />
            {mapError ? (
              <div className="absolute inset-0 grid place-items-center bg-[#F9FAFB] px-4 text-center text-sm text-[#6B7280]">
                {mapError}
              </div>
            ) : null}
            <style>{`
              .plotkare-owner-location-marker {
                background: transparent !important;
                border: 0 !important;
              }
              .leaflet-container {
                font-family: inherit;
              }
              .leaflet-control-attribution {
                font-size: 10px;
              }
            `}</style>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
              Latitude
              <input
                type="number"
                step="0.000001"
                min={apBounds.minLat}
                max={apBounds.maxLat}
                value={manualLat}
                onChange={(event) => updateManual(event.target.value, manualLng)}
                className="min-h-11 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm normal-case tracking-normal text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
              Longitude
              <input
                type="number"
                step="0.000001"
                min={apBounds.minLng}
                max={apBounds.maxLng}
                value={manualLng}
                onChange={(event) => updateManual(manualLat, event.target.value)}
                className="min-h-11 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm normal-case tracking-normal text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15"
              />
            </label>
          </div>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
            Landmark for admin and field agent
            <input
              name="landmark"
              defaultValue={plot.address_landmark ?? ''}
              placeholder="Nearest road, gate, survey stone, temple, school, or shop"
              className="min-h-11 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm normal-case tracking-normal text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15"
            />
          </label>

          {message || !valid ? (
            <div className={`rounded-lg border px-3 py-2 text-xs ${valid ? 'border-[#E5E7EB] bg-white text-[#6B7280]' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {valid ? message : 'Pick coordinates inside Andhra Pradesh: latitude 12.0-20.0 and longitude 76.0-85.5.'}
            </div>
          ) : null}

          <PendingActionButton
            pendingText="Submitting..."
            disabled={!valid}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 text-sm font-semibold text-white transition hover:bg-[#A93225] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
          >
            <PenLine className="h-4 w-4" />
            Submit location for verification
          </PendingActionButton>
        </div>
      )}
    </form>
  )
}
