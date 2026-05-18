'use client'

import { motion } from 'framer-motion'
import { CalendarCheck, Check, FileSearch, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  badge?: string
  features: PlanFeature[]
  variant: 'default' | 'featured' | 'premium'
  summary: string
}

const plans: Plan[] = [
  {
    name: 'Basic Monitor',
    variant: 'default',
    summary: 'For owners who want recurring proof that their plot is being watched.',
    features: [
      { text: 'Scheduled field inspection', included: true },
      { text: 'Boundary photo evidence', included: true },
      { text: 'WhatsApp report delivery', included: true },
      { text: 'Plot status indicator', included: true },
      { text: 'Legal hygiene workflow', included: false },
      { text: 'Document vault', included: false },
    ],
  },
  {
    name: 'Complete Care',
    badge: 'Most requested',
    variant: 'featured',
    summary: 'For families and NRIs who need inspection, legal reminders, and document continuity together.',
    features: [
      { text: 'Everything in Basic Monitor', included: true },
      { text: 'Legal hygiene workflow', included: true },
      { text: 'EC and tax reminders', included: true },
      { text: 'Document vault', included: true },
      { text: 'Value review readiness', included: true },
      { text: 'Dedicated agent coordination', included: false },
    ],
  },
  {
    name: 'Premium NRI',
    badge: 'Concierge',
    variant: 'premium',
    summary: 'For owners who want higher-touch operations, faster coordination, and advisory support.',
    features: [
      { text: 'Everything in Complete Care', included: true },
      { text: 'Dedicated relationship manager', included: true },
      { text: 'Video inspection report', included: true },
      { text: 'Encroachment escalation support', included: true },
      { text: 'Priority response workflow', included: true },
      { text: 'Quarterly in-person update option', included: true },
    ],
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            Property Monitoring <span className="text-primary">Consultation Plans</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-base leading-relaxed text-muted-foreground">
            Every property is reviewed before a quote. Book a demo so the team can assess location, documents,
            inspection cadence, and service scope.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-xl p-8 ${
                plan.variant === 'premium'
                  ? 'bg-charcoal text-white'
                  : plan.variant === 'featured'
                    ? 'border-2 border-primary bg-white shadow-xl'
                    : 'border border-border bg-white'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                  {plan.badge}
                </span>
              )}

              <div
                className={`mb-5 inline-flex rounded-full p-3 ${
                  plan.variant === 'premium' ? 'bg-white/10 text-accent' : 'bg-primary/10 text-primary'
                }`}
              >
                {plan.variant === 'default' ? <ShieldCheck className="h-5 w-5" /> : null}
                {plan.variant === 'featured' ? <FileSearch className="h-5 w-5" /> : null}
                {plan.variant === 'premium' ? <CalendarCheck className="h-5 w-5" /> : null}
              </div>

              <h3 className={`font-serif text-2xl font-semibold ${plan.variant === 'premium' ? 'text-white' : 'text-foreground'}`}>
                {plan.name}
              </h3>
              <p className={`mt-4 font-sans text-sm leading-relaxed ${plan.variant === 'premium' ? 'text-white/66' : 'text-muted-foreground'}`}>
                {plan.summary}
              </p>

              <div className={`mt-6 rounded-lg border p-4 ${plan.variant === 'premium' ? 'border-white/10 bg-white/[0.04]' : 'border-border bg-secondary/60'}`}>
                <p className={`font-mono text-xs uppercase tracking-wide ${plan.variant === 'premium' ? 'text-accent' : 'text-primary'}`}>
                  Consult for pricing
                </p>
                <p className={`mt-2 font-sans text-sm ${plan.variant === 'premium' ? 'text-white/70' : 'text-muted-foreground'}`}>
                  Final scope is shared after a property review and demo call.
                </p>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    <Check
                      className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                        feature.included
                          ? plan.variant === 'premium'
                            ? 'text-accent'
                            : 'text-primary'
                          : plan.variant === 'premium'
                            ? 'text-white/30'
                            : 'text-muted-foreground/30'
                      }`}
                    />
                    <span
                      className={`font-sans text-sm ${
                        feature.included
                          ? plan.variant === 'premium'
                            ? 'text-white/80'
                            : 'text-foreground'
                          : plan.variant === 'premium'
                            ? 'text-white/30'
                            : 'text-muted-foreground/50'
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="#contact"
                className={`mt-8 block w-full rounded-sm py-3 text-center font-sans text-sm font-medium transition-colors ${
                  plan.variant === 'premium'
                    ? 'bg-accent text-charcoal hover:bg-accent/90'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                Book Demo
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
