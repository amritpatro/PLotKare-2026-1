'use client'

import { useMemo } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection, GeoJsonProperties } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countriesTopology from 'world-atlas/countries-110m.json'

export type PresenceCity = {
  name: string
  country: string
  lon: number
  lat: number
}

const VIZAG = { lon: 83.2185, lat: 17.6868 }

type Props = {
  cities: PresenceCity[]
}

function iso3(f: GeoJsonProperties): string | undefined {
  if (!f || typeof f !== 'object') return undefined
  const p = f as { ISO_A3?: string }
  return p.ISO_A3
}

export function WorldPresenceMap({ cities }: Props) {
  const { paths, projection } = useMemo(() => {
    const topo = countriesTopology as unknown as Topology<{ countries: GeometryCollection }>
    const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection
    const width = 700
    const height = 380
    const projection = geoNaturalEarth1().fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      fc,
    )
    const pathGen = geoPath(projection)
    const paths = fc.features.map((f) => ({
      key: iso3(f.properties) ?? f.type,
      d: pathGen(f) ?? '',
      iso: iso3(f.properties),
    }))
    return { paths, projection }
  }, [])

  const projectedCities = cities.map((c) => {
    const p = projection([c.lon, c.lat])
    return { ...c, x: p?.[0] ?? 0, y: p?.[1] ?? 0 }
  })
  const v = projection([VIZAG.lon, VIZAG.lat])
  const vx = v?.[0] ?? 0
  const vy = v?.[1] ?? 0

  return (
    <svg viewBox="0 0 700 380" className="w-full" role="img" aria-label="World map with city markers">
      {paths.map(({ key, d, iso }, i) => (
        <path
          key={`${String(iso ?? key)}-${i}`}
          d={d}
          fill={iso === 'IND' ? '#3a3532' : '#242424'}
          stroke={iso === 'IND' ? '#C9A962' : '#353535'}
          strokeWidth={iso === 'IND' ? 1.1 : 0.35}
        />
      ))}

      {projectedCities.map((city) => (
        <line
          key={`line-${city.name}`}
          x1={city.x}
          y1={city.y}
          x2={vx}
          y2={vy}
          stroke="#8B1538"
          strokeWidth={0.45}
          strokeDasharray="4 4"
          opacity={0.35}
        />
      ))}

      {projectedCities.map((city) => (
        <g key={city.name}>
          <circle cx={city.x} cy={city.y} r={6} fill="#8B1538" opacity={0.25} className="animate-ping-slow" />
          <circle cx={city.x} cy={city.y} r={4.5} fill="#8B1538" />
          <text
            x={city.x}
            y={city.y - 10}
            textAnchor="middle"
            fill="white"
            fontSize={8}
            fontWeight={500}
            className="font-mono"
          >
            {city.name}
          </text>
        </g>
      ))}

      <g>
        <circle cx={vx} cy={vy} r={10} fill="#C9A962" opacity={0.28} className="animate-ping-slow" />
        <circle cx={vx} cy={vy} r={7.5} fill="#C9A962" />
        <text
          x={vx}
          y={vy + 20}
          textAnchor="middle"
          fill="#C9A962"
          fontSize={10}
          fontWeight={600}
          className="font-mono"
        >
          VIZAG
        </text>
      </g>
    </svg>
  )
}

export { VIZAG }
