'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  filterPublicListings,
  type ListingFilter,
  type PublicPlotListing,
} from '@/lib/public-listings'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import { SellerPartnerStamp } from '@/components/seller-partner-stamp'
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
          {plot.verified !== false ? <PlotKareVerifiedStamp compact tone="dark" /> : null}
          {plot.sellerPartner ? <SellerPartnerStamp compact tone="dark" /> : null}
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

export default function ListingsPageClient({
  initialListings,
}: {
  initialListings: PublicPlotListing[]
}) {
  const [listings] = useState<PublicPlotListing[]>(initialListings)
  const [filter, setFilter] = useState<ListingFilter>('All Plots')

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
            <ListingCard key={plot.id} plot={plot} />
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
    </div>
  )
}
