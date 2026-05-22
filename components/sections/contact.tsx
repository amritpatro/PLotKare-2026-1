'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import Link from 'next/link'

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || '',
          message: formData.message,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSuccess(true)
        setFormData({ name: '', email: '', phone: '', message: '' })
      } else {
        setError(result.error || 'Failed to send. Try again.')
      }
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contact" className="premium-section bg-secondary py-16 lg:py-24">
      <div className="mx-auto max-w-[720px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="premium-reveal text-center"
        >
          <h2 className="font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl">
            Talk to PlotKare in Visakhapatnam
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-sans text-base text-muted-foreground">
            Prefer quick replies? Use the floating WhatsApp placeholder (replace with your business number when ready) or
            email — this short form is optional so we do not duplicate long intake twice on the page.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="premium-surface mt-10 grid gap-8 rounded-xl border border-border bg-card p-8 md:grid-cols-[1fr_minmax(0,1fr)] md:gap-10 md:p-10"
        >
          <div className="space-y-5 text-left">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-sans text-sm font-medium text-foreground">2nd Floor, Krishna Towers</p>
                <p className="font-sans text-sm text-muted-foreground">Siripuram, Visakhapatnam 530003</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <a href="mailto:hello@plotkare.in" className="font-sans text-sm text-foreground underline-offset-4 hover:underline">
                hello@plotkare.in
              </a>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="font-sans text-sm text-foreground">
                <a href="mailto:hello@plotkare.in?subject=Call%20back%20request" className="underline-offset-4 hover:underline">
                  Request a callback by email
                </a>
                <span className="mt-1 block text-xs text-muted-foreground">
                  We publish a phone line only when it is staffed for inbound calls.
                </span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="font-sans text-sm text-foreground">Mon - Sat, 9:00 AM - 7:00 PM IST</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/listings/"
                className="premium-button inline-flex rounded-sm bg-primary px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Browse listings
              </Link>
              <Link
                href="/demo/plot-3d/"
                className="premium-button-outline inline-flex rounded-sm border border-foreground px-6 py-3 font-sans text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Open 3D demo
              </Link>
            </div>
          </div>

          <div>
            {success ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground">Thanks — we received your note</h3>
                <p className="mt-2 font-sans text-sm text-muted-foreground">
                  Our team will review it and get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-sans text-sm text-primary">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block font-sans text-sm font-medium text-foreground">
                    Name
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    name="name"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 font-sans text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block font-sans text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 font-sans text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="mb-1.5 block font-sans text-sm font-medium text-foreground">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="contact-phone"
                    name="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 font-sans text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Optional phone number"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block font-sans text-sm font-medium text-foreground">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 font-sans text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Plot location, concerns, or expansion interest…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="premium-button w-full rounded-sm bg-primary py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
