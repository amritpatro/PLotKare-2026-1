import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How PlotKare handles customer, property, inspection, and support data.',
}

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-28">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Legal</p>
        <h1 className="mt-4 font-serif text-5xl font-semibold text-foreground">Privacy Policy</h1>
        <div className="mt-8 space-y-6 font-sans text-base leading-8 text-muted-foreground">
          <p>
            PlotKare collects account details, property details, inspection evidence, documents, support messages,
            payment status, and usage analytics only to operate property monitoring and customer support workflows.
          </p>
          <p>
            Private customer documents and inspection files are stored with access controls. Access is limited to the
            signed-in owner and authorized PlotKare personnel required to deliver service.
          </p>
          <p>
            PlotKare uses service providers for hosting, authentication, transactional email, analytics, and reliability
            monitoring. Production data access is reviewed and limited by role.
          </p>
          <p>
            For correction, export, or deletion requests, contact PlotKare support from the email linked to your account.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
