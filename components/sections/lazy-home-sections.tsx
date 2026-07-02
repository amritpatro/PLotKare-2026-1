'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PublicPlotListing } from '@/lib/public-listings'

const PlotVisualizationSection = dynamic(
  () => import('@/components/sections/plot-visualization').then((module) => module.PlotVisualizationSection),
  { ssr: false },
)

const LandUtilisationSection = dynamic(
  () => import('@/components/sections/land-utilisation').then((module) => module.LandUtilisationSection),
  { ssr: false },
)

const AvailablePlotsShowcaseSection = dynamic(
  () => import('@/components/sections/available-plots-showcase').then((module) => module.AvailablePlotsShowcaseSection),
  { ssr: false },
)

function SectionPlaceholder({
  tone,
  minHeight,
}: {
  tone: 'light' | 'secondary' | 'dark'
  minHeight: number
}) {
  const background = tone === 'dark' ? 'bg-charcoal' : tone === 'secondary' ? 'bg-secondary' : 'bg-white'

  return (
    <section className={`${background} py-20`} style={{ minHeight }} aria-hidden="true">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="h-2 w-24 rounded-full bg-primary/20" />
      </div>
    </section>
  )
}

function LazyMount({
  id,
  children,
  minHeight,
  tone,
}: {
  id?: string
  children: ReactNode
  minHeight: number
  tone: 'light' | 'secondary' | 'dark'
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '900px 0px' },
    )

    const node = ref.current
    if (node) observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={ref} id={id}>
      {visible ? children : <SectionPlaceholder tone={tone} minHeight={minHeight} />}
    </div>
  )
}

export function LazyPlotVisualizationSection() {
  return (
    <LazyMount id="plot-layout" tone="secondary" minHeight={900}>
      <PlotVisualizationSection sectionId={null} />
    </LazyMount>
  )
}

export function LazyLandUtilisationSection() {
  return (
    <LazyMount tone="light" minHeight={760}>
      <LandUtilisationSection />
    </LazyMount>
  )
}

export function LazyAvailablePlotsShowcaseSection({
  initialListings,
}: {
  initialListings: PublicPlotListing[]
}) {
  return (
    <LazyMount tone="dark" minHeight={850}>
      <AvailablePlotsShowcaseSection initialListings={initialListings} />
    </LazyMount>
  )
}
