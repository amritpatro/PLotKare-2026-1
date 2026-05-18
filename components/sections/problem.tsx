'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Eye, FileWarning, TrendingDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const painPoints = [
  {
    number: '01',
    icon: AlertTriangle,
    title: 'Encroachment and Boundary Disputes',
    description: 'Vacant plots need dated boundary evidence before small changes become accepted as normal.',
    detail:
      'PlotKare keeps a field record of visible boundaries, access paths, neighbouring activity, and material dumping so owners have evidence to discuss with family, surveyors, or counsel.',
  },
  {
    number: '02',
    icon: FileWarning,
    title: 'Legal Compliance and Document Expiry',
    description: 'EC, tax, mutation, registration, and deed reminders should not live in scattered chats.',
    detail:
      'A property file gives every asset a single place for document status, upcoming reminders, and notes from field or legal follow-up.',
  },
  {
    number: '03',
    icon: TrendingDown,
    title: 'Property Value Uncertainty',
    description: 'Owners need a digital way to understand value before they build, lease, hold, buy, or sell.',
    detail:
      'Inspection history, plot extents, location context, and marketplace readiness make the property easier to evaluate than a broker-only estimate.',
  },
  {
    number: '04',
    icon: Eye,
    title: 'No Reliable Eyes on the Asset',
    description: 'NRIs, metro owners, and local families all face the same risk: stale information.',
    detail:
      'The platform starts in Visakhapatnam and is designed to scale across India through verified local operations, not informal one-off updates.',
  },
]

export function ProblemSection() {
  const [active, setActive] = useState<(typeof painPoints)[number] | null>(null)

  return (
    <section id="about" className="bg-charcoal py-16 lg:py-20">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(520px,1.14fr)] lg:items-center lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2 className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
              Property Risk Becomes Manageable When Every Asset Has a Current Record.
            </h2>
            <p className="mt-6 max-w-lg font-sans text-lg leading-relaxed text-white/60">
              The problem is not only distance. It is the gap between what the owner thinks is true and what is
              actually happening on the ground, in documents, and in the market.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {painPoints.map((point) => {
              const Icon = point.icon
              return (
                <button
                  key={point.number}
                  type="button"
                  onClick={() => setActive(point)}
                  className="relative min-h-[190px] overflow-hidden rounded-lg bg-white/5 p-6 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span className="absolute -right-2 -top-4 font-mono text-7xl font-bold text-white/5">
                    {point.number}
                  </span>
                  <div className="relative">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 font-serif text-xl font-semibold text-white">{point.title}</h3>
                    <p className="font-sans text-sm leading-relaxed text-white/60">{point.description}</p>
                    <p className="mt-4 font-mono text-xs uppercase tracking-wide text-accent">Open brief</p>
                  </div>
                </button>
              )
            })}
          </motion.div>
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
            <DialogDescription className="pt-2 font-sans text-sm leading-relaxed">
              {active?.detail}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  )
}
