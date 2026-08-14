import Link from 'next/link'
import { HeroMapFrame } from '@/components/sections/hero-map-frame'

const pillars = [
  { title: 'Location review', label: 'Map pin, landmark, and access notes' },
  { title: 'Inspection record', label: 'Dated field evidence in one file' },
  { title: 'Owner workspace', label: 'Documents, reports, and follow-up' },
]

export function HeroSection({
  heading = 'Land monitoring for plots you cannot visit.',
  description = 'Verified pins, site evidence, documents, and support in one private property workspace.',
  primaryLabel = 'View 3D Plot Demo',
  secondaryLabel = 'Register My Plot',
  supportingLink,
  quickAnswer,
}: {
  heading?: string
  description?: string
  primaryLabel?: string
  secondaryLabel?: string
  supportingLink?: { href: string; label: string }
  quickAnswer?: string
}) {
  return (
    <>
      <section className="premium-hero relative isolate min-h-screen overflow-hidden bg-secondary pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,var(--secondary)_0%,var(--background)_46%,var(--secondary)_100%)]" />
        <div className="pointer-events-none absolute right-[-12%] top-24 -z-10 hidden h-[72%] w-[62%] rounded-full bg-primary/5 blur-3xl lg:block" />
        <div className="pointer-events-none absolute right-[3%] top-[16%] -z-10 hidden h-[68%] w-[54%] rounded-full bg-[radial-gradient(circle_at_center,rgba(248,246,243,0.92)_0%,rgba(248,246,243,0.58)_42%,rgba(255,255,255,0)_72%)] lg:block" />

        <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1500px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,0.84fr)_minmax(520px,1.16fr)] lg:items-center lg:px-12 lg:py-16">
          <div className="min-w-0 text-foreground">
            <h1 className="max-w-4xl font-serif text-5xl font-bold leading-[1.02] tracking-tight md:text-6xl xl:text-[4.25rem]">
              {heading}
            </h1>

            <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-muted-foreground md:text-xl">
              {description}
            </p>
            {supportingLink ? (
              <Link
                href={supportingLink.href}
                className="mt-4 inline-flex font-sans text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {supportingLink.label}
              </Link>
            ) : null}

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/demo/plot-3d/"
                prefetch={false}
                className="premium-button inline-flex min-h-12 items-center justify-center rounded-sm bg-primary px-7 py-3.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-primary/90 md:text-base"
              >
                {primaryLabel}
              </Link>
              <Link
                href="/signup/?intent=add-property"
                className="premium-button-outline inline-flex min-h-12 items-center justify-center rounded-sm border border-foreground bg-white/70 px-7 py-3.5 font-sans text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white md:text-base"
              >
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-12 grid max-w-3xl gap-x-7 gap-y-5 border-t border-foreground/10 pt-7 sm:grid-cols-3">
              {pillars.map((p) => (
                <div key={p.title}>
                  <p className="font-serif text-xl font-bold text-primary">{p.title}</p>
                  <p className="mt-1 font-sans text-sm leading-snug text-muted-foreground">{p.label}</p>
                </div>
              ))}
            </div>
          </div>

          <HeroMapFrame />
        </div>
      </section>

      {quickAnswer ? (
        <aside aria-label="PlotKare service summary" className="border-y border-border bg-secondary/70">
          <div className="mx-auto flex max-w-[1100px] gap-4 px-6 py-6 lg:px-12">
            <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <p className="font-sans text-sm leading-7 text-muted-foreground md:text-base">{quickAnswer}</p>
          </div>
        </aside>
      ) : null}
    </>
  )
}
