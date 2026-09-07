'use client'

import { useEffect, useRef } from 'react'

type Metric = {
  label: string
  value: number
  decimals?: number
  suffix?: string
}

function formatMetric(value: number, decimals: number, suffix: string) {
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${suffix}`
}

export function ReferenceMetrics({ metrics }: { metrics: Metric[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = () => {
      const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-metric-value]'))
      const start = performance.now()
      const duration = reduceMotion ? 0 : 700

      const frame = (now: number) => {
        const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1)
        const eased = 1 - (1 - progress) ** 3
        nodes.forEach((node) => {
          const value = Number(node.dataset.metricValue ?? 0)
          const decimals = Number(node.dataset.metricDecimals ?? 0)
          const suffix = node.dataset.metricSuffix ?? ''
          node.textContent = formatMetric(value * eased, decimals, suffix)
        })
        if (progress < 1) requestAnimationFrame(frame)
      }

      requestAnimationFrame(frame)
    }

    if (!('IntersectionObserver' in window)) {
      animate()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          animate()
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="premium-section bg-secondary py-16 lg:py-20" aria-labelledby="reference-metrics-title">
      <div ref={containerRef} className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Reference layout record</p>
          <h2 id="reference-metrics-title" className="mt-3 font-serif text-3xl font-bold text-foreground md:text-4xl">
            A property file with measurable detail
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">
            Boduvalasa layout reference data shown as a property record example, not as PlotKare-wide customer or service totals.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="premium-surface rounded-lg border border-border bg-white/80 p-6 text-center backdrop-blur-sm">
              <p
                className="font-serif text-3xl font-bold text-primary md:text-4xl"
                data-metric-value={metric.value}
                data-metric-decimals={metric.decimals ?? 0}
                data-metric-suffix={metric.suffix ?? ''}
              >
                {formatMetric(metric.value, metric.decimals ?? 0, metric.suffix ?? '')}
              </p>
              <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
