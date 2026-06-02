'use client'

import { logger } from '@/lib/monitoring/logger'
import dynamic from 'next/dynamic'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BODUVALASA_LAYOUT } from '@/lib/boduvalasa-layout'
import { getMappedPlotMarks, getPlotProfile } from '@/lib/plot-profile'

const CRIMSON = '#8B1538'
const GOLD = '#C9A962'
const INK = '#1a1a1a'
const ROAD = '#9aa3ad'
const PAPER = '#fffaf1'
const LAND = '#ded3b8'
const GREEN = '#355f49'
const GRASS = '#6f8f4e'
const SOIL = '#6b5737'
const LAYOUT_NORTH_DEGREES = -8
const LAYOUT_BOUNDARY = {
  x: [0, BODUVALASA_LAYOUT.viewBox.width] as const,
  y: [14, BODUVALASA_LAYOUT.viewBox.height] as const,
  width: BODUVALASA_LAYOUT.viewBox.width,
  height: BODUVALASA_LAYOUT.viewBox.height - 14,
}
const PLOT_BOUNDARY_INSET = 12

function normalizedPoint(x: number, y: number) {
  const w = BODUVALASA_LAYOUT.viewBox.width
  const h = BODUVALASA_LAYOUT.viewBox.height
  return {
    x: (x / w - 0.5) * 10.8,
    z: (y / h - 0.5) * 7.2,
  }
}

function LineMesh({ segment }: { segment: readonly [number, number, number, number] }) {
  const a = normalizedPoint(segment[0], segment[1])
  const b = normalizedPoint(segment[2], segment[3])
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len = Math.max(0.02, Math.hypot(dx, dz))
  const angle = Math.atan2(dz, dx)

  return (
    <mesh position={[(a.x + b.x) / 2, 0.075, (a.z + b.z) / 2]} rotation={[0, -angle, 0]} receiveShadow>
      <boxGeometry args={[len, 0.035, 0.018]} />
      <meshStandardMaterial color={INK} roughness={0.82} metalness={0.02} />
    </mesh>
  )
}

function clipSegmentToBoundary(segment: readonly [number, number, number, number]) {
  const [minX, maxX] = LAYOUT_BOUNDARY.x
  const [minY, maxY] = LAYOUT_BOUNDARY.y
  let [x0, y0, x1, y1] = segment
  const dx = x1 - x0
  const dy = y1 - y0
  let t0 = 0
  let t1 = 1

  const checks = [
    [-dx, x0 - minX],
    [dx, maxX - x0],
    [-dy, y0 - minY],
    [dy, maxY - y0],
  ] as const

  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const r = q / p
    if (p < 0) {
      if (r > t1) return null
      if (r > t0) t0 = r
    } else {
      if (r < t0) return null
      if (r < t1) t1 = r
    }
  }

  return [
    x0 + t0 * dx,
    y0 + t0 * dy,
    x0 + t1 * dx,
    y0 + t1 * dy,
  ] as const
}

function getClippedLayoutSegments() {
  return BODUVALASA_LAYOUT.segments
    .map(clipSegmentToBoundary)
    .filter((segment): segment is readonly [number, number, number, number] => Boolean(segment))
}

function getPlotBoundaryViolations(marks: LayoutPlotMark[]) {
  return marks.filter(
    (mark) =>
      mark.x < LAYOUT_BOUNDARY.x[0] + PLOT_BOUNDARY_INSET ||
      mark.x > LAYOUT_BOUNDARY.x[1] - PLOT_BOUNDARY_INSET ||
      mark.y < LAYOUT_BOUNDARY.y[0] + PLOT_BOUNDARY_INSET ||
      mark.y > LAYOUT_BOUNDARY.y[1] - PLOT_BOUNDARY_INSET,
  )
}

function isPlotMarkInsideBoundary(mark: LayoutPlotMark) {
  return !getPlotBoundaryViolations([mark]).length
}

function CameraRig() {
  const { camera } = useThree()

  useLayoutEffect(() => {
    camera.position.set(0.2, 8.2, 6.8)
    camera.lookAt(0, 0, 0.15)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 34
      camera.near = 0.1
      camera.far = 80
      camera.updateProjectionMatrix()
    }
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = 54
      camera.near = 0.1
      camera.far = 90
      camera.updateProjectionMatrix()
    }
  }, [camera])

  return null
}

type Boduvalasa3DCanvasProps = {
  className?: string
  selectedPlot?: number
  onPlotSelect?: (plotNumber: number) => void
  onCompassChange?: (angle: number) => void
}

type LayoutPlotMark = {
  n: number
  x: number
  y: number
  extent?: number
  extentSqYards?: number
}

const TARGET_PLOT_COUNT = BODUVALASA_LAYOUT.plotCount
const DEFAULT_PLOT_EXTENT = 133.33

function normalizeLayoutMark(mark: LayoutPlotMark): LayoutPlotMark {
  const extent = mark.extent ?? mark.extentSqYards ?? DEFAULT_PLOT_EXTENT

  return {
    ...mark,
    extent,
    extentSqYards: mark.extentSqYards ?? extent,
  }
}

function getLayoutMarks(): LayoutPlotMark[] {
  const sourceMarks = getMappedPlotMarks().map(normalizeLayoutMark)
  const marksByPlot = new Map<number, LayoutPlotMark>()

  for (const mark of sourceMarks) {
    marksByPlot.set(mark.n, mark)
  }

  return Array.from(marksByPlot.values())
    .filter((mark) => mark.n >= 1 && mark.n <= TARGET_PLOT_COUNT)
    .filter(isPlotMarkInsideBoundary)
    .sort((a, b) => a.n - b.n)
}

function BoduvalasaScene({ selectedPlot, onPlotSelect, onCompassChange }: Boduvalasa3DCanvasProps) {
  const plotMarks = useMemo(() => getLayoutMarks(), [])
  const layoutSegments = useMemo(() => getClippedLayoutSegments(), [])
  const selectedProfile = selectedPlot ? getPlotProfile(selectedPlot) : null
  const boundaryViolations = useMemo(() => getPlotBoundaryViolations(plotMarks), [plotMarks])
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls || !onCompassChange) return

    const updateCompass = () => {
      onCompassChange(controls.getAzimuthalAngle?.() ?? 0)
    }

    updateCompass()
    controls.addEventListener?.('change', updateCompass)
    return () => controls.removeEventListener?.('change', updateCompass)
  }, [onCompassChange])

  if (process.env.NODE_ENV !== 'production' && boundaryViolations.length > 0) {
    logger.warn('PlotKare layout boundary violations', boundaryViolations)
  }

  return (
    <>
      <CameraRig />
      <color attach="background" args={['#142d40']} />
      <ambientLight intensity={0.54} />
      <hemisphereLight args={['#ffffff', '#40566a', 0.58]} />
      <directionalLight position={[-4, 9, 5]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} />

      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12.2, 8.4]} />
        <meshStandardMaterial color="#31485a" roughness={0.9} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11.15, 7.45]} />
        <meshStandardMaterial color={PAPER} roughness={0.96} metalness={0.01} />
      </mesh>

      {layoutSegments.slice(0, 260).map((segment, index) => (
        <LineMesh key={`${segment.join('-')}-${index}`} segment={segment} />
      ))}

      {plotMarks.map((mark) => {
        const p = normalizedPoint(mark.x, mark.y)
        const selected = mark.n === selectedPlot
        const extentRatio = Math.min(1.2, Math.max(0.55, (mark.extent ?? 120) / 220))
        const parcelW = (selected ? 0.34 : 0.2) * extentRatio
        const parcelD = (selected ? 0.26 : 0.15) * Math.max(0.72, Math.min(1.05, extentRatio))
        const height = selected ? 0.16 : 0.035
        return (
          <group key={mark.n} position={[p.x, height / 2 + 0.08, p.z]}>
            <mesh position={[0, -height / 2 - 0.015, 0]} receiveShadow>
              <boxGeometry args={[parcelW * 1.06, 0.05, parcelD * 1.08]} />
              <meshStandardMaterial color={SOIL} roughness={0.88} metalness={0.02} />
            </mesh>
            <mesh
              castShadow
              receiveShadow
              onClick={(event) => {
                event.stopPropagation()
                onPlotSelect?.(mark.n)
              }}
              onPointerOver={(event) => {
                event.stopPropagation()
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={(event) => {
                event.stopPropagation()
                document.body.style.cursor = ''
              }}
            >
              <boxGeometry args={[parcelW, height, parcelD]} />
              <meshStandardMaterial
                color={selected ? CRIMSON : GRASS}
                roughness={selected ? 0.58 : 0.92}
                metalness={selected ? 0.12 : 0.02}
                transparent={!selected}
                opacity={selected ? 1 : 0.82}
              />
            </mesh>
            <mesh
              onClick={(event) => {
                event.stopPropagation()
                onPlotSelect?.(mark.n)
              }}
              onPointerOver={(event) => {
                event.stopPropagation()
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={(event) => {
                event.stopPropagation()
                document.body.style.cursor = ''
              }}
            >
              <boxGeometry
                args={[
                  Math.max(parcelW * 1.75, 0.28),
                  Math.max(height + 0.2, 0.22),
                  Math.max(parcelD * 1.85, 0.22),
                ]}
              />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh position={[0, height / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[parcelW * 0.86, parcelD * 0.78]} />
              <meshStandardMaterial
                color={selected ? '#9e2a4f' : '#89b86a'}
                roughness={0.96}
                metalness={0}
              />
            </mesh>
            {!selected ? (
              <mesh position={[0, height / 2 + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[parcelW * 0.6, 0.018]} />
                <meshStandardMaterial color="#d5c28e" roughness={0.9} />
              </mesh>
            ) : null}
            {selected && selectedProfile ? (
              <mesh position={[0, height / 2 + 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.max(parcelW, parcelD) * 0.55, Math.max(parcelW, parcelD) * 0.7, 32]} />
                <meshBasicMaterial color="#fff6d8" transparent opacity={0.72} />
              </mesh>
            ) : null}
          </group>
        )
      })}

      <mesh position={[0, 0.12, -3.85]} receiveShadow>
        <boxGeometry args={[10.9, 0.06, 0.22]} />
        <meshStandardMaterial color={ROAD} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 3.85]} receiveShadow>
        <boxGeometry args={[10.9, 0.06, 0.22]} />
        <meshStandardMaterial color={ROAD} roughness={0.8} />
      </mesh>
      <mesh position={[5.55, 0.15, 0]} receiveShadow>
        <boxGeometry args={[0.14, 0.08, 7.4]} />
        <meshStandardMaterial color={GOLD} roughness={0.58} metalness={0.15} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        autoRotate={false}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        target={[0, 0, 0.15]}
        minDistance={5.8}
        maxDistance={10.5}
        minPolarAngle={Math.PI / 4.8}
        maxPolarAngle={Math.PI / 2.18}
      />
    </>
  )
}

function Boduvalasa3DCanvasImpl({ className = '', selectedPlot, onPlotSelect }: Boduvalasa3DCanvasProps) {
  const [internalSelected, setInternalSelected] = useState(selectedPlot ?? 54)
  const activePlot = selectedPlot ?? internalSelected
  const selectedProfile = activePlot ? getPlotProfile(activePlot) : null
  const [zoom, setZoom] = useState(54)
  const [compassAngle, setCompassAngle] = useState(0)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const plotCount = useMemo(() => getLayoutMarks().length, [])

  const applyZoom = (nextZoom: number) => {
    const bounded = Math.max(38, Math.min(82, nextZoom))
    setZoom(bounded)
    if (cameraRef.current) {
      cameraRef.current.zoom = bounded
      cameraRef.current.updateProjectionMatrix()
    }
  }

  return (
    <div className={`relative h-[520px] min-h-[420px] overflow-hidden rounded-lg bg-[#142d40] ${className}`}>
      <Canvas
        orthographic
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.8]}
        camera={{ position: [0.2, 8.2, 6.8], zoom: 54, near: 0.1, far: 90 }}
        onCreated={({ camera }) => {
          if (camera instanceof THREE.OrthographicCamera) {
            cameraRef.current = camera
            camera.zoom = zoom
            camera.updateProjectionMatrix()
          }
        }}
        onPointerMissed={() => {
          document.body.style.cursor = ''
        }}
        style={{ height: '100%' }}
      >
        <BoduvalasaScene
          selectedPlot={activePlot}
          onPlotSelect={(plotNumber) => {
            setInternalSelected(plotNumber)
            onPlotSelect?.(plotNumber)
          }}
          onCompassChange={setCompassAngle}
        />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 rounded-sm border border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-wide text-white/55">Real layout artifact</p>
        <p className="font-sans text-sm font-semibold text-white">
          {plotCount} source-mapped boxes · {TARGET_PLOT_COUNT} total plots
        </p>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur">
        <div className="absolute left-1/2 top-2 -translate-x-1/2 font-mono text-[10px] font-bold">N</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] text-white/55">S</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-white/55">W</div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-white/55">E</div>
          <div
            className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(-50%, -50%) rotate(${LAYOUT_NORTH_DEGREES - (compassAngle * 180) / Math.PI}deg)` }}
          >
            <div className="absolute left-1/2 top-1/2 h-9 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/35" />
            <div className="absolute left-1/2 top-1/2 h-0.5 w-9 -translate-x-1/2 -translate-y-1/2 bg-white/25" />
            <div
              className="absolute left-1/2 top-0 h-5 w-3 -translate-x-1/2"
              style={{
                backgroundColor: GOLD,
                clipPath: 'polygon(50% 0%, 100% 100%, 50% 78%, 0% 100%)',
                opacity: 0.96,
              }}
            />
          </div>
        <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-white/50">
          Layout north
        </div>
      </div>
      <div className="absolute bottom-4 right-4 z-20 flex items-center overflow-hidden rounded-sm border border-white/10 bg-black/45 text-white shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => applyZoom(zoom - 8)}
          disabled={zoom <= 38}
          className="h-10 w-11 font-sans text-xl leading-none transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/25"
          aria-label="Zoom out"
        >
          -
        </button>
        <div className="min-w-16 border-x border-white/10 px-3 text-center font-mono text-[10px] uppercase tracking-wide text-white/65">
          {Math.round(((zoom - 38) / 44) * 100)}%
        </div>
        <button
          type="button"
          onClick={() => applyZoom(zoom + 8)}
          disabled={zoom >= 82}
          className="h-10 w-11 font-sans text-xl leading-none transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/25"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
      {selectedProfile ? (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-[260px] rounded-sm border border-white/10 bg-black/45 p-4 text-white shadow-xl backdrop-blur">
          <p className="mb-2 inline-flex rounded-full border border-[#C9A962]/40 bg-[#8B1538]/80 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-white">
            PLOTKARE VERIFIED
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-white/50">Selected plot</p>
          <p className="mt-1 font-serif text-2xl font-bold leading-none">Plot {selectedProfile.plotNumber}</p>
          <p className="mt-2 font-sans text-xs leading-relaxed text-white/70">
            {selectedProfile.ownerName} · {selectedProfile.facing} · {selectedProfile.roadAccess}
          </p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-white/60">
            {selectedProfile.extent} · {selectedProfile.status}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export const Boduvalasa3DCanvas = dynamic<Boduvalasa3DCanvasProps>(() => Promise.resolve(Boduvalasa3DCanvasImpl), {
  ssr: false,
  loading: () => <div className="h-full min-h-[360px] animate-pulse rounded-lg bg-[#151515]" />,
})

type BoduvalasaPlanSvgProps = {
  compact?: boolean
  className?: string
  selectedPlot?: number
  onPlotSelect?: (plotNumber: number) => void
  showBadge?: boolean
}

export function BoduvalasaPlanSvg({
  compact = false,
  className = '',
  selectedPlot,
  onPlotSelect,
  showBadge = !compact,
}: BoduvalasaPlanSvgProps) {
  const marks = getLayoutMarks()
  const layoutSegments = getClippedLayoutSegments()
  const visibleMarks = compact
    ? marks.filter((mark) => mark.n % 7 === 0 || mark.n === 1 || mark.n === 122)
    : marks
  const clipId = compact ? 'boduvalasa-layout-clip-compact' : 'boduvalasa-layout-clip'

  return (
    <svg
      viewBox={`0 0 ${BODUVALASA_LAYOUT.viewBox.width} ${BODUVALASA_LAYOUT.viewBox.height}`}
      role="img"
      aria-label="Real property layout with plot labels and proposed roads"
      className={`block w-full ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={LAYOUT_BOUNDARY.x[0]}
            y={LAYOUT_BOUNDARY.y[0]}
            width={LAYOUT_BOUNDARY.width}
            height={LAYOUT_BOUNDARY.height}
          />
        </clipPath>
      </defs>
      <rect width={BODUVALASA_LAYOUT.viewBox.width} height={BODUVALASA_LAYOUT.viewBox.height} rx="10" fill="#fffaf1" />
      <g clipPath={`url(#${clipId})`}>
        <g opacity={compact ? 0.44 : 0.68}>
          {layoutSegments.map((segment, index) => (
            <line
              key={`${segment.join('-')}-${index}`}
              x1={segment[0]}
              y1={segment[1]}
              x2={segment[2]}
              y2={segment[3]}
              stroke={INK}
              strokeWidth={compact ? 0.8 : 0.95}
              strokeLinecap="round"
            />
          ))}
        </g>
        <g>
          {visibleMarks.map((mark) => {
            const selected = mark.n === selectedPlot
            const canSelect = Boolean(onPlotSelect)
            return (
              <g
                key={mark.n}
                role={canSelect ? 'button' : undefined}
                tabIndex={canSelect ? 0 : undefined}
                aria-label={canSelect ? `Select plot ${mark.n}` : undefined}
                className={canSelect ? 'cursor-pointer outline-none' : undefined}
                onClick={
                  canSelect
                    ? () => {
                        onPlotSelect?.(mark.n)
                      }
                    : undefined
                }
                onKeyDown={
                  canSelect
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onPlotSelect?.(mark.n)
                        }
                      }
                    : undefined
                }
              >
                <title>Plot {mark.n}</title>
                <circle
                  cx={mark.x}
                  cy={mark.y}
                  r={selected ? (compact ? 7.4 : 9.6) : compact ? 5.5 : 7.2}
                  fill={selected || mark.n % 18 === 0 ? CRIMSON : '#ffffff'}
                  stroke={selected || mark.n % 18 === 0 ? CRIMSON : GOLD}
                  strokeWidth={selected ? 2.2 : 1}
                />
                <text
                  x={mark.x}
                  y={mark.y + (compact ? 2.2 : 2.9)}
                  textAnchor="middle"
                  fontSize={compact ? 5.4 : 6.8}
                  fontWeight="700"
                  fill={selected || mark.n % 18 === 0 ? '#ffffff' : INK}
                  pointerEvents="none"
                  style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                >
                  {mark.n}
                </text>
              </g>
            )
          })}
        </g>
      </g>
      {showBadge ? (
        <g transform="translate(18 20)">
          <rect width="210" height="44" rx="6" fill="rgba(255,255,255,0.84)" stroke="rgba(139,21,56,0.22)" />
          <text x="12" y="18" fill={CRIMSON} fontSize="10" fontWeight="700" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
            REAL LAYOUT DATA
          </text>
          <text x="12" y="34" fill={INK} fontSize="12" fontWeight="700" style={{ fontFamily: 'var(--font-dm-sans), system-ui' }}>
            173 plots · {BODUVALASA_LAYOUT.totalArea}
          </text>
        </g>
      ) : null}
    </svg>
  )
}

export function BoduvalasaArtifactPanel({ className = '' }: { className?: string }) {
  const [selectedPlot, setSelectedPlot] = useState(54)
  const largestPlots = [...BODUVALASA_LAYOUT.plotExtents]
    .sort((a, b) => b.extentSqYards - a.extentSqYards)
    .slice(0, 4)

  return (
    <div className={`overflow-hidden rounded-lg border border-white/10 bg-[#131313] text-white shadow-2xl ${className}`}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="min-h-[460px]">
          <Boduvalasa3DCanvas selectedPlot={selectedPlot} onPlotSelect={setSelectedPlot} />
        </div>
        <div className="border-t border-white/10 p-6 lg:border-l lg:border-t-0">
          <p className="font-mono text-xs uppercase tracking-wide text-white/45">Source document</p>
          <h3 className="mt-2 font-serif text-3xl font-bold leading-tight text-white">
            Real Property Layout Artifact
          </h3>
          <p className="mt-4 font-sans text-sm leading-relaxed text-white/62">
            Built as a product demo showing how a verified property file can become a 3D owner dashboard with
            plot-level status, road access, area intelligence, and listing readiness.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            {[
              ['Plots', `${BODUVALASA_LAYOUT.plotCount}`],
              ['Total area', BODUVALASA_LAYOUT.totalArea],
              ['Road area', BODUVALASA_LAYOUT.roadArea],
              ['Plotted area', BODUVALASA_LAYOUT.plottedArea],
            ].map(([label, value]) => (
              <div key={label} className="rounded-sm border border-white/10 bg-white/[0.04] p-3">
                <dt className="font-mono text-[10px] uppercase tracking-wide text-white/40">{label}</dt>
                <dd className="mt-1 font-sans text-sm font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-wide text-white/40">Largest plots by extent</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {largestPlots.map((plot) => (
                <span key={plot.plot} className="rounded-sm bg-white/10 px-3 py-1.5 font-mono text-xs text-white/80">
                  Plot {plot.plot}: {plot.extentSqYards} sq yd
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 bg-white/[0.03] p-4">
        <BoduvalasaPlanSvg className="max-h-[520px]" selectedPlot={selectedPlot} onPlotSelect={setSelectedPlot} />
      </div>
    </div>
  )
}
