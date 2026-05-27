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
    description: 'Set an inspection cadence for boundary, access, and visible site-condition records after the service scope is confirmed.',
  },
  {
    icon: FileText,
    title: 'Digital Report Delivery',
    description: 'Authorized owners can review submitted photographs, timestamps, and property updates associated with their file.',
  },
  {
    icon: Bell,
    title: 'Encroachment Alerts',
    description: 'Record a boundary or access concern so it can enter the appropriate support and operational review workflow.',
  },
  {
    icon: Scale,
    title: 'Legal Health Monitoring',
    description: 'Organize EC, tax, mutation, registration, and supporting records for review by authorized users.',
  },
  {
    icon: TrendingUp,
    title: 'Value Appreciation Tracker',
    description: 'Keep property status, inspection evidence, and marketplace readiness visible before a sale decision.',
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

export function ServicesSection({
  heading = 'Monthly Inspection, Legal Monitoring, and Document Tracking',
  introduction = 'PlotKare organizes the field, document, and support records owners need to monitor property responsibly.',
}: {
  heading?: string
  introduction?: string
}) {
  return (
    <section id="services" className="premium-section bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="premium-reveal mb-16 text-center"
        >
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            {heading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-lg text-muted-foreground">
            {introduction}
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
                className="premium-surface group rounded-lg border border-border bg-white p-8"
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
