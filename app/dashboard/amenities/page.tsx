'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShoppingCart } from 'lucide-react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { AMENITY_CATALOG, type AmenityCatalogItem } from '@/lib/amenity-catalog'
import { getCatalogItemsForUserGrid } from '@/lib/amenity-catalog-availability'
import {
  loadActiveAmenityNames,
  saveActiveAmenityNames,
} from '@/lib/plotkare-storage'
import { withBasePath } from '@/lib/site-config'

export default function AmenitiesPage() {
  const router = useRouter()
  const [activeNames, setActiveNames] = useState<string[]>([])
  const [catalog, setCatalog] = useState<AmenityCatalogItem[]>(AMENITY_CATALOG)

  const refresh = () => {
    setActiveNames(loadActiveAmenityNames())
    setCatalog(getCatalogItemsForUserGrid())
  }

  useEffect(() => {
    refresh()
    const h = () => refresh()
    window.addEventListener('plotkare-amenities-changed', h)
    window.addEventListener('plotkare-amenity-catalog-changed', h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener('plotkare-amenities-changed', h)
      window.removeEventListener('plotkare-amenity-catalog-changed', h)
      window.removeEventListener('storage', h)
    }
  }, [])

  const activeSet = useMemo(() => new Set(activeNames), [activeNames])

  const activeItems = useMemo(() => {
    return activeNames
      .map((name) => {
        const item = AMENITY_CATALOG.find((a) => a.name === name)
        return item ? item : null
      })
      .filter(Boolean) as AmenityCatalogItem[]
  }, [activeNames])

  const addAmenity = (item: AmenityCatalogItem) => {
    if (activeSet.has(item.name)) return
    saveActiveAmenityNames([...activeNames, item.name])
    setActiveNames((prev) => [...prev, item.name])
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardTopBar title="Amenities" />
        <div className="px-8 pb-12 pt-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <h2 className="font-serif text-2xl font-bold text-[#1F2937]">Active Amenities</h2>
                <span className="rounded-full bg-[#FFF1F2] px-3 py-1 font-mono text-sm text-[#C0392B]">
                  {activeItems.length}
                </span>
              </div>

              <div className="min-h-[200px] space-y-3">
                <AnimatePresence mode="popLayout">
                  {activeItems.length === 0 && (
                    <p className="font-sans text-sm text-[#9CA3AF]">
                      No amenities yet. Add from the catalogue on the right.
                    </p>
                  )}
                  {activeItems.map((item) => (
                    <motion.div
                      key={item.name}
                      layout
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={withBasePath(item.image)}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized={item.isLocalImage}
                          />
                          <div className="absolute inset-0 bg-black/20" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-base font-semibold text-[#1F2937]">{item.name}</p>
                          <span className="mt-1 inline-block rounded-full bg-[#F3F4F6] px-2 py-0.5 font-mono text-[10px] text-[#6B7280]">
                            {item.category}
                          </span>
                          <p className="mt-2 font-mono text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">
                            Consult for service scope
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-8 border-t border-[#E5E7EB] pt-6">
                <p className="font-mono text-sm text-[#6B7280]">Amenity Consultation Status</p>
                <p
                  className="mt-1 font-mono text-2xl font-bold uppercase tracking-wide text-[#F59E0B]"
                  style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                >
                  Advisor scope required
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/payments')}
                  className="mt-4 w-full rounded-lg bg-[#C0392B] py-3 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-95"
                >
                  Request Consultation
                </button>
              </div>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-bold text-[#1F2937]">Add Amenities</h2>
              <p className="mt-2 font-sans text-sm text-[#9CA3AF]">Tap to add to your plot.</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {catalog.map((item) => {
                  const isAdded = activeSet.has(item.name)
                  return (
                    <div
                      key={item.id}
                      className="flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    >
                      <div className="relative h-36 w-full shrink-0">
                        <Image
                          src={withBasePath(item.image)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 400px"
                          unoptimized={item.isLocalImage}
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <span className="mb-1 inline-block w-fit rounded-full bg-[#F3F4F6] px-2 py-0.5 font-mono text-[10px] text-[#6B7280]">
                          {item.category}
                        </span>
                        <h3 className="font-serif text-lg font-bold leading-tight text-[#1F2937]">
                          {item.name}
                        </h3>
                        <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">
                          Consult for pricing
                        </p>
                        <div className="mt-auto pt-4">
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => addAmenity(item)}
                            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-sans text-sm font-semibold transition-colors ${
                              isAdded
                                ? 'cursor-not-allowed bg-[#F3F4F6] text-[#9CA3AF]'
                                : 'bg-[#C0392B] text-white hover:opacity-95'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-4 w-4 text-[#16A34A]" />
                                Added
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4" />
                                Request Scope
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
