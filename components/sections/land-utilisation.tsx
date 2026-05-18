'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Fence, Leaf, Scale, Sprout, SunMedium, Warehouse } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Category = 'All' | 'Income Generation' | 'Protection' | 'Development'

interface Service {
  title: string
  description: string
  category: 'Income Generation' | 'Protection' | 'Development'
  icon: typeof Sprout
  accent: string
}

const services: Service[] = [
  {
    title: 'Container Farming Lease',
    description: 'Lease idle land for modular farming operators after fitment, access, water, and risk checks.',
    category: 'Income Generation',
    icon: Warehouse,
    accent: '#2D5A3D',
  },
  {
    title: 'Mushroom Kit Cultivation',
    description: 'Evaluate low-footprint cultivation as an owner-approved add-on where site conditions allow it.',
    category: 'Income Generation',
    icon: Sprout,
    accent: '#8B1538',
  },
  {
    title: 'Solar Panel Hosting',
    description: 'Screen open plots for solar hosting suitability, shade exposure, access, and operator interest.',
    category: 'Income Generation',
    icon: SunMedium,
    accent: '#C9A962',
  },
  {
    title: 'Boundary Fencing Installation',
    description: 'Plan fencing and signboard work so protection is visible before disputes or dumping begin.',
    category: 'Protection',
    icon: Fence,
    accent: '#1a1a1a',
  },
  {
    title: 'Legal Holding Advisory',
    description: 'Keep holding structure, recurring dues, and documentation hygiene visible to owners and advisors.',
    category: 'Protection',
    icon: Scale,
    accent: '#8B1538',
  },
  {
    title: 'Plot Resale Assistance',
    description: 'Prepare inspected, photographed, documented assets for verified marketplace listing readiness.',
    category: 'Development',
    icon: Leaf,
    accent: '#2D5A3D',
  },
]

const categories: Category[] = ['All', 'Income Generation', 'Protection', 'Development']

export function LandUtilisationSection() {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [activeService, setActiveService] = useState<Service | null>(null)

  const filteredServices =
    activeCategory === 'All' ? services : services.filter((service) => service.category === activeCategory)

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-10"
        >
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            Property Income, Protection, and Growth <span className="text-primary">Add-Ons</span>
          </h2>
          <p className="mt-4 max-w-2xl font-sans text-lg text-muted-foreground">
            Optional services sit behind the core property record. Owners can explore them without turning the landing
            page into a heavy image gallery.
          </p>
        </motion.div>

        <div className="mb-8 flex flex-wrap gap-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`relative pb-2 font-sans text-sm font-medium transition-colors ${
                activeCategory === category ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {category}
              {activeCategory === category && (
                <motion.div layoutId="activeCategory" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        <motion.div layout className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const Icon = service.icon
            return (
              <motion.button
                layout
                key={service.title}
                type="button"
                onClick={() => setActiveService(service)}
                className="min-h-[230px] rounded-lg border border-border bg-secondary p-7 text-left shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-sm"
                  style={{ backgroundColor: `${service.accent}18`, color: service.accent }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{service.category}</p>
                <h3 className="mt-3 font-serif text-2xl font-bold leading-tight text-foreground">{service.title}</h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                <div className="mt-5 flex items-center gap-2 text-primary">
                  <span className="font-sans text-sm font-semibold">Open details</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      <Dialog open={!!activeService} onOpenChange={(open) => !open && setActiveService(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeService?.title}</DialogTitle>
            <DialogDescription className="pt-2 font-sans text-sm leading-relaxed">
              {activeService?.description} PlotKare treats this as an optional service after the property record,
              inspection cadence, and owner approvals are clear.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  )
}
