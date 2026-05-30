'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlotTopdownSvg } from '@/components/plot-topdown-svg'
import { PlotKareVerifiedStamp } from '@/components/plotkare-verified-stamp'
import {
  getLandingShowcaseListings,
  type PublicPlotListing,
} from '@/lib/public-listings'
import { withBasePath } from '@/lib/site-config'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const CRIMSON = '#C0392B'
const GOLD = '#F59E0B'
const VERIFICATION_CHECKLIST = [
  'Real property photos from the owner or a PlotKare employee, not stock imagery.',
  'Boundary, frontage, and approach-road photos with a clear current site condition.',
  'Location pin, nearest landmark, and survey or layout reference for the exact parcel.',
  'Vastu and facing notes verified with the owner before publication.',
  'Title, tax, and approval documents uploaded before the listing is marked public.',
] as const

function resolveImageUrl(imageUrl: string) {
  return imageUrl.startsWith('http') ? imageUrl : withBasePath(imageUrl)
}

function ListingInquiryForm({
  plot,
  onSuccess,
}: {
  plot: PublicPlotListing | null
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('I am interested in this plot')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const em = localStorage.getItem('plotkare_session_email') ?? ''
    if (em) setEmail(em)
  }, [plot])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plot) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          message: `${message}\n\nListing reference: ${plot.plotNumber}\nLocation: ${plot.location}`,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(result.error || 'Unable to send inquiry. Please try again.')
        return
      }
      onSuccess()
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!plot) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <label className="font-mono text-xs text-white/50">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 font-sans text-white outline-none focus:ring-2 focus:ring-[#C0392B]"
        />
      </div>
      <div>
        <label className="font-mono text-xs text-white/50">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 font-sans text-white outline-none focus:ring-2 focus:ring-[#C0392B]"
        />
      </div>
      <div>
        <label className="font-mono text-xs text-white/50">Phone</label>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 font-sans text-white outline-none focus:ring-2 focus:ring-[#C0392B]"
        />
      </div>
      <div>
        <label className="font-mono text-xs text-white/50">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-4 py-3 font-sans text-white outline-none focus:ring-2 focus:ring-[#C0392B]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="premium-button w-full rounded-lg py-3 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: CRIMSON }}
      >
        {loading ? 'Sending...' : 'Send Inquiry'}
      </button>
      {error && <p className="font-sans text-sm text-red-300">{error}</p>}
    </form>
  )
}

function PlotCard({
  plot,
  onViewDetails,
  onInquire,
}: {
  plot: PublicPlotListing
  onViewDetails: () => void
  onInquire: () => void
}) {
  const gallery = (plot.imageUrls?.length ? plot.imageUrls : [plot.imageUrl]).slice(0, 4)
  return (
    <motion.article
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="premium-interactive group relative h-[420px] overflow-hidden rounded-2xl border border-white/10 shadow-xl"
    >
      {gallery.length > 1 ? (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
          {gallery.map((imageUrl, index) => (
            <div key={`${plot.id}-${index}`} className="relative">
              <Image
                src={resolveImageUrl(imageUrl)}
                alt={`Listing photo ${index + 1} for ${plot.plotNumber}`}
                fill
                className="object-cover transition-[filter,transform] duration-300 group-hover:brightness-[1.08]"
                sizes="(max-width:768px) 50vw, 20vw"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <Image
          src={resolveImageUrl(plot.imageUrl)}
          alt={`Verified ${plot.propertyKind === 'apartment' ? 'apartment' : 'plot'} listing in ${plot.location} - PlotKare marketplace preview`}
          fill
          className="object-cover transition-[filter,transform] duration-300 group-hover:brightness-[1.08]"
          sizes="(max-width:768px) 100vw, 33vw"
          priority
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {plot.verified !== false ? <PlotKareVerifiedStamp tone="dark" /> : null}
          {plot.propertyKind === 'apartment' && (
            <span className="rounded-full border border-white/25 bg-black/40 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-white/80">
              Apartment
            </span>
          )}
          {plot.premium && (
            <span
              className="rounded-full px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: CRIMSON }}
            >
              Premium
            </span>
          )}
        </div>
        <p className="font-mono text-sm font-medium md:text-base" style={{ color: CRIMSON }}>
          {plot.plotNumber}
        </p>
        <h3 className="font-serif text-2xl font-bold leading-tight text-white md:text-3xl">
          {plot.location}
        </h3>
        <p className="text-xs text-white/70">
          {plot.corridor ? `Location / corridor: ${plot.corridor}` : 'Location / corridor verified on request'}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 font-sans text-xs text-white/60">
            {plot.propertyKind === 'apartment'
              ? `${plot.bhk ?? '—'} BHK${plot.floorLabel ? ` · ${plot.floorLabel}` : ''}`
              : plot.sizeLabel}
          </span>
          <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 font-sans text-xs text-white/60">
            {plot.facing} facing
          </span>
          {plot.cornerPlot && plot.propertyKind === 'plot' && (
            <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 font-sans text-xs text-white/60">
              Corner Plot
            </span>
          )}
        </div>
        <p className="font-sans text-xs text-white/70">
          Seller: {plot.sellerName ?? 'PlotKare Seller'} · {plot.sellerPhone || 'Phone on request'}
        </p>
        <p className="font-mono text-xl font-bold uppercase tracking-wide md:text-2xl" style={{ color: GOLD }}>
          {plot.priceDisplay || 'Consult for pricing'}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={onViewDetails}
            className="premium-button-outline rounded-xl border-2 border-white bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={onInquire}
            className="premium-button rounded-xl px-5 py-2.5 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: CRIMSON }}
          >
            Inquire Now
          </button>
        </div>
      </div>
    </motion.article>
  )
}

export function AvailablePlotsShowcaseSection({
  initialListings,
  heading = 'Verified Plot Marketplace',
  description = 'Browse approved plots and apartments with PlotKare verified status, detailed property notes, and inquiry tools.',
  browseLabel = 'Browse Verified Listings',
  accountLabel = 'Owner Login',
}: {
  initialListings: PublicPlotListing[]
  heading?: string
  description?: string
  browseLabel?: string
  accountLabel?: string
}) {
  const [listings, setListings] = useState<PublicPlotListing[]>(initialListings)
  const [detailPlot, setDetailPlot] = useState<PublicPlotListing | null>(null)
  const [inquiryPlot, setInquiryPlot] = useState<PublicPlotListing | null>(null)
  const [inquirySuccess, setInquirySuccess] = useState(false)
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

    return () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current)
      supabase.removeChannel(channel)
    }
  }, [])

  const showcase = getLandingShowcaseListings(listings)

  return (
    <section className="premium-section-dark bg-charcoal py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="premium-reveal mb-12 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
            {heading}
          </h2>
          <p className="mt-4 font-sans text-lg text-white/55">
            {description}
          </p>
        </motion.div>

        {showcase.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {showcase.map((plot) => (
            <motion.div
              key={plot.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <PlotCard
                plot={plot}
                onViewDetails={() => setDetailPlot(plot)}
                onInquire={() => {
                  setInquirySuccess(false)
                  setInquiryPlot(plot)
                }}
              />
            </motion.div>
            ))}
          </div>
        ) : (
          <div className="premium-surface-dark rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-12 text-center">
            <h3 className="font-serif text-2xl font-semibold text-white">Verified listings are being reviewed</h3>
            <p className="mx-auto mt-3 max-w-2xl font-sans text-sm leading-relaxed text-white/60">
              Seller properties appear here only after admin or employee verification. Sign in to track your own
              properties, or contact PlotKare to schedule a guided advisory call.
            </p>
            <Link
              href="/#contact"
              className="premium-button mt-6 inline-flex rounded-xl px-8 py-3 font-sans text-sm font-semibold text-white"
              style={{ backgroundColor: CRIMSON }}
            >
              Contact PlotKare
            </Link>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="premium-surface-dark relative mt-14 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-10 text-center backdrop-blur-xl md:px-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
          <p className="relative mx-auto max-w-2xl font-sans text-base text-white/75 md:text-lg">
            Explore the public listings hub for every verified plot and apartment card, then sign in when you are ready to
            save notes or message an advisor.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/listings/"
              className="premium-button-outline inline-flex rounded-xl border border-white/30 bg-transparent px-8 py-3.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {browseLabel}
            </Link>
            <Link
              href="/login"
              className="premium-button inline-flex rounded-xl px-10 py-3.5 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: CRIMSON }}
            >
              {accountLabel}
            </Link>
          </div>
        </motion.div>
      </div>

      <Dialog open={!!detailPlot} onOpenChange={(o) => !o && setDetailPlot(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#141414] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-white">Listing details</DialogTitle>
          </DialogHeader>
          {detailPlot && (
            <div className="space-y-5 pt-2">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-white/10">
                {detailPlot.imageUrls.length > 1 ? (
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
                    {detailPlot.imageUrls.slice(0, 4).map((imageUrl, index) => (
                      <div key={`${detailPlot.id}-detail-${index}`} className="relative">
                        <Image
                          src={resolveImageUrl(imageUrl)}
                          alt={`Listing photo ${index + 1} for ${detailPlot.plotNumber}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 350px"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Image
                    src={resolveImageUrl(detailPlot.imageUrl)}
                    alt={`Verified ${detailPlot.propertyKind === 'apartment' ? 'apartment' : 'plot'} listing in ${detailPlot.location} - PlotKare marketplace detail`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 700px"
                  />
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">Property snapshot</p>
                  <div className="mt-3 space-y-2 font-sans text-sm text-white/80">
                    <p>
                      <span className="text-white/50">Reference:</span>{' '}
                      <span className="font-mono" style={{ color: CRIMSON }}>
                        {detailPlot.plotNumber}
                      </span>
                    </p>
                    <p>
                      <span className="text-white/50">Location:</span> {detailPlot.location}
                    </p>
                    <p>
                      <span className="text-white/50">Corridor:</span> {detailPlot.corridor || 'Verified on request'}
                    </p>
                    <p>
                      <span className="text-white/50">Type:</span>{' '}
                      {detailPlot.propertyKind === 'apartment'
                        ? `${detailPlot.bhk ?? '—'} BHK apartment`
                        : 'Residential plot'}
                    </p>
                    <p>
                      <span className="text-white/50">{detailPlot.propertyKind === 'apartment' ? 'Unit size:' : 'Plot size:'}</span>{' '}
                      {detailPlot.propertyKind === 'apartment'
                        ? `${detailPlot.sizeLabel}${detailPlot.floorLabel ? ` · ${detailPlot.floorLabel}` : ''}`
                        : detailPlot.sizeLabel}
                    </p>
                    <p>
                      <span className="text-white/50">Facing:</span> {detailPlot.facing}
                    </p>
                    {detailPlot.propertyKind === 'plot' && (
                      <p>
                        <span className="text-white/50">Corner plot:</span> {detailPlot.cornerPlot ? 'Yes' : 'No'}
                      </p>
                    )}
                    <p>
                      <span className="text-white/50">Seller:</span> {detailPlot.sellerName ?? 'PlotKare Seller'} ·{' '}
                      {detailPlot.sellerPhone || 'Phone on request'}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">Vastu and access review</p>
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    Confirm the approach road, exact orientation, and nearby landmark with the owner or PlotKare employee
                    before this property is shown publicly. We use the facing, site photos, and survey notes to validate the file.
                  </p>
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
                    <span className="text-white/50">Pricing:</span> {detailPlot.priceDisplay || 'Consult for pricing'}
                  </div>
                </div>
              </div>
              {detailPlot.propertyKind === 'plot' && (
                <PlotTopdownSvg cornerPlot={detailPlot.cornerPlot} className="border-white/15" />
              )}
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">Verification checklist</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-white/75">
                  {VERIFICATION_CHECKLIST.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[#7A2E25] bg-[#2A1311] p-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#F3C6BC]">Owner upload request</p>
                <p className="mt-3 text-sm leading-6 text-[#F6DDD8]">
                  Ask the owner or PlotKare employee to upload real property images and every necessary document before
                  publication. Placeholder photos, copied images, or missing location details should never be used for a
                  verified listing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailPlot(null)
                  setInquirySuccess(false)
                  setInquiryPlot(detailPlot)
                }}
                className="premium-button w-full rounded-lg py-3 font-sans text-sm font-semibold text-white"
                style={{ backgroundColor: CRIMSON }}
              >
                Inquire Now
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!inquiryPlot}
        onOpenChange={(o) => {
          if (!o) {
            setInquiryPlot(null)
            setInquirySuccess(false)
          }
        }}
      >
        <DialogContent className="border-white/10 bg-[#141414] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-white">
              {inquirySuccess ? 'Thank you' : 'Contact us'}
            </DialogTitle>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {inquirySuccess ? (
              <motion.p
                key="ok"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-sans text-sm leading-relaxed text-white/80"
              >
                Your inquiry has been received. Our advisor will contact you within 24 hours.
              </motion.p>
            ) : (
              <ListingInquiryForm
                key="form"
                plot={inquiryPlot}
                onSuccess={() => setInquirySuccess(true)}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </section>
  )
}
