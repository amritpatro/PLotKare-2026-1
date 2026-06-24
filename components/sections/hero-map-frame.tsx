'use client'

import dynamic from 'next/dynamic'

const IndiaHeroMap = dynamic(
  () => import('@/components/sections/india-hero-map').then((module) => module.IndiaHeroMap),
  {
    ssr: false,
    loading: () => <div className="min-h-[340px] w-full sm:min-h-[430px] lg:min-h-[640px]" aria-hidden />,
  },
)

export function HeroMapFrame() {
  return (
    <div className="premium-map-frame relative min-h-[340px] overflow-hidden rounded-sm bg-transparent sm:min-h-[430px] lg:min-h-[640px]">
      <div className="pointer-events-none absolute inset-[-8%] bg-[radial-gradient(circle_at_54%_45%,rgba(248,246,243,0.82)_0%,rgba(248,246,243,0.46)_44%,rgba(255,255,255,0)_76%)]" />
      <div className="pointer-events-none absolute inset-y-[8%] right-[-8%] w-1/2 bg-[radial-gradient(circle_at_center,rgba(139,21,56,0.045)_0%,rgba(255,255,255,0)_70%)]" />
      <div className="absolute inset-0 flex items-center justify-center opacity-100">
        <IndiaHeroMap />
      </div>
    </div>
  )
}
