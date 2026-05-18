'use client'

import React, { useEffect, useLayoutEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

const GRASS = '#3f7a3c'
const WALL = '#ececee'
const TERRACOTTA = '#b85c4a'
const SOLAR = '#2f2f34'
const TREE = '#1a3d16'

function clampRatio(sizeRatio: number) {
  return Math.max(0.45, Math.min(2.8, sizeRatio))
}

function CameraRig({ sizeRatio }: { sizeRatio: number }) {
  const { camera } = useThree()
  const r = clampRatio(sizeRatio)
  useLayoutEffect(() => {
    const base = 9.2 * Math.max(1, r * 0.9)
    // Elevated three-quarter view — clearer boundary walls than corner-on symmetric shot
    camera.position.set(base * 0.72, base * 0.62, base * 0.95)
    camera.lookAt(0, 0.15, 0)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = 0.1
      camera.far = 80
      camera.fov = 42
      camera.updateProjectionMatrix()
    }
  }, [camera, r])
  return null
}

function ScaledPlotMeshes({ plotLabel, sizeRatio }: { plotLabel: string; sizeRatio: number }) {
  const r = clampRatio(sizeRatio)
  return (
    <group scale={[r, 1, r]}>
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[8, 0.12, 8]} />
        <meshStandardMaterial color={GRASS} roughness={0.88} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.28, 4.075]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.42, 0.16]} />
        <meshStandardMaterial color={WALL} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[-4.075, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.42, 8]} />
        <meshStandardMaterial color={WALL} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[4.075, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.42, 8]} />
        <meshStandardMaterial color={WALL} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[-2.4, 0.28, -4.075]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.42, 0.16]} />
        <meshStandardMaterial color={WALL} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[2.4, 0.28, -4.075]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.42, 0.16]} />
        <meshStandardMaterial color={WALL} roughness={0.55} metalness={0.05} />
      </mesh>

      {[
        [-3.95, 0.3, -3.95],
        [3.95, 0.3, -3.95],
        [-3.95, 0.3, 3.95],
        [3.95, 0.3, 3.95],
      ].map((pos, i) => (
        <mesh key={`post-${i}`} position={pos as [number, number, number]} castShadow receiveShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.52, 24]} />
          <meshStandardMaterial
            color="#1a5c1a"
            emissive="#2d8a2d"
            emissiveIntensity={0.45}
            roughness={0.35}
            metalness={0.08}
          />
        </mesh>
      ))}

      {[
        [-3, 0.45, -3.1],
        [2.9, 0.45, -2.7],
        [-2.8, 0.45, 2.9],
      ].map((pos, i) => (
        <mesh key={`tree-${i}`} position={pos as [number, number, number]} castShadow receiveShadow>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshStandardMaterial color={TREE} roughness={0.8} metalness={0.02} />
        </mesh>
      ))}

      <mesh position={[-2.9, 0.12, 2.9]} castShadow receiveShadow>
        <boxGeometry args={[1.12, 0.14, 1.12]} />
        <meshStandardMaterial color={TERRACOTTA} roughness={0.65} metalness={0.04} />
      </mesh>

      <mesh position={[2.85, 0.22, -2.85]} rotation={[-0.42, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.06, 1.22]} />
        <meshStandardMaterial color={SOLAR} metalness={0.45} roughness={0.42} />
      </mesh>

      <Html position={[0, 0.58, 0]} center distanceFactor={10}>
        <div
          className="pointer-events-none whitespace-nowrap font-mono text-base font-medium text-white select-none"
          style={{ fontFamily: 'var(--font-dm-mono), monospace', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
        >
          {plotLabel}
        </div>
      </Html>
    </group>
  )
}

function PlotSceneRoot({ plotLabel, sizeRatio }: { plotLabel: string; sizeRatio: number }) {
  return (
    <>
      <CameraRig sizeRatio={sizeRatio} />
      <color attach="background" args={['#0b0b0b']} />
      <ambientLight intensity={0.35} color="#eef2ff" />
      <hemisphereLight args={['#e8eef8', '#3d4a2a', 0.35]} position={[0, 20, 0]} />
      <directionalLight
        position={[6, 11, 5]}
        intensity={1.55}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={40}
        shadow-camera-near={1}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.00025}
      />
      <ScaledPlotMeshes plotLabel={plotLabel} sizeRatio={sizeRatio} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.65}
        enableZoom
        minDistance={7}
        maxDistance={18}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        target={[0, 0.12, 0]}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  )
}

function PlotCanvasInner({ plotLabel, sizeRatio }: { plotLabel: string; sizeRatio: number }) {
  return (
    <Canvas
      className="h-full w-full"
      shadows
      camera={{ position: [7.5, 6.5, 8.5], fov: 42, near: 0.1, far: 80 }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <PlotSceneRoot plotLabel={plotLabel} sizeRatio={sizeRatio} />
    </Canvas>
  )
}

export type Plot3DViewProps = {
  plotLabel?: string
  sizeRatio?: number
  showDragHint?: boolean
  className?: string
}

function Plot3DViewImpl({
  plotLabel = 'VZG-047',
  sizeRatio = 1,
  showDragHint = true,
  className = '',
}: Plot3DViewProps) {
  const [showHint, setShowHint] = useState(showDragHint)

  useEffect(() => {
    if (!showDragHint) {
      setShowHint(false)
      return
    }
    const timer = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(timer)
  }, [showDragHint])

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="relative min-h-0 flex-1 rounded-lg bg-[#0b0b0b]">
        <PlotCanvasInner plotLabel={plotLabel} sizeRatio={sizeRatio} />
      </div>
      {showHint && showDragHint && (
        <p
          className="mt-2 text-center font-mono text-xs text-white/50"
          style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
        >
          Drag to orbit · scroll to zoom
        </p>
      )}
    </div>
  )
}

const Plot3DViewDynamic = dynamic(() => Promise.resolve(Plot3DViewImpl), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[12rem] items-center justify-center bg-charcoal">
      <div className="text-center">
        <div className="mb-2 font-mono text-sm text-muted-foreground">Loading 3D scene…</div>
      </div>
    </div>
  ),
})

export function Plot3DView(props: Plot3DViewProps) {
  return <Plot3DViewDynamic {...props} />
}

export const Plot3DScene = Plot3DView
