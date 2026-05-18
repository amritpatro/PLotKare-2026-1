'use client'

import { motion } from 'framer-motion'
import { Compass, Route, Ruler, ShieldCheck, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BODUVALASA_LAYOUT } from '@/lib/boduvalasa-layout'
import { Boduvalasa3DCanvas } from '@/components/boduvalasa-artifact'
import { getPlotProfile } from '@/lib/plot-profile'

const stats = [
  { label: 'Total plots', value: String(BODUVALASA_LAYOUT.plotCount) },
  { label: 'Total area', value: BODUVALASA_LAYOUT.totalArea },
  { label: 'Road area', value: BODUVALASA_LAYOUT.roadArea },
  { label: 'Plotted area', value: BODUVALASA_LAYOUT.plottedArea },
]

const quickPlots = [18, 35, 54, 72, 90, 108, 126, 144, 173]

export function PlotVisualizationSection() {
  const [selectedPlot, setSelectedPlot] = useState(54)
  const selectedProfile = useMemo(() => getPlotProfile(selectedPlot), [selectedPlot])

  return (
    <section id="plot-layout" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(520px,1.15fr)] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2 className="font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Real Plot Layout Intelligence
              <br />
              <span className="text-primary">A 3D Property File for Every Owner.</span>
            </h2>
            <p className="mt-6 max-w-md font-sans text-lg leading-relaxed text-muted-foreground">
              The placeholder plot view has been replaced with real layout geometry, road linework, plot counts,
              and area data. Each plot becomes an owner-ready digital snapshot with facing, access, size, and
              current status.
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

            <div className="mt-10 rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-primary">
                    PLOTKARE VERIFIED
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Selected plot</p>
                  <h3 className="mt-1 font-serif text-3xl font-bold text-primary">Plot {selectedProfile.plotNumber}</h3>
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 p-3 text-primary">
                  <Compass className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Owner Name', value: selectedProfile.ownerName, icon: UserRound },
                  { label: 'Facing', value: selectedProfile.facing, icon: Compass },
                  { label: 'Road Access', value: selectedProfile.roadAccess, icon: Route },
                  { label: 'Plot Size', value: selectedProfile.extent, icon: Ruler },
                  { label: 'Status', value: selectedProfile.status, icon: ShieldCheck },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="rounded-sm border border-border bg-secondary/60 p-3">
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
                    className={`rounded-sm border px-3 py-2 font-mono text-xs transition-colors ${
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="space-y-6"
          >
            <div className="relative">
              <div className="absolute inset-x-8 -bottom-5 h-10 rounded-full bg-black/15 blur-xl" />
              <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-[#151515] p-3 shadow-2xl">
                <Boduvalasa3DCanvas
                  selectedPlot={selectedPlot}
                  onPlotSelect={setSelectedPlot}
                  className="h-[560px] rounded-lg"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-sans text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
