import Link from 'next/link'
import { HeroMapFrame } from '@/components/sections/hero-map-frame'

const pillars = [
  { title: 'Protect', label: 'Inspections and evidence' },
  { title: 'Track', label: 'Value and status' },
  { title: 'Grow', label: 'Optional services' },
  { title: 'Trade', label: 'Verified marketplace' },
]

export function HeroSection({
  heading = 'Manage, Monitor, and Protect Your Plot From Anywhere in India',
  description = 'PlotKare is a plot management and property monitoring platform for Indian landowners who cannot personally watch their plots. Field inspections, document tracking, issue reporting, and a verified marketplace come together in one platform, whether you own one plot or a portfolio. Starting from Visakhapatnam, expanding across India.',
  primaryLabel = 'See Real Plot Layout',
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
      <section className="premium-hero relative isolate min-h-screen overflow-hidden bg-white pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,#ffffff_0%,#ffffff_44%,#f8f6f3_100%)]" />
        <div className="pointer-events-none absolute right-[-12%] top-24 -z-10 hidden h-[72%] w-[62%] rounded-full bg-[#8B1538]/[0.035] blur-3xl lg:block" />
        <div className="pointer-events-none absolute right-[3%] top-[16%] -z-10 hidden h-[68%] w-[54%] rounded-full bg-[radial-gradient(circle_at_center,rgba(248,246,243,0.92)_0%,rgba(248,246,243,0.58)_42%,rgba(255,255,255,0)_72%)] lg:block" />

        <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1500px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,0.84fr)_minmax(520px,1.16fr)] lg:items-center lg:px-12 lg:py-16">
          <div className="min-w-0 text-[#1a1a1a]">
            <h1 className="max-w-4xl font-serif text-5xl font-bold leading-[1.02] tracking-tight md:text-6xl xl:text-[4.25rem]">
              {heading}
            </h1>

            <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-[#5f5f5f] md:text-xl">
              {description}
            </p>
            {supportingLink ? (
              <Link
                href={supportingLink.href}
                className="mt-4 inline-flex font-sans text-sm font-medium text-[#8B1538] underline-offset-4 hover:underline"
              >
                {supportingLink.label}
              </Link>
            ) : null}

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/demo/plot-3d/"
                prefetch={false}
                className="premium-button inline-flex min-h-12 items-center justify-center rounded-sm bg-[#8B1538] px-7 py-3.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#75112f] md:text-base"
              >
                {primaryLabel}
              </Link>
              <Link
                href="/signup/?intent=add-property"
                className="premium-button-outline inline-flex min-h-12 items-center justify-center rounded-sm border border-[#1a1a1a] bg-white/70 px-7 py-3.5 font-sans text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-white md:text-base"
              >
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-14 grid max-w-3xl grid-cols-2 gap-x-7 gap-y-5 border-t border-[#1a1a1a]/10 pt-8 md:grid-cols-4">
              {pillars.map((p) => (
                <div key={p.title}>
                  <p className="font-serif text-xl font-bold text-[#8B1538]">{p.title}</p>
                  <p className="mt-1 font-sans text-sm leading-snug text-[#5f5f5f]">{p.label}</p>
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
