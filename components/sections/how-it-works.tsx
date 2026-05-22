'use client'

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'List Your Plot',
    description: 'Share your plot number, location, and documents. Setup takes just 10 minutes online or via WhatsApp.',
  },
  {
    number: '02',
    title: 'Book a Consultation',
    description: 'Choose a monitoring cadence with the team after your property location, access, and documents are reviewed.',
  },
  {
    number: '03',
    title: 'Agent Deployed',
    description:
      'A field coordinator is assigned to your plot file with a written scope — timelines depend on corridor and intake volume.',
  },
  {
    number: '04',
    title: 'Services Activated',
    description: 'Boundary inspection, legal check, and document vault go live immediately. You get full visibility.',
  },
  {
    number: '05',
    title: 'Reports Forever',
    description: 'Every month your report arrives with photos, status, and value estimate on WhatsApp and email.',
  },
]

export function HowItWorksSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [showHint, setShowHint] = useState(true)
  const [highlightedSteps, setHighlightedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!sectionRef.current) return

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const stepIndex = parseInt(entry.target.getAttribute('data-step-index') || '-1', 10)
          if (stepIndex >= 0) {
            setHighlightedSteps((prev) => new Set([...prev, stepIndex]))
          }
        }
      })
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.3,
      rootMargin: '0px',
    })

    // Observe all step boxes
    const stepBoxes = sectionRef.current.querySelectorAll('[data-step-index]')
    stepBoxes.forEach((box) => {
      observer.observe(box)
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section id="how-it-works" ref={sectionRef} className="premium-section-dark bg-charcoal py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="premium-reveal mb-12 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
            How Property Monitoring Works in <span className="text-primary">Five Steps</span>
          </h2>
        </motion.div>

        {/* Scroll Hint */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: showHint ? 1 : 0 }}
          className="mb-4 text-center lg:hidden"
        >
          <span className="font-mono text-xs text-white/40">
            Scroll horizontally to see all steps
          </span>
        </motion.div>

        {/* Horizontal Scroll Container - Mobile/Tablet */}
        <div
          ref={scrollRef}
          className="scrollbar-hide scroll-snap-x -mx-6 flex gap-6 overflow-x-auto px-6 pb-4 lg:hidden"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              data-step-index={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`premium-surface-dark scroll-snap-start min-w-[280px] flex-shrink-0 rounded-lg p-8 transition-all duration-500 ${
                highlightedSteps.has(index)
                  ? 'bg-white/10 shadow-[0_0_20px_rgba(139,21,56,0.6)]'
                  : 'bg-white/5'
              }`}
            >
              <span className={`font-mono text-4xl font-bold transition-all duration-500 ${highlightedSteps.has(index) ? 'drop-shadow-[0_0_8px_rgba(139,21,56,0.8)]' : 'text-primary'}`} style={{color: highlightedSteps.has(index) ? '#8B1538' : undefined}}>
                {step.number}
              </span>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-white/60">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid lg:grid-cols-5 lg:gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              data-step-index={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`premium-surface-dark group relative rounded-lg p-6 transition-all duration-500 ${
                highlightedSteps.has(index)
                  ? 'bg-white/10 shadow-[0_0_20px_rgba(139,21,56,0.6)]'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-white/20 lg:block" />
              )}

              <span className={`font-mono text-3xl font-bold transition-all duration-500 ${highlightedSteps.has(index) ? 'drop-shadow-[0_0_8px_rgba(139,21,56,0.8)]' : 'text-primary'}`} style={{color: highlightedSteps.has(index) ? '#8B1538' : undefined}}>
                {step.number}
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-white/60">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
