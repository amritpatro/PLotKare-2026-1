import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'PlotKare refund and cancellation policy for pilot subscriptions and service requests.',
}

export default function RefundPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-28">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Legal</p>
        <h1 className="mt-4 font-serif text-5xl font-semibold text-foreground">Refund Policy</h1>
        <div className="mt-8 space-y-6 font-sans text-base leading-8 text-muted-foreground">
          <p>
            PlotKare pilot subscriptions and service fees are reviewed case by case. A refund may be approved when a
            service cannot be started, access is unavailable before field work begins, or a duplicate payment is made.
          </p>
          <p>
            Completed inspections, issued reports, field travel, third-party filings, and custom advisory work may be
            non-refundable once started.
          </p>
          <p>
            Send refund requests to support@plotkare.in with your account email, property reference, payment reference,
            and reason for review. Approved refunds are processed through the original payment method where possible.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
