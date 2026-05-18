'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

interface OwnerDetailsCardProps {
  className?: string
  emphasize?: boolean
}

export const OwnerDetailsCard = forwardRef<HTMLDivElement, OwnerDetailsCardProps>(
  function OwnerDetailsCard({ className = '', emphasize = false }, ref) {
    const services = ['Monthly Inspection', 'Legal Monitoring', 'Value Tracker']

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`rounded-lg border border-white/20 bg-white/80 p-6 shadow-xl backdrop-blur-md ${
          emphasize ? 'ring-2 ring-primary ring-offset-2 ring-offset-secondary' : ''
        } ${className}`}
      >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">Plot Number</p>
          <p className="font-mono text-lg font-semibold text-primary">VZG-047</p>
        </div>
        <div className="rounded bg-primary/10 px-3 py-1">
          <span className="font-mono text-xs font-medium text-primary">Active</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">Owner Name</p>
          <p className="font-sans text-sm font-medium text-foreground">Ravi Kumar</p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">Plot Size</p>
          <p className="font-sans text-sm font-medium text-foreground">200 sq. yards</p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">Location</p>
          <p className="font-sans text-sm font-medium text-foreground">Bheemunipatnam Phase 2</p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">Last Inspection</p>
          <p className="font-mono text-sm font-medium text-foreground">28 April 2026</p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">Advisory Status</p>
          <p className="font-mono text-sm font-semibold text-primary">Consult for valuation</p>
        </div>
      </div>

      <div className="mt-5 pt-4">
        <p className="mb-2 font-mono text-xs text-muted-foreground">Active Services</p>
        <div className="flex flex-wrap gap-3">
          {services.map((service) => (
            <div key={service} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-sans text-sm text-foreground">{service}</span>
            </div>
          ))}
        </div>
      </div>
      </motion.div>
    )
  }
)

