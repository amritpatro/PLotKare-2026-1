import Image from 'next/image'
import { FileCheck2, MapPinned, ShieldCheck } from 'lucide-react'
import { withBasePath } from '@/lib/site-config'

const evidenceItems = [
  {
    title: 'Property file',
    body: 'Documents, notes, and review status stay connected to the asset.',
    image: '/images/brand/document-stack.webp',
    alt: 'Illustrated property document stack with maroon wax seal',
    icon: FileCheck2,
  },
  {
    title: 'Location chain',
    body: 'Pins, landmarks, and field visits become a traceable location record.',
    image: '/images/brand/location-map.webp',
    alt: 'Illustrated property location map with magnifying glass and map pins',
    icon: MapPinned,
  },
  {
    title: 'Regional oversight',
    body: 'A calm operating layer for owners managing plots from another city or country.',
    image: '/images/brand/india-map.webp',
    alt: 'Illustrated India map with maroon property location pins',
    icon: ShieldCheck,
  },
]

export function EvidenceStorySection() {
  const [featured, ...supporting] = evidenceItems
  const FeaturedIcon = featured.icon

  return (
    <section className="premium-section relative overflow-hidden bg-secondary py-20 lg:py-24" aria-labelledby="evidence-story-title">
      <Image
        src={withBasePath('/images/brand/india-map.webp')}
        alt=""
        aria-hidden="true"
        width={900}
        height={600}
        className="pointer-events-none absolute -right-32 top-8 hidden max-w-[52vw] opacity-[0.07] mix-blend-multiply blur-[1px] lg:block"
      />
      <div className="mx-auto grid max-w-[1400px] gap-8 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:px-12">
        <div className="premium-reveal max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wide text-primary">Evidence chain</p>
          <h2 id="evidence-story-title" className="mt-4 font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl">
            Make land visible before decisions are made.
          </h2>
          <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-muted-foreground md:text-lg">
            PlotKare turns scattered property updates into one reviewable file: location, proof, documents, and next action.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <figure className="premium-surface premium-interactive relative min-h-[420px] overflow-hidden rounded-lg border border-border bg-white sm:col-span-2">
            <Image
              src={withBasePath(featured.image)}
              alt={featured.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover transition-transform duration-300 hover:scale-[1.02]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-6 text-white">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/12 text-accent backdrop-blur-sm">
                <FeaturedIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-serif text-2xl font-semibold">{featured.title}</h3>
              <p className="mt-2 max-w-md font-sans text-sm leading-relaxed text-white/75">{featured.body}</p>
            </figcaption>
          </figure>

          {supporting.map((item) => {
            const Icon = item.icon
            return (
              <figure
                key={item.title}
                className="premium-surface premium-interactive overflow-hidden rounded-lg border border-border bg-white"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={withBasePath(item.image)}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 24vw"
                    className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                </div>
                <figcaption className="p-5">
                  <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
