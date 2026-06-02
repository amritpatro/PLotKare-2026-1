import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Navigation } from '@/components/navigation'
import { publicBusinessConfig } from '@/lib/business-config'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Contact PlotKare support for inspections, documents, listings, or account help.',
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
            For inspection scheduling, listing enquiries, document questions, or account access, include your account
            email and property reference so the team can respond faster.
          </p>
          {publicBusinessConfig.supportEmail ? (
            <p>
              Email{' '}
              <a className="text-foreground underline-offset-4 hover:underline" href={`mailto:${publicBusinessConfig.supportEmail}`}>
                {publicBusinessConfig.supportEmail}
              </a>
              .
            </p>
          ) : null}
          {publicBusinessConfig.whatsappUrl ? (
            <p>
              For WhatsApp support,{' '}
              <a className="text-foreground underline-offset-4 hover:underline" href={publicBusinessConfig.whatsappUrl}>
                start a chat with the PlotKare team
              </a>
              .
            </p>
          ) : null}
          {publicBusinessConfig.supportHours ? <p>Support hours: {publicBusinessConfig.supportHours}.</p> : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
