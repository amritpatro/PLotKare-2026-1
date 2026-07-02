'use client'

import { useEffect, useRef, useState } from 'react'
import { Map, Satellite } from 'lucide-react'
import type * as Leaflet from 'leaflet'

type AdminLocationReviewMapProps = {
  initialLatitude: number | null
  initialLongitude: number | null
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

function isInBounds(latitude: number, longitude: number) {
  return latitude >= apBounds.minLat && latitude <= apBounds.maxLat && longitude >= apBounds.minLng && longitude <= apBounds.maxLng
}

function pinIcon(): Leaflet.DivIconOptions {
  return {
    className: 'plotkare-admin-review-marker',
    html: '<div style="position:relative;width:36px;height:36px;transform:translate(-50%,-100%)"><div style="width:32px;height:32px;border-radius:999px;background:#C0392B;box-shadow:0 0 0 8px rgba(192,57,43,0.18)"></div><div style="position:absolute;left:14px;top:24px;width:12px;height:12px;transform:rotate(45deg);background:#C0392B"></div></div>',
    iconSize: [36, 36] as [number, number],
    iconAnchor: [18, 36] as [number, number],
  }
}

export function AdminLocationReviewMap({ initialLatitude, initialLongitude }: AdminLocationReviewMapProps) {
  const start: [number, number] =
    initialLatitude != null && initialLongitude != null ? [Number(initialLatitude), Number(initialLongitude)] : defaultPoint
  const initialPointRef = useRef(start)
  const [point, setPoint] = useState<[number, number]>(start)
  const [manualLat, setManualLat] = useState(start[0].toFixed(6))
  const [manualLng, setManualLng] = useState(start[1].toFixed(6))
  const [adjusted, setAdjusted] = useState(false)
  const [tileStyle, setTileStyle] = useState<'street' | 'satellite'>('satellite')
  const [loadError, setLoadError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const markerRef = useRef<Leaflet.Marker | null>(null)
  const tileRef = useRef<Leaflet.TileLayer | null>(null)
  const valid = isInBounds(point[0], point[1])

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    ensureLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return
        const initialPoint = initialPointRef.current
        leafletRef.current = L
        const map = L.map(containerRef.current, {
          center: initialPoint,
          zoom: 18,
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
          touchZoom: true,
          dragging: true,
        })
        markerRef.current = L.marker(initialPoint, {
          icon: L.divIcon(pinIcon()),
          draggable: true,
        }).addTo(map)
        markerRef.current.on('dragend', () => {
          const latLng = markerRef.current!.getLatLng()
          const next: [number, number] = [latLng.lat, latLng.lng]
          setPoint(next)
          setManualLat(next[0].toFixed(6))
          setManualLng(next[1].toFixed(6))
          setAdjusted(true)
        })
        map.on('click', (event: Leaflet.LeafletMouseEvent) => {
          const next: [number, number] = [event.latlng.lat, event.latlng.lng]
          setPoint(next)
          setManualLat(next[0].toFixed(6))
          setManualLng(next[1].toFixed(6))
          setAdjusted(true)
        })
        mapRef.current = map
        requestAnimationFrame(() => map.invalidateSize())
      })
      .catch(() => setLoadError('Map failed to load. Manual coordinate review still works.'))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      tileRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return
    tileRef.current?.remove()
    const url =
      tileStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    const attribution =
      tileStyle === 'satellite' ? 'Tiles &copy; Esri, Earthstar Geographics' : '&copy; OpenStreetMap contributors'
    tileRef.current = leafletRef.current.tileLayer(url, { maxZoom: 20, attribution }).addTo(mapRef.current)
  }, [tileStyle])

  useEffect(() => {
    markerRef.current?.setLatLng(point)
    mapRef.current?.setView(point, Math.max(mapRef.current.getZoom(), 17))
  }, [point])

  function updateManual(latitudeText: string, longitudeText: string) {
    setManualLat(latitudeText)
    setManualLng(longitudeText)
    const latitude = Number(latitudeText)
    const longitude = Number(longitudeText)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setPoint([latitude, longitude])
      setAdjusted(true)
    }
  }

  return (
    <div className="grid gap-4">
      <input type="hidden" name="latitude" value={point[0]} />
      <input type="hidden" name="longitude" value={point[1]} />
      <input type="hidden" name="adjusted" value={String(adjusted)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTileStyle('satellite')} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${tileStyle === 'satellite' ? 'border-[#C0392B] bg-red-50 text-[#C0392B]' : 'border-[#D1D5DB] bg-white text-[#1F2937]'}`}>
          <Satellite className="h-4 w-4" />
          Satellite
        </button>
        <button type="button" onClick={() => setTileStyle('street')} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${tileStyle === 'street' ? 'border-[#C0392B] bg-red-50 text-[#C0392B]' : 'border-[#D1D5DB] bg-white text-[#1F2937]'}`}>
          <Map className="h-4 w-4" />
          Street
        </button>
      </div>
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-[#D1D5DB] bg-[#E5E7EB]">
        <div ref={containerRef} className="h-full w-full" />
        {loadError ? <div className="absolute inset-0 grid place-items-center bg-[#F9FAFB] px-4 text-sm text-[#6B7280]">{loadError}</div> : null}
        <style>{`
          .plotkare-admin-review-marker {
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
          Review latitude
          <input type="number" step="0.000001" min={apBounds.minLat} max={apBounds.maxLat} value={manualLat} onChange={(event) => updateManual(event.target.value, manualLng)} className="min-h-11 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm normal-case tracking-normal text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" />
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Review longitude
          <input type="number" step="0.000001" min={apBounds.minLng} max={apBounds.maxLng} value={manualLng} onChange={(event) => updateManual(manualLat, event.target.value)} className="min-h-11 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm normal-case tracking-normal text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" />
        </label>
      </div>
      <p className={`rounded-lg border px-3 py-2 text-xs ${valid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        {valid
          ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}${adjusted ? ' - adjusted by admin before verification.' : ' - owner submitted pin.'}`
          : 'Coordinates must remain inside Andhra Pradesh bounds before verification.'}
      </p>
    </div>
  )
}
