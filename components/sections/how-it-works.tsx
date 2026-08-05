const steps = [
  {
    number: '01',
    title: 'Register the property',
    description: 'Share the address, property type, and supporting details that start the file.',
  },
  {
    number: '02',
    title: 'Verify the location',
    description: 'The submitted map pin is reviewed before it becomes the target for field work.',
  },
  {
    number: '03',
    title: 'Review the evidence',
    description: 'Reports, documents, and any follow-up are visible in your private workspace.',
  },
]

export function HowItWorksSection({
  heading = 'From property pin to',
  highlightedHeading = 'clear evidence',
}: {
  heading?: string
  highlightedHeading?: string
}) {
  return (
    <section id="how-it-works" className="premium-section-dark bg-charcoal py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <div className="premium-reveal mb-12 text-center">
          <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
            {heading} <span className="text-primary">{highlightedHeading}</span>
          </h2>
        </div>

        {/* Responsive Grid */}
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="premium-surface-dark premium-interactive group relative rounded-lg bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-white/20 lg:block" />
              )}

              <span className="font-mono text-3xl font-bold text-primary transition-all duration-500">
                {step.number}
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-white/60">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
