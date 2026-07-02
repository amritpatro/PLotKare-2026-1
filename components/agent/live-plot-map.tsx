'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'

type LatLng = {
  latitude: number
  longitude: number
}

type GpsPoint = LatLng & {
  accuracy: number
  capturedAt: string
}

type ArrivalStatus = 'verified' | 'outside-radius' | 'too-far' | null

type LivePlotMapProps = {
  target: {
    latitude: number | null
    longitude: number | null
  }
  current: GpsPoint | null
  distanceMeters: number | null
  arrivalStatus: ArrivalStatus
  accuracyLabel: string
}

const leafletCssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

function ensureLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Map is available only in the browser.'))
  if (!document.querySelector(`link[href="${leafletCssUrl}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = leafletCssUrl
    document.head.appendChild(link)
  }
  return Promise.race([
    import('leaflet'),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Interactive map fallback loaded.')), 2500)
    }),
  ])
}

function markerIcon(kind: 'plot' | 'agent'): Leaflet.DivIconOptions {
  const plotMarkup = '<div style="position:relative;width:32px;height:32px;transform:translate(-50%,-100%)"><div style="width:28px;height:28px;border-radius:999px;background:#C0392B;box-shadow:0 0 0 6px rgba(192,57,43,0.2)"></div><div style="position:absolute;left:12px;top:20px;width:12px;height:12px;transform:rotate(45deg);background:#C0392B"></div></div>'
  const agentMarkup = '<div style="position:relative;width:28px;height:28px;transform:translate(-50%,-50%)"><div class="plotkare-agent-pulse"></div><div style="position:absolute;inset:4px;border-radius:999px;border:2px solid #fff;background:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,0.18)"></div></div>'
  return {
    className: 'plotkare-live-map-marker',
    html: kind === 'plot' ? plotMarkup : agentMarkup,
    iconSize: [32, 32] as [number, number],
    iconAnchor: (kind === 'plot' ? [16, 32] : [16, 16]) as [number, number],
  }
}

function statusText(status: ArrivalStatus, distanceMeters: number | null) {
  if (distanceMeters == null) return 'Waiting for live GPS'
  if (status === 'verified') return `${Math.round(distanceMeters)} m from plot`
  if (status === 'outside-radius') return `${Math.round(distanceMeters)} m, confirm location`
  return `${Math.round(distanceMeters)} m, move closer`
}

function osmEmbedUrl(targetPoint: [number, number], currentPoint: [number, number] | null) {
  const points = currentPoint ? [targetPoint, currentPoint] : [targetPoint]
  const lats = points.map((point) => point[0])
  const lngs = points.map((point) => point[1])
  const minLat = Math.min(...lats) - 0.003
  const maxLat = Math.max(...lats) + 0.003
  const minLng = Math.min(...lngs) - 0.003
  const maxLng = Math.max(...lngs) + 0.003
  const params = new URLSearchParams({
    bbox: `${minLng},${minLat},${maxLng},${maxLat}`,
    layer: 'mapnik',
    marker: `${targetPoint[0]},${targetPoint[1]}`,
  })
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`
}

export function LivePlotMap({ target, current, distanceMeters, arrivalStatus, accuracyLabel }: LivePlotMapProps) {
  const mapId = useId().replaceAll(':', '')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const layersRef = useRef<{
    plot?: Leaflet.Marker
    agent?: Leaflet.Marker
    radius?: Leaflet.Circle
    line?: Leaflet.Polyline
    route?: Leaflet.Polyline
  }>({})
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const targetPoint = useMemo(() => {
    if (target.latitude == null || target.longitude == null) return null
    return [target.latitude, target.longitude] as [number, number]
  }, [target.latitude, target.longitude])
  const currentPoint = useMemo(() => current ? [current.latitude, current.longitude] as [number, number] : null, [current])

  useEffect(() => {
    if (!containerRef.current || !targetPoint) return
    let cancelled = false
    ensureLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return
        leafletRef.current = L
        const map = L.map(containerRef.current, {
          center: targetPoint,
          zoom: 17,
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
        layersRef.current.plot = L.marker(targetPoint, { icon: L.divIcon(markerIcon('plot')) }).addTo(map)
        layersRef.current.radius = L.circle(targetPoint, {
          radius: 50,
          color: '#C0392B',
          weight: 2,
          opacity: 0.8,
          fillColor: '#C0392B',
          fillOpacity: 0.08,
        }).addTo(map)
        mapRef.current = map
        setReady(true)
        requestAnimationFrame(() => map.invalidateSize())
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Map failed to load.'))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layersRef.current = {}
      setReady(false)
    }
  }, [targetPoint])

  useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current || !targetPoint) return
    const L = leafletRef.current
    layersRef.current.plot?.setLatLng(targetPoint)
    layersRef.current.radius?.setLatLng(targetPoint)
    layersRef.current.radius?.setRadius(50)

    if (currentPoint) {
      if (layersRef.current.agent) {
        layersRef.current.agent.setLatLng(currentPoint)
      } else {
        layersRef.current.agent = L.marker(currentPoint, { icon: L.divIcon(markerIcon('agent')) }).addTo(mapRef.current)
      }
      if (layersRef.current.line) {
        layersRef.current.line.setLatLngs([targetPoint, currentPoint])
      } else {
        layersRef.current.line = L.polyline([targetPoint, currentPoint], {
          color: '#2563EB',
          weight: 3,
          opacity: 0.72,
          dashArray: '8 8',
        }).addTo(mapRef.current)
      }
      mapRef.current.fitBounds([targetPoint, currentPoint], { padding: [48, 48], maxZoom: 18 })
    } else {
      layersRef.current.agent?.remove()
      layersRef.current.line?.remove()
      layersRef.current.route?.remove()
      layersRef.current.agent = undefined
      layersRef.current.line = undefined
      layersRef.current.route = undefined
      mapRef.current.setView(targetPoint, 17)
    }
    requestAnimationFrame(() => mapRef.current?.invalidateSize())
  }, [ready, targetPoint, currentPoint])

  useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current || !targetPoint || !currentPoint) return
    let cancelled = false
    const L = leafletRef.current
    const url = `https://router.project-osrm.org/route/v1/driving/${currentPoint[1]},${currentPoint[0]};${targetPoint[1]},${targetPoint[0]}?overview=full&geometries=geojson`
    fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.routes?.[0]?.geometry?.coordinates) return
        const latLngs = payload.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
        if (layersRef.current.route) {
          layersRef.current.route.setLatLngs(latLngs)
        } else {
          layersRef.current.route = L.polyline(latLngs, {
            color: '#0F766E',
            weight: 4,
            opacity: 0.85,
          }).addTo(mapRef.current!)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [ready, targetPoint, currentPoint])

  if (!targetPoint) {
    return (
      <div className="grid h-72 place-items-center rounded-lg border border-[#D1D5DB] bg-[#F3F4F6] px-6 text-center text-sm text-[#6B7280]">
        Location not set for this plot. Contact your admin to add the plot location.
      </div>
    )
  }

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-[#D1D5DB] bg-[#E5E7EB]">
      <div id={`plotkare-map-${mapId}`} ref={containerRef} className="h-full w-full" />
      <style>{`
        .plotkare-live-map-marker {
          background: transparent !important;
          border: 0 !important;
        }
        .plotkare-live-map-marker .plotkare-agent-pulse {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.25);
          animation: plotkare-map-ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-control-attribution {
          font-size: 10px;
        }
        @keyframes plotkare-map-ping {
          75%, 100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
      {loadError ? (
        <iframe
          title="Plot location map"
          src={osmEmbedUrl(targetPoint, currentPoint)}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
        />
      ) : null}
      {!ready && !loadError ? (
        <div className="absolute inset-0 grid place-items-center bg-[#F3F4F6] text-sm font-semibold text-[#4B5563]">
          Loading live map...
        </div>
      ) : null}
      <div className="pointer-events-none absolute left-3 right-3 top-3 rounded-lg bg-white/95 px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-xs text-[#4B5563]">
          <span className="font-semibold text-[#C0392B]">Plot pin</span>
          <span className="font-semibold text-blue-700">Live GPS</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className={`h-full ${arrivalStatus === 'verified' ? 'bg-emerald-500' : arrivalStatus === 'outside-radius' ? 'bg-amber-500' : arrivalStatus === 'too-far' ? 'bg-red-500' : 'bg-[#9CA3AF]'}`}
            style={{ width: arrivalStatus === 'verified' ? '100%' : arrivalStatus === 'outside-radius' ? '66%' : arrivalStatus === 'too-far' ? '33%' : '12%' }}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-[#4B5563] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">{statusText(arrivalStatus, distanceMeters)}</span>
          <span>{current ? accuracyLabel : 'Allow location access'}</span>
        </div>
      </div>
    </div>
  )
}
