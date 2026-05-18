'use client'

import { motion } from 'framer-motion'
import { 
  Camera, 
  FileText, 
  Bell, 
  Scale, 
  TrendingUp, 
  FolderLock 
} from 'lucide-react'

const services = [
  {
    icon: Camera,
    title: 'Monthly Field Inspections',
    description: 'Our verified agents visit your plot every 30 days and photograph all four boundaries, ensuring comprehensive documentation.',
  },
  {
    icon: FileText,
    title: 'Digital Report Delivery',
    description: 'Detailed reports arrive via PDF and WhatsApp with geotagged photos, timestamps, and actionable insights.',
  },
  {
    icon: Bell,
    title: 'Encroachment Alerts',
    description: 'Any boundary violation or unauthorized activity triggers an instant notification so you can act immediately.',
  },
  {
    icon: Scale,
    title: 'Legal Health Monitoring',
    description: 'EC status, tax dues, and RERA compliance are tracked continuously to keep your property legally sound.',
  },
  {
    icon: TrendingUp,
    title: 'Value Appreciation Tracker',
    description: 'Monthly market data shows your estimated plot value relative to nearby registrations and transactions.',
  },
  {
    icon: FolderLock,
    title: 'Document Vault',
    description: 'Sale deed, patta, link documents, and all legal paperwork stored securely in your digital vault.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function ServicesSection() {
  return (
    <section id="services" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            Monthly Property Inspection, Legal Monitoring &amp; Document Vault
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-lg text-muted-foreground">
            We act as your eyes, ears, and property operations layer on the ground.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="group rounded-lg border border-border bg-white p-8 transition-shadow hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 font-serif text-xl font-semibold text-foreground">
                  {service.title}
                </h3>
                <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
