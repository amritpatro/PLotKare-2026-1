import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { FloatingContactCta } from '@/components/floating-contact-cta'
import { HeroSection } from '@/components/sections/hero'
import { FaqSection } from '@/components/sections/faq'
import { ContactSection } from '@/components/sections/contact'
import { Footer } from '@/components/footer'
import { JsonLd } from '@/components/json-ld'
import { SectionKicker } from '@/components/section-kicker'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { buildFaqSchema, type FaqItem } from '@/lib/marketing-seo'

const PAGE_TITLE = `NRI Plot Management Services in Visakhapatnam | ${SITE_NAME}`
const PAGE_DESCRIPTION =
  'Monthly plot inspections, encroachment monitoring, and document tracking for NRI plot owners in Visakhapatnam. Book a free consultation call.'

const NRI_FAQS: FaqItem[] = [
  {
    question: 'Can I receive inspection reports in English to share with my lawyer abroad?',
    answer:
      'Yes. Inspection records can be prepared in clear English with dated site notes, available geotagged photographs, and the review status of submitted documents. Owners can share appropriate records with family members or advisors through the permitted property workspace.',
  },
  {
    question: 'What happens when encroachment is found during a monthly visit?',
    answer:
      'A visible concern is recorded against the property file with supporting notes and field evidence. PlotKare can route the issue for owner review and support coordination, while legal action and final decisions remain with the owner and qualified advisors.',
  },
  {
    question: 'Do you track EC certificate expiry for AP plots?',
    answer:
      'EC records and renewal dates can be tracked when the relevant documents and dates are provided. The workspace keeps the submitted record, review status, and follow-up visibility together so an owner can plan the next document action before a known deadline.',
  },
  {
    question: 'How quickly can monitoring begin after I register?',
    answer:
      'The team first reviews the plot corridor, access conditions, available records, and requested inspection cadence. A start timeline and written scope are confirmed during consultation based on local coverage and current operating capacity.',
  },
  {
    question: 'Can I list my Visakhapatnam plot for sale through PlotKare?',
    answer:
      'A plot can be submitted for the applicable owner and seller review workflow. It becomes customer-visible only after the required details, documents, location checks, and approval steps are complete; incomplete or rejected submissions are not shown as verified listings.',
  },
  {
    question: 'Is there a minimum contract period for NRI plot management?',
    answer:
      'The service scope and cadence are consultation-led. PlotKare confirms the proposed inspection frequency, document work, response expectations, and any applicable term in writing before a paid service begins.',
  },
]

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: canonicalPageUrl('/nri-plot-management-visakhapatnam/') },
  openGraph: {
    url: canonicalPageUrl('/nri-plot-management-visakhapatnam/'),
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type: 'website',
    siteName: SITE_NAME,
  },
}

export default function NriPlotManagementPage() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'NRI Plot Management Services in Visakhapatnam',
    provider: { '@type': 'Organization', name: SITE_NAME, url: canonicalPageUrl('/') },
    areaServed: { '@type': 'City', name: 'Visakhapatnam' },
    description: PAGE_DESCRIPTION,
  }
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: canonicalPageUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'NRI Plot Management Services in Visakhapatnam', item: canonicalPageUrl('/nri-plot-management-visakhapatnam/') },
    ],
  }

  return (
    <main>
      <JsonLd data={[serviceSchema, breadcrumbSchema, buildFaqSchema(NRI_FAQS)]} />
      <Navigation />
      <HeroSection
        heading="NRI plot management services in Visakhapatnam"
        description="A structured property record for owners living abroad: recurring field evidence, document follow-up, and clear issue visibility for plots you cannot visit regularly."
        primaryLabel="Book a free consultation"
        secondaryLabel="Register your plot"
        supportingLink={{ href: '/visakhapatnam/', label: 'See PlotKare services across Visakhapatnam' }}
        quickAnswer="A structured record for NRI owners: recurring field evidence, document follow-up, and issue visibility for Visakhapatnam plots you cannot visit regularly."
      />

      <section className="premium-section bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <article>
              <SectionKicker label="Why remote owners need a record" />
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">Why do NRI landowners in Visakhapatnam need active plot monitoring?</h2>
              <p className="mt-5 font-sans text-base leading-8 text-muted-foreground">Growth corridors such as Bheemunipatnam, Madhurawada, and Rushikonda can change quickly. Occasional family visits are useful, but they do not create a repeatable record of boundary condition, access, or visible site changes.</p>
              <p className="mt-4 font-sans text-base leading-8 text-muted-foreground">A dated inspection trail gives an owner a clearer starting point for conversations with family, surveyors, counsel, or local support when an issue needs attention.</p>
            </article>
            <article className="rounded-xl border border-border bg-secondary p-7">
              <SectionKicker label="Owner signal" />
              <p className="font-serif text-2xl font-semibold leading-tight text-foreground">Current evidence is easier to act on than a message that says “everything looks fine.”</p>
              <ul className="mt-6 space-y-3 font-sans text-sm leading-7 text-muted-foreground">
                <li>Four-sided boundary and access observations where the agreed scope requires them.</li>
                <li>Readable notes that distinguish a new concern from a known condition.</li>
                <li>Document status connected to the property record instead of scattered across chats.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="premium-section bg-secondary py-20 lg:py-28">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
          <SectionKicker label="Monthly inspection" />
          <h2 className="max-w-3xl font-serif text-3xl font-bold text-foreground md:text-4xl">What does a PlotKare monthly inspection include?</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              ['Geotagged site evidence', 'Boundary, access path, approach road, and visible condition notes are captured against the reviewed location.'],
              ['A dated inspection report', 'The visit becomes a concise record that an owner abroad can review and share with an appropriate advisor.'],
              ['Issue visibility', 'Observable changes can be routed into support or follow-up review with the property context attached.'],
              ['A repeatable cadence', 'The agreed schedule makes it easier to compare one visit with the next instead of relying on memory.'],
            ].map(([title, body]) => (
              <article key={title} className="premium-surface rounded-lg border border-border bg-white p-6">
                <h3 className="font-serif text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 font-sans text-sm leading-7 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="premium-section bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <article>
              <SectionKicker label="Document tracking" />
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">How does document tracking help AP plot owners?</h2>
              <p className="mt-5 font-sans text-base leading-8 text-muted-foreground">EC records, property tax receipts, mutation or patta references, sale deeds, survey documents, and current photographs can be kept associated with the property workflow. The owner sees what has been submitted, what is pending review, and what needs a future follow-up.</p>
              <Link href="/blog/ec-certificate-renewal-and-property-document-checklist/" className="mt-5 inline-flex font-sans text-sm font-semibold text-primary underline-offset-4 hover:underline">Read the EC and document checklist</Link>
            </article>
            <article>
              <SectionKicker label="Service area" />
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">Which areas in Visakhapatnam does PlotKare cover?</h2>
              <p className="mt-5 font-sans text-base leading-8 text-muted-foreground">Coverage is built around local corridors first, including Bheemunipatnam, Kommadi, Madhurawada, and Rushikonda, with exact availability confirmed during consultation.</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 font-sans text-sm font-semibold text-primary">
                <Link href="/corridors/bheemunipatnam-plot-management/" className="underline-offset-4 hover:underline">Bheemunipatnam</Link>
                <Link href="/corridors/madhurawada-land-monitoring/" className="underline-offset-4 hover:underline">Madhurawada</Link>
                <Link href="/visakhapatnam/" className="underline-offset-4 hover:underline">Visakhapatnam services</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="premium-section bg-charcoal py-20 text-white lg:py-28">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
          <SectionKicker label="Consultation-led plans" dark />
          <h2 className="max-w-3xl font-serif text-3xl font-bold md:text-4xl">What plan does an NRI owner need?</h2>
          <p className="mt-5 max-w-3xl font-sans text-base leading-8 text-white/70">Complete Care combines inspection, document continuity, EC and tax reminders, and coordinator visibility. Premium NRI can add higher-touch coordination and priority response options where the confirmed scope supports them. Pricing is shared after a free consultation, with no billing before scope is agreed.</p>
        </div>
      </section>

      <FaqSection heading="Frequently Asked Questions about NRI plot management" introduction="Practical answers for owners managing Visakhapatnam property from abroad." items={NRI_FAQS} />
      <ContactSection heading="Book an NRI plot management consultation" description="Share the plot corridor, access details, and records you already have so the team can confirm availability and the next step." />
      <Footer />
      <FloatingContactCta />
    </main>
  )
}
