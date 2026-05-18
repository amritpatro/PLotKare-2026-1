'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  DEFAULT_PUBLIC_LISTINGS,
  filterPublicListings,
  loadPublicListings,
  type ListingFilter,
  type PublicPlotListing,
} from '@/lib/public-listings'
import { withBasePath } from '@/lib/site-config'

const FILTERS: ListingFilter[] = [
  'All Plots',
  'Apartments',
  'Verified Plots',
  'Site Visit Ready',
  'Corner Plots',
]

function ListingCard({ plot }: { plot: PublicPlotListing }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="relative aspect-[16/10] w-full">
        <Image src={withBasePath(plot.imageUrl)} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white">Demo</span>
          {plot.propertyKind === 'apartment' && (
            <span className="rounded-full bg-primary/90 px-2 py-0.5 font-mono text-[10px] text-white">Apartment</span>
          )}
        </div>
      </div>
      <div className="space-y-2 p-5">
        <p className="font-mono text-sm text-primary">{plot.plotNumber}</p>
        <h3 className="font-serif text-xl font-semibold text-foreground">{plot.location}</h3>
        <p className="font-sans text-sm text-muted-foreground">
          {plot.propertyKind === 'apartment'
            ? `${plot.bhk ?? '—'} BHK${plot.floorLabel ? ` · ${plot.floorLabel}` : ''}`
            : plot.sizeLabel}
          {' · '}
          {plot.facing} facing
        </p>
        <p className="font-mono text-sm font-bold uppercase tracking-wide text-accent">Consult for pricing</p>
      </div>
    </article>
  )
}

export default function ListingsPageClient() {
  const [listings, setListings] = useState<PublicPlotListing[]>(DEFAULT_PUBLIC_LISTINGS)
  const [filter, setFilter] = useState<ListingFilter>('All Plots')

  useEffect(() => {
    const sync = () => setListings(loadPublicListings())
    sync()
    window.addEventListener('plotkare-listings-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('plotkare-listings-changed', sync)
      window.removeEventListener('storage', sync)
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
          Visakhapatnam Open Plots &amp; Apartments — Demo Listings
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-muted-foreground">
          Filter by verification status, site-visit readiness, corner plots, or apartments. Data is illustrative —
          always verify title and layout approvals with an advisor before making any commitment.
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
            <ListingCard key={plot.id} plot={plot} />
          ))}
        </div>

        {visible.length === 0 && (
          <p className="mt-12 text-center font-sans text-muted-foreground">No listings match this filter.</p>
        )}
      </div>
    </div>
  )
}
