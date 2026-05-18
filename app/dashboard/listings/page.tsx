'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import {
  DEFAULT_PUBLIC_LISTINGS,
  filterPublicListings,
  loadPublicListings,
  type ListingFilter,
  type PublicPlotListing,
} from '@/lib/public-listings'
import { withBasePath } from '@/lib/site-config'

const FILTERS: ListingFilter[] = ['All Plots', 'Verified Plots', 'Site Visit Ready', 'Corner Plots']

function InquiryBody({
  plot,
  defaultMsg,
  onSuccess,
}: {
  plot: PublicPlotListing | null
  defaultMsg: string
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(defaultMsg)

  useEffect(() => {
    setMessage(defaultMsg)
    const em = typeof window !== 'undefined' ? localStorage.getItem('plotkare_session_email') ?? '' : ''
    if (em) setEmail(em)
  }, [plot, defaultMsg])

  if (!plot) return null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSuccess()
      }}
      className="space-y-4 pt-2"
    >
      <div>
        <label className="font-mono text-xs text-[#6B7280]">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/25"
        />
      </div>
      <div>
        <label className="font-mono text-xs text-[#6B7280]">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/25"
        />
      </div>
      <div>
        <label className="font-mono text-xs text-[#6B7280]">Phone</label>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/25"
        />
      </div>
      <div>
        <label className="font-mono text-xs text-[#6B7280]">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1 w-full resize-none rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[#1F2937] outline-none focus:ring-2 focus:ring-[#C0392B]/25"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-[#C0392B] py-3 font-sans text-sm font-semibold text-white hover:opacity-95"
      >
        Send Inquiry
      </button>
    </form>
  )
}

export default function ListingsPage() {
  const [filter, setFilter] = useState<ListingFilter>('All Plots')
  const [listings, setListings] = useState<PublicPlotListing[]>(DEFAULT_PUBLIC_LISTINGS)
  const [contactOpen, setContactOpen] = useState(false)
  const [inquiryPlot, setInquiryPlot] = useState<PublicPlotListing | null>(null)
  const [interestPlot, setInterestPlot] = useState<PublicPlotListing | null>(null)
  const [inquiryOk, setInquiryOk] = useState(false)
  const [interestOk, setInterestOk] = useState(false)

  const sync = () => {
    const r = loadPublicListings()
    setListings(r.length ? r : [...DEFAULT_PUBLIC_LISTINGS])
  }

  useEffect(() => {
    sync()
    const h = () => sync()
    window.addEventListener('plotkare-listings-changed', h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener('plotkare-listings-changed', h)
      window.removeEventListener('storage', h)
    }
  }, [])

  const visible = filterPublicListings(listings, filter)

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardTopBar title="Property Listings" />
        <div className="px-8 pb-12 pt-24">
          <div className="mx-auto max-w-6xl">
            <h1 className="font-serif text-3xl font-bold text-[#1F2937] md:text-4xl">
              Current Plot Listings in Visakhapatnam
            </h1>
            <p className="mt-3 font-sans text-[#6B7280]">Verified available plots</p>

            <div className="mt-8 flex flex-wrap gap-2">
              {FILTERS.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setFilter(pill)}
                  className={`rounded-full border px-4 py-2 font-sans text-sm transition-colors ${
                    filter === pill
                      ? 'border-[#C0392B] bg-[#FFF1F2] text-[#C0392B]'
                      : 'border-[#E5E7EB] bg-white text-[#6B7280] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:border-[#D1D5DB]'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {visible.map((plot) => (
                <motion.div
                  key={plot.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                >
                  <div className="relative h-[200px] w-full">
                    <Image src={withBasePath(plot.imageUrl)} alt="" fill className="object-cover" sizes="280px" />
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="font-mono text-xs text-[#C0392B]">{plot.plotNumber}</p>
                    <h2 className="font-serif text-lg font-bold text-[#1F2937]">{plot.location}</h2>
                    <p className="font-sans text-sm text-[#6B7280]">
                      {plot.sizeLabel} · {plot.facing} facing
                      {plot.cornerPlot ? ' · Corner' : ''}
                    </p>
                    {plot.premium && (
                      <span className="inline-block rounded-full bg-[#FFF1F2] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase text-[#C0392B]">
                        Premium
                      </span>
                    )}
                    <p className="font-mono text-sm font-bold uppercase tracking-wide text-[#F59E0B]">
                      Consult for pricing
                    </p>
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setInquiryOk(false)
                          setInquiryPlot(plot)
                        }}
                        className="w-full rounded-lg bg-[#C0392B] py-2.5 font-sans text-sm font-semibold text-white hover:opacity-95"
                      >
                        Inquire Now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInterestOk(false)
                          setInterestPlot(plot)
                        }}
                        className="w-full rounded-lg border border-[#C0392B] py-2.5 font-sans text-sm font-semibold text-[#C0392B] hover:bg-[#FFF1F2]"
                      >
                        Register Interest
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 rounded-xl border border-[#E5E7EB] border-l-[4px] border-l-[#C0392B] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <p className="font-sans text-sm text-[#6B7280]">
                Want your plot listed? Contact us during beta for a guided listing consultation.
              </p>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="mt-4 rounded-lg border-2 border-[#C0392B] bg-transparent px-6 py-2.5 font-sans text-sm font-semibold text-[#C0392B] hover:bg-[#FFF1F2]"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="border-[#E5E7EB] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1F2937]">Listing inquiry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Name</label>
              <input className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-4 py-3 text-[#1F2937]" />
            </div>
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Email</label>
              <input
                type="email"
                defaultValue={
                  typeof window !== 'undefined'
                    ? localStorage.getItem('plotkare_session_email') ?? ''
                    : ''
                }
                className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-4 py-3 text-[#1F2937]"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Message</label>
              <textarea rows={4} className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-4 py-3 text-[#1F2937]" />
            </div>
            <button
              type="button"
              onClick={() => setContactOpen(false)}
              className="w-full rounded-lg bg-[#C0392B] py-3 font-sans text-sm font-semibold text-white"
            >
              Send
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!inquiryPlot}
        onOpenChange={(o) => {
          if (!o) {
            setInquiryPlot(null)
            setInquiryOk(false)
          }
        }}
      >
        <DialogContent className="border-[#E5E7EB] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1F2937]">
              {inquiryOk ? 'Thank you' : 'Inquire about plot'}
            </DialogTitle>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {inquiryOk ? (
              <motion.p
                key="a"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-sans text-sm leading-relaxed text-[#6B7280]"
              >
                Your inquiry has been received. Our advisor will contact you within 24 hours.
              </motion.p>
            ) : (
              <InquiryBody
                key="b"
                plot={inquiryPlot}
                defaultMsg="I am interested in this plot"
                onSuccess={() => setInquiryOk(true)}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!interestPlot}
        onOpenChange={(o) => {
          if (!o) {
            setInterestPlot(null)
            setInterestOk(false)
          }
        }}
      >
        <DialogContent className="border-[#E5E7EB] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1F2937]">
              {interestOk ? 'Thank you' : 'Register interest'}
            </DialogTitle>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {interestOk ? (
              <motion.p
                key="c"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-sans text-sm leading-relaxed text-[#6B7280]"
              >
                Your inquiry has been received. Our advisor will contact you within 24 hours.
              </motion.p>
            ) : (
              <InquiryBody
                key="d"
                plot={interestPlot}
                defaultMsg="I would like to register my interest in this plot"
                onSuccess={() => setInterestOk(true)}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  )
}
