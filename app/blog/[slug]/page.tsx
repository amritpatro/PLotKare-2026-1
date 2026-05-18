import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { JsonLd } from '@/components/json-ld'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { getAllSlugs, getPostBySlug } from '@/lib/blog-posts'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: 'Article' }
  const url = canonicalPageUrl(`/blog/${post.slug}/`)
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.datePublished,
      siteName: SITE_NAME,
    },
  }
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const url = canonicalPageUrl(`/blog/${post.slug}/`)
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  return (
    <article className="min-h-screen bg-white">
      <JsonLd data={articleLd} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-sm text-primary">
          <Link href="/blog/" className="hover:underline">
            Back to Blog
          </Link>
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-sm bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-primary">
            {post.category}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{post.readTime}</span>
          <span className="font-mono text-xs text-muted-foreground">{post.datePublished}</span>
        </div>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl">{post.title}</h1>
        <p className="mt-6 font-sans text-lg text-muted-foreground">{post.description}</p>
        <div className="prose prose-neutral mt-12 max-w-none font-sans text-base leading-relaxed text-foreground">
          {post.paragraphs.map((p, i) => (
            <p key={i} className="mb-6">
              {p}
            </p>
          ))}
        </div>
      </div>
    </article>
  )
}
