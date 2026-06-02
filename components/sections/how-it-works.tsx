const steps = [
  {
    number: '01',
    title: 'List Your Plot',
    description: 'Share your plot number, location, and documents through the registration workflow.',
  },
  {
    number: '02',
    title: 'Book a Consultation',
    description: 'Choose a monitoring cadence with the team after your property location, access, and documents are reviewed.',
  },
  {
    number: '03',
    title: 'Agent Deployed',
    description:
      'A field coordinator is assigned to your plot file with a written scope — timelines depend on corridor and intake volume.',
  },
  {
    number: '04',
    title: 'Services Activated',
    description: 'Approved services, document review, and property tracking become visible in your workspace.',
  },
  {
    number: '05',
    title: 'Track History',
    description: 'Your account preserves submitted records, statuses, and follow-up activity for future reference.',
  },
]

export function HowItWorksSection({
  heading = 'How Plot Monitoring Works:',
  highlightedHeading = 'Five Steps',
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="premium-surface-dark group relative rounded-lg bg-white/5 p-6 transition-all duration-500 hover:bg-white/10"
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
