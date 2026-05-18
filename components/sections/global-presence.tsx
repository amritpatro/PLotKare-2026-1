'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { WorldPresenceMap, type PresenceCity } from '@/components/world-presence-map'

const cities: PresenceCity[] = [
  { name: 'Houston', country: 'USA', lon: -95.3698, lat: 29.7604 },
  { name: 'New Jersey', country: 'USA', lon: -74.1724, lat: 40.7357 },
  { name: 'Toronto', country: 'Canada', lon: -79.3832, lat: 43.6532 },
  { name: 'London', country: 'UK', lon: -0.1278, lat: 51.5074 },
  { name: 'Dubai', country: 'UAE', lon: 55.2708, lat: 25.2048 },
  { name: 'Muscat', country: 'UAE', lon: 58.3829, lat: 23.588 },
  { name: 'Singapore', country: 'Singapore', lon: 103.8198, lat: 1.3521 },
  { name: 'Sydney', country: 'Australia', lon: 151.2093, lat: -33.8688 },
]

const countries = ['All', 'USA', 'UK', 'UAE', 'Australia', 'Singapore', 'Canada']

export function GlobalPresenceSection() {
  const [activeCountry, setActiveCountry] = useState('All')

  const filteredCities = useMemo(
    () => (activeCountry === 'All' ? cities : cities.filter((c) => c.country === activeCountry)),
    [activeCountry],
  )

  return (
    <section id="presence" className="bg-charcoal py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
            Visakhapatnam Plot Oversight for Owners Living Outside India
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-base text-white/55 md:text-lg">
            Map shows example cities where families often relocate from — not a client census. PlotKare is built
            for anyone who needs reliable eyes on the ground near Vizag.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto mb-10 max-w-4xl"
        >
          <WorldPresenceMap cities={filteredCities} />
          <p className="mt-3 text-center font-mono text-[10px] text-white/40">
            Country shapes: Natural Earth 110m (public domain)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-wrap justify-center gap-3"
        >
          {countries.map((country) => (
            <button
              key={country}
              type="button"
              onClick={() => setActiveCountry(country)}
              className={`rounded-full px-4 py-2 font-sans text-sm font-medium transition-colors ${
                activeCountry === country
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {country}
            </button>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto max-w-2xl text-center font-sans text-sm leading-relaxed text-white/55"
        >
          Whether you are an NRI, a metro-based Indian owner, or a local investor balancing multiple parcels, the
          workflow is the same: scheduled visits, photo evidence, and a single place to track what changed since
          last month.
        </motion.p>
      </div>
    </section>
  )
}
