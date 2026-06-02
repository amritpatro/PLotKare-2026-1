const steps = [
  {
    title: 'Scheduled visit',
    body: 'A coordinator routes to your plot or apartment on the agreed cadence — access paths, boundary markers, and visible structures are photographed with timestamps.',
  },
  {
    title: 'Evidence package',
    body: 'You receive dated imagery and notes in one thread — forwardable to family, counsel, or brokers without losing context.',
  },
  {
    title: 'Hygiene & reminders',
    body: 'Tax, encumbrance, and registration checkpoints surface as reminders; filings remain with your qualified professionals.',
  },
]

export function MonitoringInsightsSection({
  heading = 'How Each Inspection Cycle Works',
  introduction = 'Each cycle is intended to create dated records an authorized owner can review later, without invented testimonials or unsourced performance claims.',
}: {
  heading?: string
  introduction?: string
}) {
  return (
    <section className="premium-section bg-secondary py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="premium-reveal mb-10 max-w-3xl">
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">{heading}</h2>
          <p className="mt-3 font-sans text-sm text-muted-foreground md:text-base">
            {introduction}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="premium-surface rounded-lg border border-border bg-card p-7"
            >
              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">{`Step ${index + 1}`}</p>
              <h3 className="mt-2 font-serif text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
