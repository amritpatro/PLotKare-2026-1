'use client'

import { motion } from 'framer-motion'

/** Replace with real certifications only after they are issued and citeable. */
const governance = [
  {
    title: 'Written scope before billing',
    description: 'You receive what each visit covers — boundaries, access paths, visible structures — before the first field cycle.',
    tag: 'Process',
  },
  {
    title: 'Photo archive per cycle',
    description: 'Reports are designed to be forwarded to counsel or family without re-shooting the plot on your next India trip.',
    tag: 'Evidence',
  },
  {
    title: 'Escalation path on anomalies',
    description: 'When something changes between visits, the next report calls it out with what was observed and what options you can pursue.',
    tag: 'Accountability',
  },
  {
    title: 'RERA / registrations',
    description: 'Ask us for current registration numbers and AP RERA filing status for marketing claims — we do not publish credentials we cannot verify on demand.',
    tag: 'Compliance',
  },
]

export function AwardsSection() {
  return (
    <section className="bg-charcoal py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
            Visakhapatnam Plot Oversight: Evidence, Scope, and Escalation
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-sm text-white/55">
            Awards and paid “summit” badges belong here only when they are real and linkable.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {governance.map((row, index) => (
            <motion.div
              key={row.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex gap-6 border-l-2 border-accent pl-6"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-accent font-mono text-sm font-bold text-charcoal">
                {index + 1}
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-white">{row.title}</h3>
                <p className="mt-2 font-sans text-sm text-white/60">{row.description}</p>
                <p className="mt-2 font-mono text-sm text-primary">{row.tag}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
