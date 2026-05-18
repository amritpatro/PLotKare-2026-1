'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlotTopdownSvg } from '@/components/plot-topdown-svg'
import {
  DEFAULT_PUBLIC_LISTINGS,
  getLandingShowcaseListings,
  loadPublicListings,
  type PublicPlotListing,
} from '@/lib/public-listings'
import { withBasePath } from '@/lib/site-config'

const CRIMSON = '#C0392B'
const GOLD = '#F59E0B'

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const em = localStorage.getItem('plotkare_session_email') ?? ''
    if (em) setEmail(em)
  }, [plot])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSuccess()
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
        className="w-full rounded-lg py-3 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-95"
        style={{ backgroundColor: CRIMSON }}
      >
        Send Inquiry
      </button>
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
  return (
    <motion.article
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group relative h-[420px] overflow-hidden rounded-2xl border border-white/10 shadow-xl"
    >
      <Image
        src={withBasePath(plot.imageUrl)}
        alt={`${plot.propertyKind === 'apartment' ? 'Apartment' : 'Plot'} listing ${plot.plotNumber} — ${plot.location}, Visakhapatnam area (demo)`}
        fill
        className="object-cover transition-[filter,transform] duration-300 group-hover:brightness-[1.08]"
        sizes="(max-width:768px) 100vw, 33vw"
        priority
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-white/90">
            <BadgeCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            PlotKare Verified
          </span>
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
        <p className="font-mono text-xl font-bold uppercase tracking-wide md:text-2xl" style={{ color: GOLD }}>
          Consult for pricing
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={onViewDetails}
            className="rounded-xl border-2 border-white bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            View Details
          </button>
          <Link
            href={`/demo/plot-3d/?listing=${encodeURIComponent(plot.plotNumber)}`}
            className="rounded-xl border-2 border-accent/80 bg-accent/15 px-5 py-2.5 font-sans text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-accent/25"
          >
            View in 3D
          </Link>
          <button
            type="button"
            onClick={onInquire}
            className="rounded-xl px-5 py-2.5 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: CRIMSON }}
          >
            Inquire Now
          </button>
        </div>
      </div>
    </motion.article>
  )
}

export function AvailablePlotsShowcaseSection() {
  const [listings, setListings] = useState<PublicPlotListing[]>(DEFAULT_PUBLIC_LISTINGS)
  const [detailPlot, setDetailPlot] = useState<PublicPlotListing | null>(null)
  const [inquiryPlot, setInquiryPlot] = useState<PublicPlotListing | null>(null)
  const [inquirySuccess, setInquirySuccess] = useState(false)

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

  const showcase = getLandingShowcaseListings(listings)

  return (
    <section className="bg-charcoal py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-12 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
            Verified Property Marketplace Preview
          </h2>
          <p className="mt-4 font-sans text-lg text-white/55">
            Browse sample plots and apartments with PlotKare verified status, 3D previews, and inquiry tools before the
            public marketplace goes live.
          </p>
        </motion.div>

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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative mt-14 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-10 text-center backdrop-blur-xl md:px-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
          <p className="relative mx-auto max-w-2xl font-sans text-base text-white/75 md:text-lg">
            Explore the public listings hub for every demo plot and apartment card, then sign in when you are ready to
            save notes or message an advisor.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/listings/"
              className="inline-flex rounded-xl border border-white/30 bg-transparent px-8 py-3.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Browse listings hub
            </Link>
            <Link
              href="/login"
              className="inline-flex rounded-xl px-10 py-3.5 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: CRIMSON }}
            >
              Sign in for owner tools
            </Link>
          </div>
        </motion.div>
      </div>

      <Dialog open={!!detailPlot} onOpenChange={(o) => !o && setDetailPlot(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#141414] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-white">Listing details</DialogTitle>
          </DialogHeader>
          {detailPlot && (
            <div className="space-y-5 pt-2">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg">
                <Image
                  src={withBasePath(detailPlot.imageUrl)}
                  alt={`${detailPlot.propertyKind === 'apartment' ? 'Apartment' : 'Plot'} listing ${detailPlot.plotNumber} — ${detailPlot.location} (demo)`}
                  fill
                  className="object-cover"
                  sizes="500px"
                />
              </div>
              <div className="space-y-1 font-sans text-sm text-white/70">
                <p>
                  <span className="text-white/50">Reference:</span>{' '}
                  <span className="font-mono" style={{ color: CRIMSON }}>
                    {detailPlot.plotNumber}
                  </span>
                </p>
                <p>
                  <span className="text-white/50">Location:</span>{' '}
                  <span className="font-serif text-lg text-white">{detailPlot.location}</span>
                </p>
                <p>
                  <span className="text-white/50">{detailPlot.propertyKind === 'apartment' ? 'Unit:' : 'Size:'}</span>{' '}
                  {detailPlot.propertyKind === 'apartment'
                    ? `${detailPlot.bhk ?? '—'} BHK${detailPlot.floorLabel ? ` · ${detailPlot.floorLabel}` : ''} · ${detailPlot.sizeLabel}`
                    : detailPlot.sizeLabel}
                </p>
                <p>
                  <span className="text-white/50">Facing:</span> {detailPlot.facing}
                </p>
                {detailPlot.propertyKind === 'plot' && (
                <p>
                  <span className="text-white/50">Corner plot:</span>{' '}
                  {detailPlot.cornerPlot ? 'Yes' : 'No'}
                </p>
                )}
                <p className="font-mono text-lg font-semibold uppercase tracking-wide" style={{ color: GOLD }}>
                  Pricing shared after advisor consultation
                </p>
              </div>
              {detailPlot.propertyKind === 'plot' && (
              <PlotTopdownSvg cornerPlot={detailPlot.cornerPlot} className="border-white/15" />
              )}
              <button
                type="button"
                onClick={() => {
                  setDetailPlot(null)
                  setInquirySuccess(false)
                  setInquiryPlot(detailPlot)
                }}
                className="w-full rounded-lg py-3 font-sans text-sm font-semibold text-white"
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
