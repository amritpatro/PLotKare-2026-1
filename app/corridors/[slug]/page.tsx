import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { JsonLd } from '@/components/json-ld'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { getCorridor, getCorridorSlugs } from '@/lib/corridor-pages'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getCorridorSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getCorridor(slug)
  if (!page) return { title: 'Corridor' }
  const url = canonicalPageUrl(`/corridors/${page.slug}/`)
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      url,
      title: page.title,
      description: page.description,
      type: 'website',
      siteName: SITE_NAME,
    },
  }
}

export default async function CorridorPage({ params }: Props) {
  const { slug } = await params
  const page = getCorridor(slug)
  if (!page) notFound()

  const url = canonicalPageUrl(`/corridors/${page.slug}/`)
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalPageUrl('/') },
      { '@type': 'ListItem', position: 2, name: page.title, item: url },
    ],
  }

  return (
    <main className="min-h-screen bg-secondary">
      <JsonLd data={breadcrumbLd} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-sm text-primary">
          <Link href="/" className="hover:underline">
            ← Home
          </Link>
        </p>
        <h1 className="mt-6 font-serif text-4xl font-bold text-foreground md:text-5xl">{page.title}</h1>
        <p className="mt-4 font-sans text-lg text-muted-foreground">{page.description}</p>
        <div className="mt-10 space-y-6 font-sans text-base leading-relaxed text-foreground/90">
          {page.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </main>
  )
}
