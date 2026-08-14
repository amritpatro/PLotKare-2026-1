const steps = [
  {
    number: 'Photo proof',
    title: 'Geotagged site evidence',
    description: 'Boundary, access, approach road, and visible changes captured against the reviewed location.',
  },
  {
    number: 'Field note',
    title: 'A readable inspection summary',
    description: 'The visit becomes a short status record your family, advisor, or operations team can understand.',
  },
  {
    number: 'Next action',
    title: 'Issues routed for follow-up',
    description: 'Concerns can move into support, document review, owner approval, or marketplace readiness.',
  },
]

export function HowItWorksSection({
  heading = 'What you receive after',
  highlightedHeading = 'every visit',
}: {
  heading?: string
  highlightedHeading?: string
}) {
  return (
    <section id="how-it-works" className="premium-section bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <div className="premium-reveal mb-12 max-w-2xl">
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            {heading} <span className="text-primary">{highlightedHeading}</span>
          </h2>
        </div>

        {/* Responsive Grid */}
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="premium-surface premium-interactive group relative min-h-[240px] rounded-lg border border-border bg-secondary p-7 transition-colors hover:bg-white"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-primary/20 lg:block" />
              )}

              <span className="font-mono text-xs font-semibold uppercase tracking-wide text-primary transition-all duration-500">
                {step.number}
              </span>
              <h3 className="mt-5 font-serif text-2xl font-semibold leading-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
