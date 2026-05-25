'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Clock3, FolderOpen, ShieldCheck, Upload } from 'lucide-react'

const documentCapabilities = [
  {
    icon: Upload,
    title: 'Secure upload',
    body: 'Upload sale deeds, EC, tax receipts, survey notes, and inspection photos into a structured vault.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification trail',
    body: 'Track which records are pending, approved, or under review so the team knows what is ready to publish.',
  },
  {
    icon: FolderOpen,
    title: 'Shared access',
    body: 'Keep owner, seller, and employee access aligned without exposing private files to unrelated users.',
  },
  {
    icon: Clock3,
    title: 'Reminders and history',
    body: 'Surface time-sensitive renewals and keep a permanent trail of document changes and approvals.',
  },
] as const

const documentChecklist = [
  'Title deed or sale deed',
  'EC / registration records',
  'Tax receipts',
  'Survey sketch or layout copy',
  'Boundary and access-path photos',
]

export function DocumentsSection() {
  return (
    <section id="documents" className="premium-section bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="premium-reveal mb-14 max-w-3xl"
        >
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Documents</p>
          <h2 className="mt-3 font-serif text-4xl font-bold text-foreground md:text-5xl">
            Document vault for records, approvals, and evidence
          </h2>
          <p className="mt-4 font-sans text-sm leading-7 text-muted-foreground md:text-base">
            The documents area is now visible from the public site and mirrors the vault concept used inside
            the dashboards: secure, reviewable, and organized around real property work.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-5 md:grid-cols-2">
            {documentCapabilities.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="premium-surface rounded-2xl border border-border bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.05)]"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-[#FFF1F2] p-3 text-[#C0392B]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 font-sans text-sm leading-7 text-muted-foreground">{item.body}</p>
                </motion.article>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="premium-surface-dark rounded-2xl border border-white/10 bg-charcoal p-8 text-white"
          >
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">What gets uploaded</p>
            <h3 className="mt-3 font-serif text-3xl font-semibold text-white">Owner documents and field evidence</h3>
            <p className="mt-4 font-sans text-sm leading-7 text-white/65">
              Ask the owner or PlotKare employee to upload real property photos and every necessary document.
              That is what keeps the listing review process honest and prevents fake listings from slipping through.
            </p>

            <ul className="mt-6 space-y-3">
              {documentChecklist.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#C9A962]" />
                  <span className="font-sans text-sm text-white/75">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?next=/owner/documents"
                className="inline-flex items-center gap-2 rounded-xl bg-[#C0392B] px-5 py-3 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-95"
              >
                Open document vault
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-transparent px-5 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ask support
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}