'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const IndiaHeroMapLazy = dynamic(() => import('./india-hero-map').then((m) => ({ default: m.IndiaHeroMap })), {
  ssr: false,
  loading: () => <div className="h-[460px] w-full animate-pulse bg-transparent" aria-hidden />,
})

const pillars = [
  { title: 'Protect', label: 'Inspections and evidence' },
  { title: 'Track', label: 'Value and status' },
  { title: 'Grow', label: 'Optional services' },
  { title: 'Trade', label: 'Verified marketplace' },
]

export function HeroSection() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-white pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,#ffffff_0%,#ffffff_45%,#f8f6f3_100%)]" />
      <div className="pointer-events-none absolute right-[-12%] top-24 -z-10 hidden h-[72%] w-[62%] rounded-full bg-[#8B1538]/[0.035] blur-3xl lg:block" />

      <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1500px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)] lg:items-center lg:px-12 lg:py-16">
        <div className="min-w-0 text-[#1a1a1a]">
          <h1 className="max-w-4xl font-serif text-5xl font-bold leading-[1.02] tracking-tight md:text-6xl xl:text-7xl">
            Protect, Track, Grow, and Trade Property Assets
          </h1>

          <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-[#5f5f5f] md:text-xl">
            PlotKare starts from Visakhapatnam and is built to scale across India for anyone who owns a vacant plot,
            apartment, flat, or land asset. Field evidence, documents, value signals, optional services, and verified
            listings come together in one digital property layer.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/demo/plot-3d/"
              className="inline-flex min-h-12 items-center justify-center rounded-sm bg-[#8B1538] px-7 py-3.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#75112f] md:text-base"
            >
              View Land Viewer
            </Link>
            <Link
              href="/signup/?next=/dashboard&intent=add-property"
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-[#1a1a1a] bg-white/70 px-7 py-3.5 font-sans text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-white md:text-base"
            >
              Add My Property
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

        <div className="relative min-h-[420px] lg:min-h-[590px]">
          <div className="absolute inset-0 opacity-70 mix-blend-multiply lg:opacity-78">
            <IndiaHeroMapLazy />
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
    </section>
  )
}
