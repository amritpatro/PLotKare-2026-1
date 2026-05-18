import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Contact PlotKare support for onboarding, inspections, documents, billing, or account help.',
}

export default function SupportPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-28">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Support</p>
        <h1 className="mt-4 font-serif text-5xl font-semibold text-foreground">How can we help?</h1>
        <div className="mt-8 space-y-6 font-sans text-base leading-8 text-muted-foreground">
          <p>
            For pilot onboarding, inspection reports, document uploads, billing questions, or account access, email
            support@plotkare.in. Include your account email and property reference so the team can respond faster.
          </p>
          <p>
            The backend support endpoint is available at <span className="font-mono text-foreground">/api/support/contact</span>
            for web and mobile forms.
          </p>
          <p>
            WhatsApp support is controlled by <span className="font-mono text-foreground">NEXT_PUBLIC_WHATSAPP_URL</span>
            in the production environment.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
