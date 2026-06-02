import type { Metadata } from 'next'
import Link from 'next/link'
import { Boduvalasa3DCanvas } from '@/components/boduvalasa-artifact'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Interactive source-mapped property layout',
  description:
    'Inspect a source-mapped property layout with plot geometry, road linework, compass direction, and plot-level records.',
  alternates: { canonical: canonicalPageUrl('/demo/layout-3d/') },
  openGraph: {
    url: canonicalPageUrl('/demo/layout-3d/'),
    title: `Interactive source-mapped property layout | ${SITE_NAME}`,
    description: 'Interactive 3D preview of a PlotKare source-mapped property file.',
    type: 'website',
    siteName: SITE_NAME,
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function Layout3DDemoPage() {
  return (
    <main className="min-h-screen bg-charcoal text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
        <p className="font-mono text-sm text-white/60">
          <Link href="/#plot-layout" className="text-primary hover:underline">
            &larr; Back to home
          </Link>
        </p>
        <div>
          <h1 className="font-serif text-3xl font-bold md:text-4xl">Source-mapped property layout</h1>
          <p className="mt-3 max-w-3xl font-sans text-sm leading-relaxed text-white/65 md:text-base">
            Inspect the mapped plot geometry, proposed roads, compass direction, and plot-level records. This product
            artifact is designed for property-file review and is not a cadastral survey substitute.
          </p>
        </div>
        <Boduvalasa3DCanvas className="h-[min(78vh,760px)] min-h-[560px]" />
      </div>
    </main>
  )
}
