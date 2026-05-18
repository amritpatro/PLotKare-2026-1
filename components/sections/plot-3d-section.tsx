'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { BoduvalasaArtifactPanel } from '@/components/boduvalasa-artifact'

export function Plot3DSection() {
  return (
    <section id="actual-plot" className="bg-charcoal py-16 lg:py-24">
      <div className="mx-auto max-w-[1500px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-12 max-w-4xl"
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-accent">
            Real layout converted into a product artifact
          </p>
          <h2 className="mt-4 font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
            3D Land Viewer Built for Real Property Files
          </h2>
          <p className="mt-5 max-w-3xl font-sans text-base leading-relaxed text-white/62 md:text-lg">
            The placeholder plot has been replaced with real layout geometry: plot extents, road linework, 173 plot
            labels, total area, road area, and plotted area. This is the product direction: any verified property file
            can become an interactive digital asset before it is protected, grown, bought, or sold.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/demo/plot-3d/"
              className="inline-flex rounded-sm border border-white/25 px-5 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Open old simple demo
            </Link>
            <Link
              href="/signup/"
              className="inline-flex rounded-sm bg-accent px-5 py-3 font-sans text-sm font-semibold text-charcoal transition-opacity hover:opacity-90"
            >
              Add my property
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.08 }}
        >
          <BoduvalasaArtifactPanel />
        </motion.div>
      </div>
    </section>
  )
}
