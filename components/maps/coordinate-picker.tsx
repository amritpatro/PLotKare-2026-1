'use client'

import { Crosshair, Loader2, MapPin, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'

type CoordinatePickerProps = {
  initialLatitude?: number | null
  initialLongitude?: number | null
  latitudeName?: string
  longitudeName?: string
  defaultQuery?: string | null
  compact?: boolean
}

type SearchResult = {
  display_name: string
  lat: string
  lon: string
}

const leafletCssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const defaultPoint: [number, number] = [17.6868, 83.2185]

function isValidCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

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

function pinIcon(): Leaflet.DivIconOptions {
  return {
    className: 'plotkare-coordinate-marker',
    html: '<div style="position:relative;width:32px;height:32px;transform:translate(-50%,-100%)"><div style="width:28px;height:28px;border-radius:999px;background:#C0392B;box-shadow:0 0 0 6px rgba(192,57,43,0.2)"></div><div style="position:absolute;left:12px;top:20px;width:12px;height:12px;transform:rotate(45deg);background:#C0392B"></div></div>',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
  }
}

export function CoordinatePicker({
  initialLatitude,
  initialLongitude,
  latitudeName = 'latitude',
  longitudeName = 'longitude',
  defaultQuery,
  compact = false,
}: CoordinatePickerProps) {
  const mapId = useId().replaceAll(':', '')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const markerRef = useRef<Leaflet.Marker | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState(defaultQuery ?? '')
  const [searching, setSearching] = useState(false)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [point, setPoint] = useState<[number, number] | null>(() => {
    const lat = Number(initialLatitude)
    const lng = Number(initialLongitude)
    return isValidCoordinate(lat, lng) ? [lat, lng] : null
  })
  const mapCenter = point ?? defaultPoint
  const coordinateLabel = useMemo(() => (point ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}` : 'Coordinates not set'), [point])

  useEffect(() => {
    if (!expanded || !containerRef.current) return
    let cancelled = false
    ensureLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return
        leafletRef.current = L
        const map = L.map(containerRef.current, {
          center: mapCenter,
          zoom: point ? 17 : 12,
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
          touchZoom: true,
          dragging: true,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 20,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)
        map.on('click', (event: Leaflet.LeafletMouseEvent) => {
          const next: [number, number] = [event.latlng.lat, event.latlng.lng]
          setPoint(next)
          setMessage('Map pin updated.')
        })
        mapRef.current = map
        if (point) {
          markerRef.current = L.marker(point, { icon: L.divIcon(pinIcon()) }).addTo(map)
        }
        requestAnimationFrame(() => map.invalidateSize())
      })
      .catch(() => setMessage('Map could not load. You can still paste coordinates manually.'))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [expanded])

  useEffect(() => {
    if (!expanded || !mapRef.current || !leafletRef.current || !point) return
    const L = leafletRef.current
    if (markerRef.current) {
      markerRef.current.setLatLng(point)
    } else {
      markerRef.current = L.marker(point, { icon: L.divIcon(pinIcon()) }).addTo(mapRef.current)
    }
    mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), 16))
    requestAnimationFrame(() => mapRef.current?.invalidateSize())
  }, [expanded, point])

  async function searchPlace() {
    const trimmed = query.trim()
    if (!trimmed) return
    setSearching(true)
    setMessage(null)
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        q: trimmed,
        limit: '1',
        countrycodes: 'in',
      })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Search failed.')
      const results = (await response.json()) as SearchResult[]
      const result = results[0]
      if (!result) throw new Error('No location found.')
      const lat = Number(result.lat)
      const lng = Number(result.lon)
      if (!isValidCoordinate(lat, lng)) throw new Error('Location returned invalid coordinates.')
      setPoint([lat, lng])
      setExpanded(true)
      setMessage(result.display_name)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Location search failed.')
    } finally {
      setSearching(false)
    }
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setMessage('Device location is not available in this browser.')
      return
    }
    setLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint([position.coords.latitude, position.coords.longitude])
        setExpanded(true)
        setLoadingLocation(false)
        setMessage(`Device location captured with ${Math.round(position.coords.accuracy)}m accuracy.`)
      },
      () => {
        setLoadingLocation(false)
        setMessage('Location permission was blocked or unavailable.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    )
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <input type="hidden" name={latitudeName} value={point?.[0] ?? ''} />
      <input type="hidden" name={longitudeName} value={point?.[1] ?? ''} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                searchPlace()
              }
            }}
            placeholder="Search locality, landmark, survey area"
            className="min-h-10 w-full rounded-lg border border-[#D1D5DB] bg-white py-2 pl-9 pr-3 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15"
          />
        </div>
        <button type="button" onClick={searchPlace} disabled={searching} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1F2937] px-3 text-sm font-semibold text-white disabled:opacity-60">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
        <button type="button" onClick={useDeviceLocation} disabled={loadingLocation} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm font-semibold text-[#1F2937] disabled:opacity-60">
          {loadingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          GPS
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
        <span className="inline-flex items-center gap-1 font-mono">
          <MapPin className="h-3.5 w-3.5 text-[#C0392B]" />
          {coordinateLabel}
        </span>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-md border border-[#D1D5DB] bg-white px-2 py-1 font-semibold text-[#1F2937]">
          {expanded ? 'Hide map' : 'Open map'}
        </button>
      </div>
      {expanded ? (
        <div className={`mt-3 overflow-hidden rounded-lg border border-[#D1D5DB] bg-[#E5E7EB] ${compact ? 'h-56' : 'h-72'}`}>
          <div id={`coordinate-picker-${mapId}`} ref={containerRef} className="h-full w-full" />
          <style>{`
            .plotkare-coordinate-marker {
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
      ) : null}
      {message ? <p className="mt-2 text-xs text-[#6B7280]">{message}</p> : null}
    </div>
  )
}
