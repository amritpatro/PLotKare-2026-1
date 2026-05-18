import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { getAllPosts } from '@/lib/blog-posts'

export const metadata: Metadata = {
  title: 'Property Asset Protection and Growth Guides | PlotKare Blog',
  description:
    'Guides for property owners who want to protect vacant plots, manage documents, track value, grow idle assets, and prepare verified listings.',
  alternates: { canonical: canonicalPageUrl('/blog/') },
  openGraph: {
    url: canonicalPageUrl('/blog/'),
    title: `Property asset guides | ${SITE_NAME}`,
    description: 'Research-style articles for plot, apartment, flat, and land owners across India.',
    type: 'website',
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const featured = posts[0]
  const remaining = posts.slice(1)

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <p className="font-mono text-sm text-primary">
          <Link href="/" className="hover:underline">
            Back to Home
          </Link>
        </p>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <h1 className="font-serif text-5xl font-bold leading-tight text-foreground md:text-6xl">
              Property Owner Intelligence
            </h1>
            <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-muted-foreground">
              Practical guides for protecting property assets, keeping documents ready, growing idle land, and making
              verified buying or selling decisions.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['Protect', 'Track', 'Grow'].map((item) => (
              <div key={item} className="rounded-sm border border-border bg-secondary p-4">
                <p className="font-serif text-xl font-semibold text-primary">{item}</p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                  Owner-ready workflows for real property decisions.
                </p>
              </div>
            ))}
          </div>
        </div>

        <Link
          href={`/blog/${featured.slug}/`}
          className="mt-14 grid gap-8 rounded-lg border border-border bg-secondary p-6 shadow-sm lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-8"
        >
          <div className="flex min-h-[260px] flex-col justify-between rounded-sm bg-foreground p-6 text-white">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-white/50">{featured.category}</p>
              <p className="mt-2 font-sans text-sm text-white/62">{featured.readTime}</p>
            </div>
            <p className="font-mono text-xs uppercase tracking-wide text-white/50">Featured guide</p>
          </div>
          <div className="self-center">
            <p className="font-mono text-xs text-muted-foreground">{featured.datePublished}</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-foreground">{featured.title}</h2>
            <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-muted-foreground">
              {featured.description}
            </p>
            <span className="mt-6 inline-block font-sans text-sm font-semibold text-primary">Read article</span>
          </div>
        </Link>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {remaining.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}/`}
              className="rounded-lg border border-border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-sm bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-primary">
                  {post.category}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{post.readTime}</span>
              </div>
              <h2 className="mt-5 font-serif text-2xl font-semibold leading-tight text-foreground">{post.title}</h2>
              <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">{post.description}</p>
              <p className="mt-5 font-mono text-xs text-muted-foreground">{post.datePublished}</p>
            </Link>
          ))}
        </div>

        <p className="mt-12 max-w-3xl border-t border-border pt-8 font-sans text-sm leading-relaxed text-muted-foreground">
          The blog now supports the platform positioning beyond one city or owner type: property protection, digital
          value tracking, verified ownership records, income add-ons, and marketplace readiness.
        </p>
      </div>
    </main>
  )
}
