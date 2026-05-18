'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

const news = [
  {
    slug: 'nri-plot-inspection-visakhapatnam-guide',
    date: 'April 2026',
    headline: 'New guide: NRI plot inspection checklist for Visakhapatnam owners',
    excerpt: 'What to demand in every field report — four-sided photos, access paths, and escalation wording.',
  },
  {
    slug: 'encroachment-prevention-vizag-boundaries',
    date: 'March 2026',
    headline: 'Encroachment prevention: early signals on Vizag boundaries',
    excerpt: 'Why low-drama monitoring beats high-drama court timelines for coastal layouts.',
  },
  {
    slug: 'andhra-pradesh-land-documents-checklist',
    date: 'February 2026',
    headline: 'AP land documents checklist for out-of-town owners',
    excerpt: 'Keep EC, tax, and mutation threads aligned with inspection dates.',
  },
]

export function NewsroomSection() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            Visakhapatnam Plot News, Guides &amp; <span className="text-primary">Market Notes</span>
          </h2>
          <p className="mt-3 max-w-2xl font-sans text-sm text-muted-foreground">
            Longer reads live on the{' '}
            <Link href="/blog/" className="font-medium text-primary hover:underline">
              blog index
            </Link>
            .
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {news.map((item, index) => (
            <motion.article
              key={item.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <p className="font-mono text-sm text-muted-foreground">{item.date}</p>
              <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                <Link href={`/blog/${item.slug}/`}>{item.headline}</Link>
              </h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">{item.excerpt}</p>
              <Link
                href={`/blog/${item.slug}/`}
                className="mt-4 inline-flex items-center gap-2 text-primary transition-transform group-hover:translate-x-1"
              >
                <span className="font-sans text-sm font-medium">Read on blog</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
