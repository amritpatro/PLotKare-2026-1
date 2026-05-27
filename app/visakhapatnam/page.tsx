import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import { FloatingContactCta } from '@/components/floating-contact-cta'
import { HeroSection } from '@/components/sections/hero'
import { TrustStrip } from '@/components/sections/trust-strip'
import { ProblemSection } from '@/components/sections/problem'
import { ServicesSection } from '@/components/sections/services'
import { PlotVisualizationSection } from '@/components/sections/plot-visualization'
import { HowItWorksSection } from '@/components/sections/how-it-works'
import { LandUtilisationSection } from '@/components/sections/land-utilisation'
import { StatisticsSection } from '@/components/sections/statistics'
import { AvailablePlotsShowcaseSection } from '@/components/sections/available-plots-showcase'
import { PricingSection } from '@/components/sections/pricing'
import { MonitoringInsightsSection } from '@/components/sections/testimonials'
import { AwardsSection } from '@/components/sections/awards'
import { NewsroomSection } from '@/components/sections/newsroom'
import { FaqSection } from '@/components/sections/faq'
import { ContactSection } from '@/components/sections/contact'
import { Footer } from '@/components/footer'
import { JsonLd } from '@/components/json-ld'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { getVerifiedPublicListings } from '@/lib/public-listings-server'
import { VISAKHAPATNAM_FAQS, buildFaqSchema } from '@/lib/marketing-seo'

const CITY_TITLE = `Plot Management Services in Visakhapatnam | ${SITE_NAME}`
const CITY_DESCRIPTION =
  'Monthly plot inspections, encroachment monitoring, and document tracking for NRI and local owners in Visakhapatnam. Book a free consultation.'

export const metadata: Metadata = {
  title: { absolute: CITY_TITLE },
  description: CITY_DESCRIPTION,
  alternates: {
    canonical: canonicalPageUrl('/visakhapatnam/'),
  },
  openGraph: {
    url: canonicalPageUrl('/visakhapatnam/'),
    title: CITY_TITLE,
    description: CITY_DESCRIPTION,
    type: 'website',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: CITY_TITLE,
    description: CITY_DESCRIPTION,
  },
}

const cityNews = [
  {
    href: '/corridors/bheemunipatnam-plot-management/',
    date: 'Service area',
    headline: 'Bheemunipatnam plot management',
    excerpt: 'Review coastal-corridor monitoring considerations and property record requirements.',
  },
  {
    href: '/corridors/madhurawada-land-monitoring/',
    date: 'Service area',
    headline: 'Madhurawada land monitoring',
    excerpt: 'Explore monitoring context for owners and investors in a growing Visakhapatnam corridor.',
  },
  {
    href: '/blog/how-to-protect-your-plot-from-encroachment-india/',
    date: 'Owner guide',
    headline: 'Encroachment prevention for Visakhapatnam plots',
    excerpt: 'Understand boundary evidence, recurring observations, and responsible escalation records.',
  },
]

export default async function VisakhapatnamPage() {
  const verifiedListings = await getVerifiedPublicListings(3)
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': canonicalPageUrl('/visakhapatnam/'),
    name: SITE_NAME,
    description: CITY_DESCRIPTION,
    url: canonicalPageUrl('/visakhapatnam/'),
    email: 'hello@plotkare.in',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2nd Floor, Krishna Towers, Siripuram',
      addressLocality: 'Visakhapatnam',
      addressRegion: 'Andhra Pradesh',
      postalCode: '530003',
      addressCountry: 'IN',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '19:00',
    },
    areaServed: {
      '@type': 'City',
      name: 'Visakhapatnam',
    },
  }
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Plot Management Services in Visakhapatnam',
    provider: {
      '@id': canonicalPageUrl('/visakhapatnam/'),
    },
    areaServed: {
      '@type': 'City',
      name: 'Visakhapatnam',
    },
    description: CITY_DESCRIPTION,
  }
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'PlotKare',
        item: canonicalPageUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Plot Management Services in Visakhapatnam',
        item: canonicalPageUrl('/visakhapatnam/'),
      },
    ],
  }

  return (
    <main>
      <JsonLd data={[localBusinessSchema, serviceSchema, breadcrumbSchema, buildFaqSchema(VISAKHAPATNAM_FAQS)]} />
      <Navigation />
      <HeroSection
        heading="Plot Management and Property Monitoring Services in Visakhapatnam"
        description="PlotKare supports NRI landowners, out-of-station families, investors, and local owners who cannot personally monitor vacant plots in Visakhapatnam. Property records, inspection evidence, document tracking, issue visibility, and verified listings are coordinated in one platform."
        primaryLabel="See Real Plot Layout"
        secondaryLabel="Register Your Plot"
        supportingLink={{ href: '/', label: 'Explore PlotKare plot management services across India' }}
        quickAnswer="PlotKare provides plot management support in Visakhapatnam by organizing property registration, field-record workflows, document status, support requests, and verified listing review. Submit your location and available documents for a free consultation and a confirmed operating scope."
      />
      <TrustStrip />
      <ProblemSection
        heading="Why Vacant Plot Owners in Visakhapatnam Need Active Monitoring"
        introduction="Owners may live far from plots in coastal and growth-corridor areas. Current boundary observations, access notes, document tracking, and a clear escalation trail help them make informed decisions instead of depending on occasional updates."
      />
      <ServicesSection
        heading="What Does a Monthly Plot Inspection Cover in Visakhapatnam?"
        introduction="An agreed field cycle can record visible boundaries, approach access, current property photographs, document submissions, and concerns requiring follow-up."
      />
      <PlotVisualizationSection
        heading="Property Record Visibility:"
        accentHeading="Plot Context for Visakhapatnam Owners"
        description="A layout record brings plot size, orientation, road access, status, and available evidence into a readable property snapshot for owners and permitted reviewers."
      />
      <HowItWorksSection heading="How Visakhapatnam Plot Monitoring Works:" highlightedHeading="Five Steps" />
      <LandUtilisationSection
        heading="Plot Services for Visakhapatnam"
        accentedHeading="Owners"
        description="Protection, future use, and marketplace decisions begin with an accurate property file, required owner approval, and a confirmed service scope."
      />
      <StatisticsSection heading="Plot Management Service Areas in Visakhapatnam" />
      <AvailablePlotsShowcaseSection
        initialListings={verifiedListings}
        heading="Verified Plot Marketplace in Visakhapatnam"
        description="Only approved, active listings appear in this customer-visible marketplace view with PlotKare verification status."
      />
      <PricingSection
        heading="Plot Management Plans for"
        highlightedHeading="Visakhapatnam Owners"
        description="Location, access, available records, and requested monitoring cadence are reviewed before the team provides a written scope and consultation-led price."
      />
      <MonitoringInsightsSection
        heading="Document Tracking and Legal Monitoring for AP Plot Owners"
        introduction="Submitted deeds, EC records, tax receipts, survey or layout references, identity documents, and property photos remain connected to the permitted review workflow."
      />
      <AwardsSection
        heading="Evidence, Scope, and Escalation for Local Owners"
        introduction="PlotKare records operational activity and document review status without publishing claims that cannot be supported from the property file."
      />
      <NewsroomSection heading="Visakhapatnam Service Areas and" accentedHeading="Owner Guides" items={cityNews} />
      <FaqSection
        heading="Frequently Asked Questions: Plot Management in Visakhapatnam"
        introduction="Answers for remote and local owners evaluating plot monitoring and verified listing readiness."
        items={VISAKHAPATNAM_FAQS}
      />
      <ContactSection
        heading="Book a Plot Management Consultation in Visakhapatnam"
        description="Share your plot corridor, access details, and current records so the team can confirm availability and the right next step."
        supportingLink={{ href: '/', label: 'Return to PlotKare property monitoring services across India' }}
      />
      <Footer />
      <FloatingContactCta />
    </main>
  )
}
