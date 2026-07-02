'use client'

import { Compass, Route, Ruler, ShieldCheck, UserRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BODUVALASA_LAYOUT } from '@/lib/boduvalasa-layout'
import { getMappedPlotNumbers, getPlotProfile } from '@/lib/plot-profile'
import { withBasePath } from '@/lib/site-config'

const stats = [
  { label: 'Total plots', value: String(BODUVALASA_LAYOUT.plotCount) },
  { label: 'Total area', value: BODUVALASA_LAYOUT.totalArea },
  { label: 'Road area', value: BODUVALASA_LAYOUT.roadArea },
  { label: 'Plotted area', value: BODUVALASA_LAYOUT.plottedArea },
]

const mappedPlotNumbers = new Set<number>(getMappedPlotNumbers())
const quickPlots = [18, 35, 54, 72, 90, 108, 118, 121, 122].filter((plot) => mappedPlotNumbers.has(plot))

export function PlotVisualizationSection({
  sectionId = 'plot-layout',
  heading = 'Real Plot Layout:',
  accentHeading = '3D Property File for Every Owner',
  description = 'Source-mapped layout geometry, road linework, plot counts, and area data form an owner-facing digital snapshot with facing, access, size, and current review status.',
}: {
  sectionId?: string | null
  heading?: string
  accentHeading?: string
  description?: string
}) {
  const [selectedPlot, setSelectedPlot] = useState(54)
  const selectedProfile = useMemo(() => getPlotProfile(selectedPlot), [selectedPlot])

  return (
    <section id={sectionId ?? undefined} className="premium-section bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(520px,1.15fr)] lg:gap-16">
          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl">
              {heading}
              <br />
              <span className="text-primary">{accentHeading}</span>
            </h2>
            <p className="mt-6 max-w-md font-sans text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-sandy" />
                <span className="font-sans text-sm text-muted-foreground">3D terrain</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-primary" />
                <span className="font-sans text-sm text-muted-foreground">Selected plot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-accent" />
                <span className="font-sans text-sm text-muted-foreground">Area data</span>
              </div>
            </div>

            <div className="premium-surface mt-10 rounded-lg border border-border bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-primary">
                    PLOTKARE VERIFIED
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Selected plot</p>
                  <h3 className="mt-1 font-serif text-3xl font-bold text-primary">
                    Plot {selectedProfile?.plotNumber ?? selectedPlot}
                  </h3>
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 p-3 text-primary">
                  <Compass className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Owner Name', value: selectedProfile?.ownerName ?? 'Mapped record pending', icon: UserRound },
                  { label: 'Facing', value: selectedProfile?.facing ?? 'Mapped record pending', icon: Compass },
                  { label: 'Road Access', value: selectedProfile?.roadAccess ?? 'Mapped record pending', icon: Route },
                  { label: 'Plot Size', value: selectedProfile?.extent ?? 'Mapped record pending', icon: Ruler },
                  { label: 'Status', value: selectedProfile?.status ?? 'Mapped record pending', icon: ShieldCheck },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="rounded-sm border border-border bg-secondary/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                      <dt className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.label}
                      </dt>
                      <dd className="mt-1 font-sans text-sm font-semibold text-foreground">{item.value}</dd>
                    </div>
                  )
                })}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {quickPlots.map((plot) => (
                  <button
                    key={plot}
                    type="button"
                    onClick={() => setSelectedPlot(plot)}
                    className={`premium-interactive rounded-sm border px-3 py-2 font-mono text-xs transition-colors ${
                      selectedPlot === plot
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-white text-muted-foreground'
                    }`}
                  >
                    {plot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <div className="absolute inset-x-8 -bottom-5 h-10 rounded-full bg-black/15 blur-xl" />
              <div className="premium-surface-dark relative h-[560px] overflow-hidden rounded-xl border border-foreground/10 bg-[#151515] p-3 shadow-2xl">
                <Image
                  src={withBasePath('/images/boduvalasa-layout-preview.webp')}
                  alt="Source-mapped Boduvalasa layout preview with real plot geometry and roads"
                  fill
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  loading="lazy"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-6 pb-6 pt-20">
                  <p className="max-w-md font-sans text-sm leading-relaxed text-white/75">
                    Open the source-mapped layout to inspect plots, roads, compass direction, and plot-level records.
                  </p>
                  <Link
                    href="/demo/layout-3d/"
                    prefetch={false}
                    className="mt-4 inline-flex rounded-sm bg-primary px-5 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Open Interactive 3D Viewer
                  </Link>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((item) => (
                <div key={item.label} className="premium-surface rounded-lg border border-border bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-sans text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
