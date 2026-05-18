'use client'

/** Service-oriented copy only — no third-party certifications or headcounts we cannot cite. */
const trustItems = [
  'Scheduled field visits with geotagged photos',
  'Boundary and access-path checks each cycle',
  'Digital report archive you can share with family',
  'Document due-date reminders (tax, EC, registrations)',
  'One coordinator per property file',
  'Transparent pricing tiers on the site',
]

export function TrustStrip() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-white py-5">
      <div className="animate-marquee flex whitespace-nowrap">
        {[...trustItems, ...trustItems].map((item, index) => (
          <span key={index} className="flex items-center">
            <span className="px-8 font-sans text-sm font-medium text-zinc-800">{item}</span>
            <span className="text-primary/60">•</span>
          </span>
        ))}
      </div>
    </section>
  )
}
