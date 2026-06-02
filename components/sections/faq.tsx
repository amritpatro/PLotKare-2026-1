import type { FaqItem } from '@/lib/marketing-seo'

export function FaqSection({
  heading,
  introduction,
  items,
}: {
  heading: string
  introduction?: string
  items: FaqItem[]
}) {
  return (
    <section className="premium-section [content-visibility:auto] bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <div className="premium-reveal mb-12 text-center">
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">{heading}</h2>
          {introduction ? (
            <p className="mx-auto mt-4 max-w-2xl font-sans text-base leading-relaxed text-muted-foreground">
              {introduction}
            </p>
          ) : null}
        </div>
        <dl className="grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.question} className="premium-surface rounded-lg border border-border bg-card p-7">
              <dt className="font-serif text-xl font-semibold text-foreground">{item.question}</dt>
              <dd className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
