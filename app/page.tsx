import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import { FloatingContactCta } from '@/components/floating-contact-cta'
import { HeroSection } from '@/components/sections/hero'
import { ProblemSection } from '@/components/sections/problem'
import { ServicesSection } from '@/components/sections/services'
import { HowItWorksSection } from '@/components/sections/how-it-works'
import { PricingSection } from '@/components/sections/pricing'
import { ContactSection } from '@/components/sections/contact'
import { FaqSection } from '@/components/sections/faq'
import { LazyAvailablePlotsShowcaseSection, LazyLandUtilisationSection, LazyPlotVisualizationSection } from '@/components/sections/lazy-home-sections'
import { Footer } from '@/components/footer'
import { JsonLd } from '@/components/json-ld'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { getVerifiedPublicListings } from '@/lib/public-listings-server'
import { HOME_FAQS, buildFaqSchema } from '@/lib/marketing-seo'

export const revalidate = 60

const HOME_TITLE = `Plot Management and Property Monitoring Services | ${SITE_NAME}`
const HOME_DESCRIPTION =
  'Monthly plot inspections, encroachment monitoring, legal document tracking, and verified marketplace for landowners across India. Book a free consultation.'

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: canonicalPageUrl('/'),
  },
  openGraph: {
    url: canonicalPageUrl('/'),
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: 'website',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
}

export default async function HomePage() {
  const verifiedListings = await getVerifiedPublicListings(3)
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Plot Management and Property Monitoring',
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: canonicalPageUrl('/'),
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    description: HOME_DESCRIPTION,
  }

  return (
    <main>
      <JsonLd data={[serviceSchema, buildFaqSchema(HOME_FAQS.slice(0, 4))]} />
      <Navigation />
      <HeroSection
        supportingLink={{
          href: '/visakhapatnam/',
          label: 'Explore plot management in Visakhapatnam',
        }}
      />
      <ServicesSection />
      <ProblemSection />
      <HowItWorksSection />
      <LazyPlotVisualizationSection />
      <LazyLandUtilisationSection />
      <LazyAvailablePlotsShowcaseSection initialListings={verifiedListings} />
      <PricingSection />
      <FaqSection
        heading="Before you begin"
        introduction="Short answers for owners deciding whether PlotKare fits their property workflow."
        items={HOME_FAQS.slice(0, 4)}
      />
      <ContactSection />
      <Footer />
      <FloatingContactCta />
    </main>
  )
}
