'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  filterPublicListings,
  type ListingFilter,
  type PublicPlotListing,
} from '@/lib/public-listings'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import { withBasePath } from '@/lib/site-config'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function resolveImageUrl(imageUrl: string) {
  return imageUrl.startsWith('http') ? imageUrl : withBasePath(imageUrl)
}

const FILTERS: ListingFilter[] = [
  'All Plots',
  'Apartments',
  'Verified Plots',
  'Site Visit Ready',
  'Corner Plots',
]

function ListingCard({ plot, onViewDetails }: { plot: PublicPlotListing; onViewDetails: () => void }) {
  const gallery = (plot.imageUrls?.length ? plot.imageUrls : [plot.imageUrl]).slice(0, 4)
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="relative aspect-[16/10] w-full">
        {gallery.length > 1 ? (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
            {gallery.map((imageUrl, index) => (
              <div key={`${plot.id}-${index}`} className="relative">
                <Image
                  src={resolveImageUrl(imageUrl)}
                  alt={`Listing photo ${index + 1} for ${plot.plotNumber}`}
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 50vw, 20vw"
                />
              </div>
            ))}
          </div>
        ) : (
          <Image src={resolveImageUrl(plot.imageUrl)} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {plot.verified !== false ? <PlotKareVerifiedStamp compact tone="dark" /> : null}
          {plot.propertyKind === 'apartment' && (
            <span className="rounded-full bg-primary/90 px-2 py-0.5 font-mono text-[10px] text-white">Apartment</span>
          )}
        </div>
      </div>
      <div className="space-y-2 p-5">
        <p className="font-mono text-sm text-primary">{plot.plotNumber}</p>
        <h3 className="font-serif text-xl font-semibold text-foreground">{plot.location}</h3>
        <p className="font-sans text-xs text-muted-foreground">
          {plot.corridor ? `Location / corridor: ${plot.corridor}` : 'Location / corridor verified on request'}
        </p>
        <p className="font-sans text-sm text-muted-foreground">
          {plot.propertyKind === 'apartment'
            ? `${plot.bhk ?? '—'} BHK${plot.floorLabel ? ` · ${plot.floorLabel}` : ''}`
            : plot.sizeLabel}
          {' · '}
          {plot.facing} facing
        </p>
        <p className="font-sans text-xs text-muted-foreground">
          Seller: {plot.sellerName ?? 'PlotKare Seller'} · {plot.sellerPhone || 'Phone on request'}
        </p>
        <p className="font-mono text-sm font-bold uppercase tracking-wide text-accent">
          {plot.priceDisplay || 'Consult for pricing'}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onViewDetails}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
          >
            View Details
          </button>
          <Link
            href="/#contact"
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
          >
            Inquire Now
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function ListingsPageClient({
  initialListings,
}: {
  initialListings: PublicPlotListing[]
}) {
  const [listings, setListings] = useState<PublicPlotListing[]>(initialListings)
  const [filter, setFilter] = useState<ListingFilter>('All Plots')
  const [detailPlot, setDetailPlot] = useState<PublicPlotListing | null>(null)
  const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const refreshListings = () => {
      if (refreshTimeout.current) return
      refreshTimeout.current = setTimeout(async () => {
        refreshTimeout.current = null
        try {
          const response = await fetch('/api/public-listings', { cache: 'no-store' })
          if (!response.ok) return
          const result = (await response.json()) as { listings?: PublicPlotListing[] }
          if (result.listings) setListings(result.listings)
        } catch {
          // No-op: keep last known listings.
        }
      }, 250)
    }

    const channel = supabase
      .channel('public-listings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        refreshListings,
      )
      .subscribe()

    refreshListings()

    return () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current)
      supabase.removeChannel(channel)
    }
  }, [])

  const visible = useMemo(() => filterPublicListings(listings, filter), [listings, filter])

  return (
    <div className="min-h-screen bg-secondary pb-20 pt-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="font-mono text-sm text-primary">
          <Link href="/" className="hover:underline">
            ← Home
          </Link>
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold text-foreground md:text-5xl">
          Visakhapatnam Verified Plots &amp; Apartments
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-muted-foreground">
          Filter by verification status, site-visit readiness, corner plots, or apartments. Public cards appear only
          after PlotKare approval and publication.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 font-sans text-sm font-medium transition-colors ${
                filter === f ? 'bg-primary text-white' : 'bg-white text-foreground shadow-sm hover:bg-white/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((plot) => (
            <ListingCard key={plot.id} plot={plot} onViewDetails={() => setDetailPlot(plot)} />
          ))}
        </div>

        {visible.length === 0 && (
          <div className="mt-12 rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
            <h2 className="font-serif text-2xl font-semibold text-foreground">No verified listings are public yet</h2>
            <p className="mx-auto mt-3 max-w-xl font-sans text-muted-foreground">
              Listings become visible here after seller submission and PlotKare verification. Check back soon or contact
              the team for private advisory.
            </p>
            <Link
              href="/#contact"
              className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-sans text-sm font-semibold text-white"
            >
              Contact PlotKare
            </Link>
          </div>
        )}
      </div>

      <Dialog open={!!detailPlot} onOpenChange={(open) => !open && setDetailPlot(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-foreground">Listing details</DialogTitle>
          </DialogHeader>
          {detailPlot && (
            <div className="space-y-4">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border">
                {detailPlot.imageUrls.length > 1 ? (
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
                    {detailPlot.imageUrls.slice(0, 4).map((imageUrl, index) => (
                      <div key={`${detailPlot.id}-detail-${index}`} className="relative">
                        <Image
                          src={resolveImageUrl(imageUrl)}
                          alt={`Listing photo ${index + 1} for ${detailPlot.plotNumber}`}
                          fill
                          className="object-cover"
                          sizes="(max-width:768px) 50vw, 350px"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Image
                    src={resolveImageUrl(detailPlot.imageUrl)}
                    alt={`Listing preview for ${detailPlot.plotNumber}`}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 700px"
                  />
                )}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Plot ID:</span> {detailPlot.plotNumber}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Location / corridor:</span>{' '}
                  {detailPlot.location}
                  {detailPlot.corridor ? ` · ${detailPlot.corridor}` : ''}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Size:</span> {detailPlot.sizeLabel}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Facing:</span> {detailPlot.facing}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Seller:</span> {detailPlot.sellerName ?? 'PlotKare Seller'} ·{' '}
                  {detailPlot.sellerPhone || 'Phone on request'}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Pricing:</span> {detailPlot.priceDisplay || 'Consult for pricing'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
