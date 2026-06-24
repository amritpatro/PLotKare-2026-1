const steps = [
  {
    title: 'Geotagged evidence',
    body: 'Dated photographs preserve the visible condition of boundaries, access paths, nearby activity, and structures observed during the visit.',
  },
  {
    title: 'Inspection report',
    body: 'Photographs, notes, timestamps, and the inspection status stay together in a report that authorized owners can review and share.',
  },
  {
    title: 'Issue alerts',
    body: 'Material changes or follow-up needs are called out clearly so owners can decide whether to involve family, surveyors, counsel, or local support.',
  },
]

export function MonitoringInsightsSection({
  heading = 'What You Receive After Every Visit',
  introduction = 'Each completed visit adds practical, dated evidence to the property file without invented testimonials or unsourced performance claims.',
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
              className="premium-surface premium-interactive rounded-lg border border-border bg-card p-7"
            >
              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">{`Included ${index + 1}`}</p>
              <h3 className="mt-2 font-serif text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
