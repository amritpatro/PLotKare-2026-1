import {
  ClipboardCheck,
  Handshake,
  Landmark,
  MapPinned,
  type LucideIcon,
} from 'lucide-react'

type Pillar = {
  title: string
  body: string
  stamp: string
  icon: LucideIcon
}

const pillars: Pillar[] = [
  {
    title: 'Inspection cadence',
    body: 'Repeatable checklists for boundaries, access paths, and visible encroachments — written so a family member or lawyer can follow without jargon.',
    stamp: 'FIELD CHECK',
    icon: ClipboardCheck,
  },
  {
    title: 'Legal & tax hygiene',
    body: 'Reminders for EC pulls, mutation updates, and recurring dues so small gaps do not snowball into disputes.',
    stamp: 'LEGAL CLEAN',
    icon: Landmark,
  },
  {
    title: 'Resale & income optionality',
    body: 'When you are ready to lease, build, or sell, you already have dated evidence of how the asset was maintained.',
    stamp: 'READY TO TRADE',
    icon: Handshake,
  },
  {
    title: 'Corridor familiarity',
    body: 'Structured around local growth corridors first, then expanded through repeatable field workflows for each new city.',
    stamp: 'LOCAL CORRIDOR',
    icon: MapPinned,
  },
]

export function StatisticsSection({
  heading = 'Built for Owners Who Cannot Watch Their Plot in Person',
}: {
  heading?: string
}) {
  return (
    <section id="investors" className="premium-section bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <h2 className="premium-reveal mb-12 text-center font-serif text-3xl font-bold text-foreground md:text-4xl">
          {heading}
        </h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {pillars.map((stat) => {
            const Icon = stat.icon
            return (
            <div
              key={stat.title}
              className="premium-surface group relative min-h-[280px] overflow-hidden rounded-xl border border-border bg-white/70 p-8 text-left backdrop-blur-sm"
            >
              <div
                className="pointer-events-none absolute right-5 top-5 flex h-28 w-28 -rotate-6 flex-col items-center justify-center rounded-full border-2 border-primary/30 text-primary opacity-35 transition-all duration-300 group-hover:-rotate-1 group-hover:scale-105 group-hover:opacity-50"
              >
                <Icon className="h-9 w-9" strokeWidth={1.5} />
                <span className="mt-1 text-center font-mono text-[9px] font-bold uppercase leading-tight tracking-wide">
                  {stat.stamp}
                </span>
              </div>
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <p className="relative z-10 mt-6 max-w-[75%] font-serif text-2xl font-bold leading-tight text-primary">
                {stat.title}
              </p>
              <p className="relative z-10 mt-4 font-sans text-base font-semibold leading-relaxed text-foreground/72">
                {stat.body}
              </p>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 h-1 w-full origin-left scale-x-75 bg-gradient-to-r from-primary via-accent to-transparent transition-transform duration-500 group-hover:scale-x-100"
              />
            </div>
          )})}
        </div>
      </div>
    </section>
  )
}
