import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

type NewsItem = {
  href: string
  date: string
  headline: string
  excerpt: string
}

const news: NewsItem[] = [
  {
    href: '/blog/how-to-protect-your-plot-from-encroachment-india/',
    date: 'May 2026',
    headline: 'How to protect a vacant plot from encroachment in India',
    excerpt: 'A practical guide to boundary evidence, inspection cadence, and escalation records.',
  },
  {
    href: '/blog/ec-certificate-renewal-and-property-document-checklist/',
    date: 'May 2026',
    headline: 'EC certificate and property document checklist for owners',
    excerpt: 'Records to organize before inspection, transfer, finance, or a verified listing.',
  },
  {
    href: '/blog/from-vizag-launch-to-national-property-management/',
    date: 'May 2026',
    headline: 'From local field operations to national property management',
    excerpt: 'How an inspection and documentation workflow can expand responsibly across cities.',
  },
]

export function NewsroomSection({
  heading = 'Plot Management Guides and',
  accentedHeading = 'Market Notes',
  items = news,
}: {
  heading?: string
  accentedHeading?: string
  items?: NewsItem[]
}) {
  return (
    <section className="premium-section [content-visibility:auto] bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="premium-reveal mb-16">
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            {heading} <span className="text-primary">{accentedHeading}</span>
          </h2>
          <p className="mt-3 max-w-2xl font-sans text-sm text-muted-foreground">
            Longer reads live on the{' '}
            <Link href="/blog/" prefetch={false} className="font-medium text-primary hover:underline">
              blog index
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.href}
              className="premium-interactive group rounded-lg border border-transparent p-4"
            >
              <p className="font-mono text-sm text-muted-foreground">{item.date}</p>
              <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                <Link href={item.href} prefetch={false}>{item.headline}</Link>
              </h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">{item.excerpt}</p>
              <Link
                href={item.href}
                prefetch={false}
                className="mt-4 inline-flex items-center gap-2 text-primary transition-transform group-hover:translate-x-1"
              >
                <span className="font-sans text-sm font-medium">{`Read: ${item.headline}`}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
