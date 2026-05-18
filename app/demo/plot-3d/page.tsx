import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Plot3DScene } from '@/components/plot-3d-scene'
import { PlotDemoQueryHint } from '@/components/demo-plot-query-hint'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Interactive 3D plot demo (no login)',
  description:
    'Rotate a stylised Visakhapatnam plot model in the browser — no account required. Geometry is illustrative, not a survey substitute.',
  alternates: { canonical: canonicalPageUrl('/demo/plot-3d/') },
  openGraph: {
    url: canonicalPageUrl('/demo/plot-3d/'),
    title: `3D plot demo | ${SITE_NAME}`,
    description: 'Public WebGL preview of PlotKare’s plot visualisation style.',
    type: 'website',
    siteName: SITE_NAME,
  },
}

export default function Plot3DDemoPage() {
  return (
    <main className="min-h-screen bg-charcoal text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <p className="font-mono text-sm text-white/60">
          <Link href="/" className="text-primary hover:underline">
            ← Back to home
          </Link>
        </p>
        <div>
          <h1 className="font-serif text-3xl font-bold md:text-4xl">Visakhapatnam plot 3D demo</h1>
          <p className="mt-3 max-w-2xl font-sans text-sm text-white/60 md:text-base">
            Drag to orbit and scroll to zoom. This is a simplified model for communication — not a cadastral survey.
            Owner dashboard features may differ.
          </p>
          <Suspense fallback={null}>
            <div className="mt-3">
              <PlotDemoQueryHint />
            </div>
          </Suspense>
        </div>
        <div className="h-[min(70vh,560px)] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b]">
          <Plot3DScene showDragHint className="h-full" />
        </div>
      </div>
    </main>
  )
}
