import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'PlotKare pilot service terms for property monitoring, reports, support, and marketplace previews.',
}

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-28">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Legal</p>
        <h1 className="mt-4 font-serif text-5xl font-semibold text-foreground">Terms of Service</h1>
        <div className="mt-8 space-y-6 font-sans text-base leading-8 text-muted-foreground">
          <p>
            PlotKare provides inspection coordination, document organization, advisor-led reviews, and pilot marketplace
            workflows for property owners. Reports are operational evidence, not a substitute for legal title opinions,
            survey certification, or government records.
          </p>
          <p>
            Customers are responsible for providing accurate ownership, location, access, and document information.
            PlotKare may pause service where access is unsafe, disputed, or legally restricted.
          </p>
          <p>
            Pricing is consultation-led during the pilot. Subscription payments, if enabled, run through Razorpay test
            or live mode according to the customer agreement in force at that time.
          </p>
          <p>
            Unauthorized access, scraping, misuse of reports, or attempts to bypass account permissions are prohibited.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
