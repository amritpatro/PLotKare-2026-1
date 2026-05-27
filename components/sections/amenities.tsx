'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { AMENITY_CATALOG } from '@/lib/amenity-catalog'
import { withBasePath } from '@/lib/site-config'

const featuredAmenities = AMENITY_CATALOG.filter((item) => item.isLocalImage).slice(0, 6)

function formatPrice(kind: 'monthly' | 'one-time', amount: number) {
  const value = new Intl.NumberFormat('en-IN').format(amount)
  return kind === 'monthly' ? 'Rs. ' + value + ' / month' : 'Rs. ' + value + ' one-time'
}

export function AmenitiesSection() {
  return (
    <section id="amenities" className="premium-section-dark bg-charcoal py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="premium-reveal mb-14 max-w-3xl"
        >
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Amenities</p>
          <h2 className="mt-3 font-serif text-4xl font-bold text-white md:text-5xl">
            Real amenity options backed by approved property assets
          </h2>
          <p className="mt-4 font-sans text-sm leading-7 text-white/65 md:text-base">
            These are the live upgrade and protection options the team can activate after review:
            boundary support, irrigation, security, storage, and income-ready additions.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featuredAmenities.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.04 }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_18px_60px_rgba(0,0,0,0.2)]"
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={withBasePath(item.image)}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized={item.isLocalImage}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80">
                  <Sparkles className="h-3.5 w-3.5 text-[#C9A962]" />
                  {item.category}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h3 className="font-serif text-2xl font-semibold text-white">{item.name}</h3>
                  <p className="mt-2 font-sans text-sm leading-6 text-white/60">
                    Service-ready amenity with real photo assets and PlotKare review flow.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Scope</span>
                  <span className="font-sans text-sm text-white/75">{formatPrice(item.kind, item.amount)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans text-xs uppercase tracking-[0.16em] text-white/45">Available after review</span>
                  <Link
                    href="/login?next=/owner/amenities"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Open catalog
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
